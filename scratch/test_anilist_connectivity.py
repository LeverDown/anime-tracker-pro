import requests
import json

url = 'https://graphql.anilist.co'
query = '''
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC) {
      title { english romaji }
    }
  }
}
'''
variables = {'page': 1, 'perPage': 5}

try:
    response = requests.post(url, json={'query': query, 'variables': variables}, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Body: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
