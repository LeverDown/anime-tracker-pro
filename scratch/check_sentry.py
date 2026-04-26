import requests

token = "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"
url = "https://sentry.io/api/0/projects/thevelvetroom/javascript-nextjs/issues/"

headers = {
    "Authorization": f"Bearer {token}"
}

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        issues = response.json()
        if issues:
            print(f"FOUND {len(issues)} ISSUES")
            for issue in issues[:3]:
                print(f"- [{issue['shortId']}] {issue['title']} (Events: {issue['count']})")
        else:
            print("No issues found yet.")
    else:
        print(f"Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Failed: {e}")
