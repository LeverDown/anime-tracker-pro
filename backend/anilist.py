import requests
from datetime import datetime, timedelta

def fetch_anilist(query=None, mode="search", genres=None, page=1, perPage=24):
    url = 'https://graphql.anilist.co'
    graph_query = '''
    query ($search: String, $sort: [MediaSort], $genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total lastPage hasNextPage }
        media(search: $search, sort: $sort, genre: $genre, type: ANIME, isAdult: false) {
          id
          title { english romaji }
          coverImage { large }
          averageScore episodes genres description
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
        variables["sort"] = "POPULARITY_DESC"
    elif mode == "top":
        variables["sort"] = "TRENDING_DESC"
    elif mode == "random":
        variables["sort"] = "TRENDING_DESC"
    elif mode == "rec" and query:
        variables["search"] = query
        variables["sort"] = "POPULARITY_DESC"

    if genres and len(genres) > 0:
        variables["genre"] = genres[0]

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
                'mal_id': item['id'],
                'title': title,
                'images': {'jpg': {'image_url': item['coverImage']['large']}},
                'score': (item['averageScore'] / 10) if item['averageScore'] else 0,
                'episodes': item['episodes'],
                'genres': [{'name': g} for g in item['genres']],
                'synopsis': desc,
                'trailer': {'url': trailer_url},
                'characters': item.get('characters', {}).get('edges', [])
            }
            normalized.append(entry)
        return normalized, page_info
    except Exception as e:
        return [], {}

def fetch_anilist_schedule(day_name):
    url = 'https://graphql.anilist.co'
    day_map = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6}
    today = datetime.utcnow()
    target_day_idx = day_map[day_name.lower()]
    current_day_idx = today.weekday()
    delta = target_day_idx - current_day_idx
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
            title { english romaji }
            coverImage { large }
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
                'mal_id': media['id'],
                'title': title,
                'images': {'jpg': {'image_url': media['coverImage']['large']}},
                'broadcast': {'string': f"Airs at {air_time}"},
                'episodes': media['episodes'],
                'type': 'TV',
                'members': media['popularity']
            })
        return sorted(normalized, key=lambda x: x['members'], reverse=True)
    except Exception as e:
        return []
