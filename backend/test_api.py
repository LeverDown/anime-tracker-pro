import requests

url = 'https://graphql.anilist.co'
q = """
query ($sort: [MediaSort], $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total lastPage hasNextPage }
    media(sort: $sort, type: ANIME, isAdult: false) {
      id
      idMal
      title { english romaji }
    }
  }
}
"""
try:
    r = requests.post(url, json={'query': q, 'variables': {'sort': 'TRENDING_DESC', 'page': 1, 'perPage': 3}}, timeout=15)
    print('Status:', r.status_code)
    print('Response:', r.text[:800])
except Exception as e:
    print('Error:', e)
