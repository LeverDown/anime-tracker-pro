import requests
from datetime import datetime, timedelta

from utils.cache_manager import cache

# Replaced simple in-memory cache with Hybrid CacheManager

def fetch_anilist(query=None, mode="search", genres=None, page=1, perPage=24):
    url = 'https://graphql.anilist.co'
    graph_query = '''
    query ($search: String, $sort: [MediaSort], $genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total lastPage hasNextPage }
        media(search: $search, sort: $sort, genre: $genre, type: ANIME, isAdult: false) {
          id
          idMal
          title { english romaji }
          coverImage { extraLarge }
          averageScore episodes genres description
          tags { name rank }
          studios(isMain: true) { nodes { name } }
          relations {
            edges {
              relationType
              node { id idMal }
            }
          }
          trailer { site id }
          characters(sort: ROLE, perPage: 6) {
            edges {
              node { name { full } image { large } }
              voiceActors(language: JAPANESE) { name { full } image { large } }
            }
          }
        }
      }
    }
    '''
    variables = {"page": page, "perPage": perPage}
    
    if mode == "search" and query:
        variables["search"] = query
        variables["sort"] = ["POPULARITY_DESC"]
    elif mode == "top":
        variables["sort"] = ["TRENDING_DESC"]
    elif mode == "random":
        variables["sort"] = ["TRENDING_DESC"]
    elif mode == "rec" and query:
        variables["search"] = query
        variables["sort"] = ["POPULARITY_DESC"]
    else:
        variables["sort"] = ["TRENDING_DESC"]

    if genres and len(genres) > 0:
        variables["genre"] = genres[0]

    # Check cache
    cache_key = f"anilist:{mode}:{query}:{genres}:{page}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data[0], cached_data[1] # Returns normalized, page_info

    try:
        response = requests.post(url, json={'query': graph_query, 'variables': variables}, timeout=15)
        response.raise_for_status()
        json_data = response.json()
        media_list = json_data.get('data', {}).get('Page', {}).get('media', [])
        page_info = json_data.get('data', {}).get('Page', {}).get('pageInfo', {})

        normalized = []
        for item in media_list:
            title = item['title']['english'] if item['title']['english'] else item['title']['romaji']
            desc = item['description']
            if desc:
                desc = desc.replace('<br>', '').replace('<i>', '').replace('</i>', '')
            else:
                desc = "No synopsis available."

            trailer_url = None
            if item['trailer'] and item['trailer']['site'] == 'youtube':
                trailer_url = f"https://www.youtube.com/watch?v={item['trailer']['id']}"

            entry = {
                'mal_id': item.get('idMal') or item['id'], 
                'idMal': item.get('idMal'),
                'idAniList': item['id'],
                'title': title,
                'images': {'jpg': {'image_url': item['coverImage']['extraLarge'], 'large_image_url': item['coverImage']['extraLarge']}},
                'score': (item['averageScore'] / 10) if item['averageScore'] else 0,
                'episodes': item['episodes'],
                'genres': [{'name': g} for g in item['genres']],
                'synopsis': desc,
                'trailer': {'url': trailer_url},
                'characters': item.get('characters', {}).get('edges', []),
                'tags': [t['name'] for t in item.get('tags', []) if (t.get('rank') or 0) > 60],
                'studios': [s['name'] for s in item.get('studios', {}).get('nodes', [])],
                'relations': item.get('relations', {}).get('edges', [])
            }
            normalized.append(entry)
        result = normalized, page_info
        cache.set(cache_key, result, ttl=3600)
        return result
    except Exception as e:
        print(f"[AniList fetch_anilist ERROR]: {e}")
        return [], {}

def fetch_anilist_schedule(day_name):
    url = 'https://graphql.anilist.co'
    day_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    today = datetime.utcnow()
    target_day_idx = day_map[day_name.lower()]
    current_day_idx = today.weekday()
    delta = target_day_idx - current_day_idx
    # If delta is negative, the day is earlier in the current week, so we target next week
    if delta < 0:
        delta += 7
        
    target_date = today + timedelta(days=delta)
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=0)
    start_ts = int(start_of_day.timestamp())
    end_ts = int(end_of_day.timestamp())

    query = '''
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          airingAt
          episode
          media {
            id
            idMal
            title { english romaji }
            coverImage { extraLarge }
            episodes
            averageScore
            popularity
          }
        }
      }
    }
    '''
    try:
        response = requests.post(url, json={'query': query, 'variables': {'start': start_ts, 'end': end_ts}}, timeout=15)
        response.raise_for_status()
        data = response.json()['data']['Page']['airingSchedules']
        filtered_data = [x for x in data if x['media']['popularity'] > 1000]
        normalized = []
        for item in filtered_data:
            media = item['media']
            title = media['title']['english'] or media['title']['romaji']
            air_time = datetime.fromtimestamp(item['airingAt']).strftime('%H:%M')
            normalized.append({
                'mal_id': media.get('idMal') or media['id'],
                'idMal': media.get('idMal'),
                'idAniList': media['id'],
                'title': title,
                'images': {'jpg': {'image_url': media['coverImage']['extraLarge'], 'large_image_url': media['coverImage']['extraLarge']}},
                'broadcast': {'string': f"Airs at {air_time}"},
                'episodes': media['episodes'],
                'type': 'TV',
                'members': media['popularity']
            })
        return sorted(normalized, key=lambda x: x['members'], reverse=True)
    except Exception as e:
        print(f"[AniList schedule ERROR]: {e}")
        return []

