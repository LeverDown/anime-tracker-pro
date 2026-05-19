import os
import requests
import logging
from datetime import datetime, timedelta

from utils.cache_manager import cache
from utils.schedule_utils import (
    get_utc_window, normalize_to_uif, AniListFetchError, JikanFetchError, ScheduleFetchError
)
from utils.fallback_logger import log_fallback_event
from utils.rate_limiter import anilist_limiter

logger = logging.getLogger(__name__)


def _make_id(anilist_id, mal_id):
    """Phase 3: Return a namespaced ID string to avoid React key collisions."""
    if anilist_id:
        return f"anilist_{anilist_id}"
    if mal_id:
        return f"mal_{mal_id}"
    return None

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

def fetch_anilist(query=None, mode="search", genres=None, page=1, perPage=50):
    url = 'https://graphql.anilist.co'
    graph_query = '''
    query ($search: String, $sort: [MediaSort], $genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total lastPage hasNextPage }
        media(search: $search, sort: $sort, genre: $genre, type: ANIME) {
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
        variables["sort"] = ["SEARCH_MATCH"]
    elif mode == "score" or mode == "top_rated":
        # Recency Tie-Breaker: Quality first, then Start Date (Newest first)
        variables["sort"] = ["SCORE_DESC", "START_DATE_DESC"]
    elif mode == "top" or mode == "trending":
        # Hybrid sort: Trending first, but secondary score sort
        variables["sort"] = ["TRENDING_DESC", "SCORE_DESC"]
    elif mode == "random":
        variables["sort"] = ["TRENDING_DESC"]
    else:
        variables["sort"] = ["TRENDING_DESC", "SCORE_DESC"]

    if genres and len(genres) > 0 and genres[0]:
        variables["genre"] = genres[0]

    # Check cache
    cache_key = f"anilist:{mode}:{query}:{genres}:{page}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data[0], cached_data[1] # Returns normalized, page_info

    try:
        anilist_limiter.acquire()
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
                # Phase 3: namespaced key prevents React key collisions across ID spaces
                'aid': _make_id(item['id'], item.get('idMal')),
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
        # Phase 1: log fallback event with the actual exception type as reason
        _reason = str(getattr(getattr(e, 'response', None), 'status_code', None) or type(e).__name__)
        log_fallback_event("fetch_anilist", _reason)
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
                mid = item['mal_id']
                normalized.append({
                    'mal_id': mid,
                    'idMal': mid,
                    'idAniList': None,
                    # Phase 3: namespaced key so frontend list keys never collide
                    'aid': _make_id(None, mid),
                    'title': title,
                    'images': {
                        'jpg': {
                            'image_url': item.get('images', {}).get('jpg', {}).get('large_image_url'),
                            'large_image_url': item.get('images', {}).get('jpg', {}).get('large_image_url')
                        }
                    },
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
            # Phase 4: 10min TTL for search fallback — search results should refresh frequently
            cache.set(cache_key, result, ttl=600)
            return result
        except Exception as je:
            print(f"[Jikan fallback ERROR]: {je}")
            return [], {}

def fetch_from_anilist(start_unix: int, end_unix: int) -> list[dict]:
    url = 'https://graphql.anilist.co'
    query = '''
    query ($start: Int, $end: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo { hasNextPage currentPage }
        airingSchedules(
          airingAt_greater: $start
          airingAt_lesser: $end
          sort: TIME
        ) {
          airingAt
          episode
          media {
            id idMal
            title { romaji english }
            coverImage { extraLarge }
            status format episodes averageScore genres
          }
        }
      }
    }
    '''
    
    all_schedules = []
    page = 1
    timeout_sec = int(os.getenv("ANILIST_REQUEST_TIMEOUT_MS", 8000)) / 1000.0

    while page <= 10:
        variables = {'start': start_unix, 'end': end_unix, 'page': page}
        try:
            anilist_limiter.acquire()
            response = requests.post(url, json={'query': query, 'variables': variables}, headers=COMMON_HEADERS, timeout=timeout_sec)
            if response.status_code != 200:
                raise AniListFetchError(f"AniList HTTP Error", status_code=response.status_code)
            
            data = response.json()
            if "errors" in data:
                raise AniListFetchError(f"GraphQL Error: {data['errors']}", status_code=response.status_code)
            
            page_data = data.get('data', {}).get('Page', {})
            schedules = page_data.get('airingSchedules', [])
            all_schedules.extend(schedules)
            
            page_info = page_data.get('pageInfo', {})
            if not page_info.get('hasNextPage'):
                break
            page += 1
        except Exception as e:
            raise AniListFetchError(f"AniList request failed: {e}")
            
    return all_schedules

def fetch_from_jikan(day_name: str) -> list[dict]:
    valid_days = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
    if day_name.lower() not in valid_days:
        raise ValueError(f"Invalid day_name: {day_name}")
        
    url = f"https://api.jikan.moe/v4/schedules"
    all_schedules = []
    page = 1
    timeout_sec = int(os.getenv("JIKAN_REQUEST_TIMEOUT_MS", 10000)) / 1000.0

    while page <= 5:
        params = {"filter": day_name.lower(), "page": page}
        try:
            response = requests.get(url, params=params, timeout=timeout_sec)
            if response.status_code != 200:
                raise JikanFetchError(f"Jikan HTTP Error", status_code=response.status_code)
            
            data = response.json()
            schedules = data.get('data', [])
            if not schedules:
                break
                
            all_schedules.extend(schedules)
            
            pagination = data.get('pagination', {})
            if not pagination.get('has_next_page'):
                break
            page += 1
        except Exception as e:
            raise JikanFetchError(f"Jikan request failed: {e}")
            
    return all_schedules

def fetch_airing_schedule(day_name: str, user_timezone: str) -> list[dict]:
    start, end = get_utc_window(day_name, user_timezone)
    cache_key = f"schedule:{day_name}:{user_timezone}"
    
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        raw = fetch_from_anilist(start, end)
        normalized = normalize_to_uif("anilist", raw)
        cache.set(cache_key, normalized, ttl=3600)  # 1h: AniList volatile data
        return normalized
    except AniListFetchError as e:
        # Phase 1: log the fallback before switching to Jikan
        log_fallback_event("fetch_airing_schedule", str(getattr(e, 'status_code', None) or type(e).__name__))
        logger.error(f"AniList failed, trying Jikan fallback: {e}")

    try:
        raw = fetch_from_jikan(day_name)
        normalized = normalize_to_uif("jikan", raw)
        # Phase 4: 15min for airing schedule fallback — more time-sensitive
        cache.set(cache_key, normalized, ttl=900)
        return normalized
    except JikanFetchError as e:
        logger.error(f"Jikan failed: {e}")
        raise ScheduleFetchError("Unable to retrieve schedule data. Please try again.")

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
        anilist_limiter.acquire()
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
            'title_romaji': item['title']['romaji'],
            'title_native': item['title']['native'],
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
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            # Expected if AniList does not have this ID mapped
            pass
        else:
            print(f"[AniList media detail HTTP ERROR]: {e.response.status_code}")
        return None
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
        anilist_limiter.acquire()
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

def fetch_seasonal_intel(year: int, season: str, page: int = 1) -> dict:
    cache_key = f"seasonal_intel:{year}:{season}:{page}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = 'https://graphql.anilist.co'
    q = '''
    query ($year: Int, $season: MediaSeason, $page: Int) {
      Page (page: $page, perPage: 50) {
        pageInfo { hasNextPage }
        media (season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
          id
          idMal
          title { english romaji }
          coverImage { extraLarge }
          averageScore
          episodes
          genres
          description
          status
          format
        }
      }
    }
    '''
    timeout_sec = int(os.getenv("ANILIST_REQUEST_TIMEOUT_MS", 8000)) / 1000.0

    try:
        anilist_limiter.acquire()
        r = requests.post(url, json={'query': q, 'variables': {'season': season.upper(), 'year': year, 'page': page}}, headers=COMMON_HEADERS, timeout=timeout_sec)
        if r.status_code == 429 or r.status_code >= 500:
             raise AniListFetchError(f"AniList returned {r.status_code}", status_code=r.status_code)
        r.raise_for_status()
        data = r.json()
        if "errors" in data:
            raise AniListFetchError(f"GraphQL Error: {data['errors']}", status_code=r.status_code)
            
        media_list = data.get('data', {}).get('Page', {}).get('media', [])
        page_info = data.get('data', {}).get('Page', {}).get('pageInfo', {})
        
        normalized = normalize_to_uif("anilist", media_list)
        result = {"data": normalized, "page": page, "has_next": page_info.get("hasNextPage", False), "source": "anilist"}
        cache.set(cache_key, result, ttl=21600) # 6 hours
        return result
    except Exception as e:
        # Phase 1: log before switching to Jikan
        _reason = str(getattr(getattr(e, 'response', None), 'status_code', None) or type(e).__name__)
        log_fallback_event("fetch_seasonal_intel", _reason)
        logger.error(f"AniList seasonal failed, trying Jikan fallback: {e}")
        try:
            j_url = f"https://api.jikan.moe/v4/seasons/{year}/{season.lower()}"
            timeout_sec = int(os.getenv("JIKAN_REQUEST_TIMEOUT_MS", 10000)) / 1000.0
            r = requests.get(j_url, params={"page": page}, timeout=timeout_sec)
            r.raise_for_status()
            j_data = r.json()
            media_list = j_data.get('data', [])

            normalized = normalize_to_uif("jikan", media_list)
            has_next = j_data.get('pagination', {}).get('has_next_page', False)
            result = {"data": normalized, "page": page, "has_next": has_next, "source": "jikan"}

            # Phase 4: 30min for stable seasonal metadata — reduces Jikan load during AniList outages
            cache.set(cache_key, result, ttl=1800)
            return result
        except Exception as je:
            logger.error(f"Jikan seasonal fallback failed: {je}")
            raise ScheduleFetchError("Unable to retrieve seasonal data. Please try again.")

def fetch_anilist_top(page: int = 1, perPage: int = 50, genre: str = None, year: int = None):
    # Normalize empty genre string to None to avoid AniList filtering by literally ""
    if genre == "": genre = None
    
    cache_key = f"anilist:top:{page}:{perPage}:{genre}:{year}"
    # cached = cache.get(cache_key)
    # if cached: return cached[0], cached[1]

    url = 'https://graphql.anilist.co'
    q = '''
    query ($page: Int, $perPage: Int, $genre: String, $year: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo { hasNextPage lastPage total }
        media (type: ANIME, sort: [SCORE_DESC, START_DATE_DESC], isAdult: false, genre: $genre, seasonYear: $year) {
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
        anilist_limiter.acquire()
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
        # Phase 1: log before switching to Jikan
        _reason = str(getattr(getattr(e, 'response', None), 'status_code', None) or type(e).__name__)
        log_fallback_event("fetch_anilist_top", _reason)
        print(f"[AniList top ERROR]: {e}. Attempting Jikan fallback...")
        try:
            j_url = f"https://api.jikan.moe/v4/top/anime"
            r = requests.get(j_url, params={"page": page, "limit": perPage}, timeout=10)
            r.raise_for_status()
            j_data = r.json()
            media_list = j_data.get('data', [])

            normalized = []
            for item in media_list:
                mid = item['mal_id']
                normalized.append({
                    'mal_id': mid,
                    'idMal': mid,
                    'idAniList': None,
                    # Phase 3: namespaced key
                    'aid': _make_id(None, mid),
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
            # Phase 4: 30min for cover images, studios, basic metadata (stable data)
            cache.set(cache_key, result, ttl=1800)
            return result
        except Exception as je:
            print(f"[Jikan top fallback ERROR]: {je}")
            return [], {}

def fetch_anilist_user_list(username: str):
    """
    Fetches the full anime list for a given AniList username.
    Standardizes status mapping to RoninHub's internal collection schema.
    """
    url = 'https://graphql.anilist.co'
    query = '''
    query ($username: String) {
      MediaListCollection(userName: $username, type: ANIME) {
        lists {
          name
          entries {
            status
            score(format: POINT_10)
            progress
            media {
              id
              idMal
              title { romaji english native }
              coverImage { extraLarge }
              episodes
              genres
              format
            }
          }
        }
      }
    }
    '''
    try:
        anilist_limiter.acquire()
        response = requests.post(url, json={'query': query, 'variables': {'username': username}}, headers=COMMON_HEADERS, timeout=20)
        response.raise_for_status()
        data = response.json()
        
        lists = data.get('data', {}).get('MediaListCollection', {}).get('lists', [])
        normalized = []
        
        STATUS_MAP = {
            "CURRENT": "Watching",
            "COMPLETED": "Completed",
            "PLANNING": "Plan to Watch",
            "DROPPED": "Dropped",
            "PAUSED": "On Hold",
            "REPEATING": "Watching"
        }
        
        for lst in lists:
            for entry in lst['entries']:
                media = entry['media']
                title = media['title']['english'] or media['title']['romaji']
                
                normalized.append({
                    "anime_id": media['id'],
                    "idMal": media['idMal'],
                    "title": title,
                    "title_english": media['title']['english'],
                    "title_romaji": media['title']['romaji'],
                    "title_native": media['title']['native'],
                    "image_url": media['coverImage']['extraLarge'],
                    "status": STATUS_MAP.get(entry['status'], "Plan to Watch"),
                    "score": entry['score'],
                    "episodes": media['episodes'],
                    "progress": entry['progress'],
                    "genres": ", ".join(media['genres'])
                })
        return normalized
    except Exception as e:
        print(f"[AniList user sync ERROR]: {e}")
        return None
