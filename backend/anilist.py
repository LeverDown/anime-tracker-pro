import requests
from datetime import datetime, timedelta

from utils.cache_manager import cache

COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}

# Replaced simple in-memory cache with Hybrid CacheManager

JIKAN_GENRE_MAP = {
    "Action": "1", "Adventure": "2", "Cars": "3", "Comedy": "4", "Dementia": "5",
    "Demons": "6", "Mystery": "7", "Drama": "8", "Ecchi": "9", "Fantasy": "10",
    "Game": "11", "Hentai": "12", "Historical": "13", "Horror": "14", "Kids": "15",
    "Magic": "16", "Martial Arts": "17", "Mecha": "18", "Music": "19", "Parody": "20",
    "Samurai": "21", "Romance": "22", "School": "23", "Sci-Fi": "24", "Shoujo": "25",
    "Shoujo Ai": "26", "Shounen": "27", "Shounen Ai": "28", "Space": "29", "Sports": "30",
    "Super Power": "31", "Vampire": "32", "Yaoi": "33", "Yuri": "34", "Harem": "35",
    "Slice of Life": "36", "Supernatural": "37", "Military": "38", "Police": "39",
    "Psychological": "40", "Thriller": "41", "Seinen": "42", "Josei": "43"
}

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

    if genres and len(genres) > 0 and genres[0]:
        variables["genre"] = genres[0]

    # Check cache
    cache_key = f"anilist:{mode}:{query}:{genres}:{page}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data[0], cached_data[1] # Returns normalized, page_info

    try:
        response = requests.post(url, json={'query': graph_query, 'variables': variables}, headers=COMMON_HEADERS, timeout=15)
        if response.status_code == 403 and "disabled" in response.text:
             raise Exception("AniList API Disabled")
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
        print(f"[AniList fetch_anilist ERROR]: {e}. Attempting Jikan fallback...")
        try:
            # Fallback to Jikan (MAL) search
            jikan_url = f"https://api.jikan.moe/v4/anime"
            params = {"page": page, "limit": perPage}
            if mode == "search" and query:
                params["q"] = query
                params["order_by"] = "popularity"
            elif mode == "top":
                jikan_url = f"https://api.jikan.moe/v4/top/anime"
                params["filter"] = "bypopularity"
            
            if genres and len(genres) > 0:
                j_genres = [JIKAN_GENRE_MAP.get(g) for g in genres if JIKAN_GENRE_MAP.get(g)]
                if j_genres:
                    params["genres"] = ",".join(j_genres)

            res = requests.get(jikan_url, params=params, timeout=10)
            res.raise_for_status()
            j_data = res.json()
            j_list = j_data.get('data', [])
            
            normalized = []
            for item in j_list:
                title = item.get('title_english') or item.get('title')
                normalized.append({
                    'mal_id': item['mal_id'],
                    'idMal': item['mal_id'],
                    'idAniList': None,
                    'title': title,
                    'images': {'jpg': {'image_url': item['images']['jpg']['large_image_url'], 'large_image_url': item['images']['jpg']['large_image_url']}},
                    'score': item.get('score') or 0,
                    'episodes': item.get('episodes'),
                    'genres': item.get('genres', []),
                    'synopsis': item.get('synopsis', 'No synopsis available.'),
                    'trailer': {'url': item.get('trailer', {}).get('url')},
                    'source_provider': 'jikan'
                })
            # De-duplicate by mal_id to prevent React key collisions
            seen_ids = set()
            unique_normalized = []
            for item in normalized:
                if item['mal_id'] not in seen_ids:
                    unique_normalized.append(item)
                    seen_ids.add(item['mal_id'])
            
            result = unique_normalized, {
                "total": j_data.get('pagination', {}).get('items', {}).get('total', 0),
                "lastPage": j_data.get('pagination', {}).get('last_visible_page', 0),
                "hasNextPage": j_data.get('pagination', {}).get('has_next_page', False)
            }
            # Cache fallback for a short time (5 mins) to allow quick recovery
            cache.set(cache_key, result, ttl=300)
            return result
        except Exception as je:
            print(f"[Jikan fallback ERROR]: {je}")
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
        response = requests.post(url, json={'query': query, 'variables': {'start': start_ts, 'end': end_ts}}, headers=COMMON_HEADERS, timeout=15)
        if response.status_code == 403 and "disabled" in response.text:
             raise Exception("AniList API Disabled")
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
        print(f"[AniList schedule ERROR]: {e}. Attempting Jikan fallback...")
        try:
            # Jikan schedule fallback
            # Jikan uses lowercase day names as filters
            j_url = f"https://api.jikan.moe/v4/schedules"
            res = requests.get(j_url, params={"filter": day_name.lower()}, timeout=10)
            res.raise_for_status()
            j_list = res.json().get('data', [])
            
            normalized = []
            for item in j_list:
                # Filter for popularity to match AniList filter
                if (item.get('members') or 0) > 1000:
                    normalized.append({
                        'mal_id': item['mal_id'],
                        'idMal': item['mal_id'],
                        'idAniList': None,
                        'title': item.get('title_english') or item.get('title'),
                        'images': {'jpg': {'image_url': item['images']['jpg']['large_image_url'], 'large_image_url': item['images']['jpg']['large_image_url']}},
                        'broadcast': {'string': item.get('broadcast', {}).get('string') or 'Time TBD'},
                        'episodes': item.get('episodes'),
                        'type': item.get('type', 'TV'),
                        'members': item.get('members', 0),
                        'source_provider': 'jikan'
                    })
            
            # De-duplicate by mal_id to prevent React key collisions
            seen_ids = set()
            unique_normalized = []
            for item in normalized:
                if item['mal_id'] not in seen_ids:
                    unique_normalized.append(item)
                    seen_ids.add(item['mal_id'])
            
            return sorted(unique_normalized, key=lambda x: x['members'], reverse=True)
        except Exception as je:
            print(f"[Jikan schedule fallback ERROR]: {je}")
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
        response = requests.post(url, json={'query': query, 'variables': {'id': int(media_id)}}, headers=COMMON_HEADERS, timeout=15)
        if response.status_code == 403 and "disabled" in response.text:
             raise Exception("AniList API Disabled")
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
            'members': item['popularity'],
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
        res = requests.post(url, json={'query': query, 'variables': {'id': id_mal}}, headers=COMMON_HEADERS, timeout=10)
        if res.status_code == 403 and "disabled" in res.text:
             raise Exception("AniList API Disabled")
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
        r = requests.post(url, json={'query': q, 'variables': {'season': season.upper(), 'year': year, 'page': page}}, headers=COMMON_HEADERS, timeout=15)
        if r.status_code == 403 and "disabled" in r.text:
             raise Exception("AniList API Disabled")
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
                'popularity': item.get('popularity', 0),
                'members': item.get('popularity', 0)
            })
        result = normalized, page_info
        cache.set(cache_key, result, ttl=21600) # 6 hours
        return result
    except Exception as e:
        print(f"[AniList seasonal ERROR]: {e}. Attempting Jikan fallback...")
        try:
            # Jikan seasonal fallback
            j_url = f"https://api.jikan.moe/v4/seasons/{year}/{season.lower()}"
            r = requests.get(j_url, params={"page": page}, timeout=10)
            r.raise_for_status()
            j_data = r.json()
            media_list = j_data.get('data', [])
            
            normalized = []
            for item in media_list:
                normalized.append({
                    'id': item['mal_id'],
                    'idMal': item['mal_id'],
                    'title': {'english': item.get('title_english'), 'romaji': item.get('title')},
                    'coverImage': {
                        'large': item['images']['jpg']['large_image_url']
                    },
                    'averageScore': item.get('score'),
                    'episodes': item.get('episodes'),
                    'nextAiringEpisode': None, # Jikan has air date but not next airing easily in seasonal
                    'genres': [g['name'] for g in item.get('genres', [])],
                    'status': item.get('status', '').upper().replace(' ', '_'),
                    'format': item.get('type', '').upper(),
                    'popularity': item.get('popularity', 0),
                    'members': item.get('members', 0),
                    'source_provider': 'jikan'
                })
            
            # De-duplicate by id to prevent React key collisions
            seen_ids = set()
            unique_normalized = []
            for item in normalized:
                if item['id'] not in seen_ids:
                    unique_normalized.append(item)
                    seen_ids.add(item['id'])

            result = unique_normalized, {"hasNextPage": j_data.get('pagination', {}).get('has_next_page', False), "lastPage": j_data.get('pagination', {}).get('last_visible_page', 1)}
            cache.set(cache_key, result, ttl=300) # Short cache for fallback
            return result
        except Exception as je:
            print(f"[Jikan seasonal fallback ERROR]: {je}")
            return [], {}