def fetch_anilist_media(media_id, is_mal=True):
    url = 'https://graphql.anilist.co'
    id_field = "idMal" if is_mal else "id"
    query = f"""
    query ($id: Int) {{
      Media ({id_field}: $id, type: ANIME) {{
        id
        idMal
        title {{
          english
          romaji
          native
        }}
        description
        coverImage {{
          extraLarge
        }}
        bannerImage
        format
        status
        episodes
        season
        seasonYear
        averageScore
        popularity
        rankings {{
          rank
          type
          allTime
        }}
        studios(isMain: true) {{
          nodes {{
            name
          }}
        }}
        genres
        source
        duration
        trailer {{
          id
          site
        }}
        nextAiringEpisode {{
          airingAt
          timeUntilAiring
          episode
        }}
        externalLinks {{
          site
          url
          type
          icon
          color
        }}
        characters(sort: [ROLE, RELEVANCE], perPage: 12) {{
          edges {{
            role
            node {{
              id
              name {{
                full
              }}
              image {{
                large
              }}
            }}
            voiceActors(language: JAPANESE) {{
              id
              name {{
                full
              }}
              image {{
                large
              }}
            }}
          }}
        }}
        relations {{
          edges {{
            relationType
            node {{
              id
              idMal
              title {{
                english
                romaji
              }}
              type
            }}
          }}
        }}
      }}
    }}
    """
    try:
        response = requests.post(url, json={'query': query, 'variables': {'id': int(media_id)}}, timeout=15)
        response.raise_for_status()
        item = response.json().get('data', {}).get('Media')
        if not item: return None

        title = item['title']['english'] or item['title']['romaji']
        desc = item['description']
        if desc:
            desc = desc.replace('<br>', '').replace('<i>', '').replace('</i>', '')
        
        # Extract rank
        rank = next((r['rank'] for r in item.get('rankings', []) if r['type'] == 'RATED' and r['allTime']), None)

        return {
            'mal_id': item.get('idMal') or item['id'],
            'idMal': item.get('idMal'),
            'idAniList': item['id'],
            'title': title,
            'title_english': item['title']['english'],
            'title_japanese': item['title']['native'],
            'synopsis': desc,
            'images': {'jpg': {'image_url': item['coverImage']['extraLarge'], 'large_image_url': item['coverImage']['extraLarge']}},
            'banner_image': item.get('bannerImage'),
            'type': item['format'],
            'status': item['status'],
            'episodes': item['episodes'],
            'season': item['season'],
            'year': item['seasonYear'],
            'score': item['averageScore'],
            'popularity': item['popularity'],
            'rank': rank,
            'studios': [{'name': n['name']} for n in item['studios']['nodes']],
            'genres': [{'name': g} for g in item['genres']],
            'source': item['source'],
            'duration': f"{item['duration']} min" if item['duration'] else None,
            'next_airing': item.get('nextAiringEpisode'),
            'external_links': item.get('externalLinks', []),
            'characters': [
                {
                    'role': e['role'],
                    'character': {
                        'mal_id': e['node']['id'],
                        'name': e['node']['name']['full'],
                        'images': {'jpg': {'image_url': e['node']['image']['large']}}
                    },
                    'voice_actors': [
                        {
                            'person': {
                                'name': va['name']['full'],
                                'images': {'jpg': {'image_url': va['image']['large']}}
                            },
                            'language': 'Japanese'
                        } for va in e.get('voiceActors', [])
                    ]
                } for e in item['characters']['edges']
            ],
            'relations': [
                {
                    'relation': e['relationType'],
                    'entry': [{
                        'mal_id': e['node']['idMal'] or e['node']['id'],
                        'idMal': e['node']['idMal'],
                        'title': e['node']['title']['english'] or e['node']['title']['romaji'],
                        'type': e['node']['type'].lower()
                    }]
                } for e in item['relations']['edges']
            ]
        }
    except Exception as e:
        print(f"[AniList media detail ERROR]: {e}")
        return None
