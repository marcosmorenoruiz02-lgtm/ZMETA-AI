#!/usr/bin/env python3
"""
Diagnostic test to check if tweets meet minFaves requirement
"""

import requests
import json

BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

payload = {
    "type": "topic",
    "query": "Inteligencia Artificial",
    "minFaves": 100
}

print("Testing MODE TOPIC with minFaves=100...")
print(f"Payload: {json.dumps(payload, ensure_ascii=False)}\n")

response = requests.post(
    f"{BASE_URL}/analyze-and-generate",
    json=payload,
    headers=HEADERS,
    timeout=90
)

if response.status_code == 200:
    data = response.json()
    tweets = data.get("originalTweets", [])
    
    print(f"✅ HTTP 200 - Found {len(tweets)} tweets\n")
    print("Checking likes count for each tweet:")
    print("-" * 60)
    
    for i, tweet in enumerate(tweets, 1):
        likes = tweet.get("likes", 0)
        text_preview = tweet.get("text", "")[:50]
        meets_requirement = "✅" if likes >= 100 else "❌"
        print(f"{i}. Likes: {likes:>6} {meets_requirement} | {text_preview}...")
    
    print("-" * 60)
    
    # Check if all tweets meet minFaves requirement
    all_meet = all(t.get("likes", 0) >= 100 for t in tweets)
    some_meet = any(t.get("likes", 0) >= 100 for t in tweets)
    
    if all_meet:
        print("\n✅ ALL tweets have likes >= 100 (minFaves filter working)")
    elif some_meet:
        print("\n⚠️  SOME tweets have likes >= 100 (partial filtering)")
    else:
        print("\n❌ NO tweets have likes >= 100 (minFaves filter NOT working)")
        print("   However, backend post-filters by engagement, so this may be expected")
    
else:
    print(f"❌ HTTP {response.status_code}")
    print(response.text)