def fetch_anilist_top(page: int = 1, perPage: int = 50, genre: str = None, year: int = None):
    # Normalize empty genre string to None to avoid AniList filtering by literally ""
    if genre == "": genre = None
    
    cache_key = f"anilist:top:{page}:{perPage}:{genre}:{year}"
    cached = cache.get(cache_key)
    if cached: return cached[0], cached[1]

    url = 'https://graphql.anilist.co'
    q = '''
    query ($page: Int, $perPage: Int, $genre: String, $year: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo { hasNextPage lastPage total }
        media (type: ANIME, sort: [SCORE_DESC, POPULARITY_DESC], isAdult: false, genre: $genre, seasonYear: $year) {
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
        r = requests.post(url, json={'query': q, 'variables': {'page': page, 'perPage': perPage, 'genre': genre, 'year': year}}, headers=COMMON_HEADERS, timeout=15)
        if r.status_code == 403 and "disabled" in r.text:
             raise Exception("AniList API Disabled")
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
                'members': item['popularity'],
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
        print(f"[AniList top ERROR]: {e}. Attempting Jikan fallback...")
        try:
            j_url = f"https://api.jikan.moe/v4/top/anime"
            r = requests.get(j_url, params={"page": page, "limit": perPage}, timeout=10)
            r.raise_for_status()
            j_data = r.json()
            media_list = j_data.get('data', [])
            
            normalized = []
            for item in media_list:
                normalized.append({
                    'mal_id': item['mal_id'],
                    'idMal': item['mal_id'],
                    'idAniList': None,
                    'title': item.get('title_english') or item.get('title'),
                    'images': {'jpg': {'image_url': item['images']['jpg']['large_image_url'], 'large_image_url': item['images']['jpg']['large_image_url']}},
                    'score': item.get('score') or 0,
                    'popularity': item.get('popularity', 0),
                    'episodes': item.get('episodes'),
                    'genres': item.get('genres', []),
                    'format': item.get('type'),
                    'season': item.get('season'),
                    'year': item.get('year'),
                    'status': item.get('status'),
                    'synopsis': item.get('synopsis', ''),
                    'source_provider': 'jikan'
                })
            
            # De-duplicate by mal_id to prevent React key collisions
            seen_ids = set()
            unique_normalized = []
            for item in normalized:
                if item['mal_id'] not in seen_ids:
                    unique_normalized.append(item)
                    seen_ids.add(item['mal_id'])

            result = unique_normalized, {"hasNextPage": j_data.get('pagination', {}).get('has_next_page', False), "lastPage": j_data.get('pagination', {}).get('last_visible_page', 1)}
            cache.set(cache_key, result, ttl=300) # Short cache for fallback
            return result
        except Exception as je:
            print(f"[Jikan top fallback ERROR]: {je}")
            return [], {}