def fetch_anilist_relations(id_mal):
    cache_key = f"anilist:relations:{id_mal}"
    cached = cache.get(cache_key)
    if cached: return cached

    url = 'https://graphql.anilist.co'
    query = """
    query ($id: Int) {
      Media (idMal: $id, type: ANIME) {
        relations {
          edges {
            relationType
            node {
              id
              idMal
              title {
                english
                romaji
              }
              type
            }
          }
        }
      }
    }
    """
    try:
        res = requests.post(url, json={'query': query, 'variables': {'id': id_mal}}, timeout=10)
        data = res.json()
        edges = data.get('data', {}).get('Media', {}).get('relations', {}).get('edges', [])
        
        formatted = []
        for edge in edges:
            node = edge['node']
            formatted.append({
                "relation": edge['relationType'],
                "idMal": node['idMal'],
                "type": node['type'].lower(),
                "title_english": node['title']['english'] or node['title']['romaji'],
                "title_romaji": node['title']['romaji']
            })
        cache.set(cache_key, formatted, ttl=43200) # 12 hours
        return formatted
    except Exception as e:
        print(f"AniList Relations Error: {e}")
        return []

def fetch_anilist_seasonal(year: int, season: str, page: int = 1):
    cache_key = f"anilist:seasonal:{year}:{season}:{page}"
    cached = cache.get(cache_key)
    if cached: return cached[0], cached[1]

    """Fetch anime for a given season. season = WINTER | SPRING | SUMMER | FALL"""
    url = 'https://graphql.anilist.co'
    q = '''
    query ($year: Int, $season: MediaSeason, $page: Int) {
      Page (page: $page, perPage: 50) {
        pageInfo { hasNextPage lastPage }
        media (season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
          id
          idMal
          title { english romaji }
          coverImage { extraLarge large }
          averageScore
          episodes
          genres
          description
          status
          format
          popularity
          nextAiringEpisode {
            airingAt
            episode
          }
        }
      }
    }
    '''
    try:
        r = requests.post(url, json={'query': q, 'variables': {'season': season.upper(), 'year': year, 'page': page}}, timeout=15)
        r.raise_for_status()
        data = r.json()
        media_list = data.get('data', {}).get('Page', {}).get('media', [])
        page_info = data.get('data', {}).get('Page', {}).get('pageInfo', {})
        normalized = []
        for item in media_list:
            normalized.append({
                'id': item['id'],
                'idMal': item.get('idMal'),
                'title': item['title'],
                'coverImage': {
                    'large': item['coverImage']['extraLarge'] or item['coverImage']['large']
                },
                'averageScore': item['averageScore'],
                'episodes': item['episodes'],
                'nextAiringEpisode': item.get('nextAiringEpisode'),
                'genres': item['genres'],
                'status': item.get('status', ''),
                'format': item.get('format', ''),
                'popularity': item.get('popularity', 0)
            })
        result = normalized, page_info
        cache.set(cache_key, result, ttl=21600) # 6 hours
        return result
    except Exception as e:
        print(f"[AniList seasonal ERROR]: {e}")
        return [], {}

def fetch_anilist_top(page: int = 1, perPage: int = 50):
    cache_key = f"anilist:top:{page}:{perPage}"
    cached = cache.get(cache_key)
    if cached: return cached[0], cached[1]

    url = 'https://graphql.anilist.co'
    q = '''
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo { hasNextPage lastPage total }
        media (type: ANIME, sort: SCORE_DESC, isAdult: false) {
          id
          idMal
          title { english romaji }
          coverImage { extraLarge }
          averageScore
          popularity
          episodes
          genres
          format
          season
          seasonYear
          status
          description
        }
      }
    }
    '''
    try:
        r = requests.post(url, json={'query': q, 'variables': {'page': page, 'perPage': perPage}}, timeout=15)
        r.raise_for_status()
        data = r.json()
        media_list = data.get('data', {}).get('Page', {}).get('media', [])
        page_info = data.get('data', {}).get('Page', {}).get('pageInfo', {})
        normalized = []
        for item in media_list:
            title = item['title']['english'] or item['title']['romaji']
            normalized.append({
                'mal_id': item.get('idMal') or item['id'],
                'idMal': item.get('idMal'),
                'idAniList': item['id'],
                'title': title,
                'images': {'jpg': {'image_url': item['coverImage']['extraLarge'], 'large_image_url': item['coverImage']['extraLarge']}},
                'score': (item['averageScore'] / 10) if item['averageScore'] else 0,
                'popularity': item['popularity'],
                'episodes': item['episodes'],
                'genres': [{'name': g} for g in item['genres']],
                'format': item['format'],
                'season': item['season'],
                'year': item['seasonYear'],
                'status': item['status'],
                'synopsis': item.get('description', '').replace('<br>', '').replace('<i>', '').replace('</i>', '')
            })
        result = normalized, page_info
        cache.set(cache_key, result, ttl=43200) # 12 hours
        return result
    except Exception as e:
        print(f"[AniList top ERROR]: {e}")
        return [], {}
