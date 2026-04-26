import requests

token = "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"
url = "https://sentry.io/api/0/projects/"

headers = {"Authorization": f"Bearer {token}"}

try:
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        for p in r.json():
            print(f"Project: {p['slug']} (ID: {p['id']}, Org: {p['organization']['slug']})")
    else:
        print(f"Error: {r.status_code} - {r.text}")
except Exception as e:
    print(f"Failed: {e}")
