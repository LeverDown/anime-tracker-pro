import requests
import json

token = "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"
org = "thevelvetroom"
project_id = "4511279968485376"

# Query Discover results for the /discover transaction
url = f"https://sentry.io/api/0/organizations/{org}/discover/results/"

# We want to see the average duration of the /discover page and the /api/anime/discover endpoint
query = {
    "project": [project_id],
    "field": ["transaction", "avg(transaction.duration)", "count()", "p95(transaction.duration)"],
    "query": "transaction:/discover OR transaction:/api/anime/discover",
    "statsPeriod": "24h",
    "orderby": "-count"
}

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

try:
    response = requests.get(url, headers=headers, params=query)
    if response.status_code == 200:
        data = response.json()
        if data.get('data'):
            print("PERFORMANCE REPORT:")
            for item in data['data']:
                duration = item.get('avg(transaction.duration)', 0)
                p95 = item.get('p95(transaction.duration)', 0)
                count = item.get('count()', 0)
                print(f"- {item['transaction']}:")
                print(f"  Avg Speed: {duration:.2f}ms")
                print(f"  95th Percentile: {p95:.2f}ms")
                print(f"  Total Hits: {count}")
        else:
            print("No performance data found yet. Try clicking around the Discover page a few times!")
    else:
        print(f"Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Failed: {e}")
