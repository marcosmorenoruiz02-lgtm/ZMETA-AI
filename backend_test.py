#!/usr/bin/env python3
"""
ZMETA-AI Backend Regression + New Feature Test
Tests weighted engagement sorting, thread field, placeholder detection, and 280/thread rule
"""
import requests
import json
import base64
import time
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

# Base URL from .env
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

def log_test(name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status} - {name}")
    if details:
        print(f"  {details}")

def calculate_engagement_score(tweet):
    """Calculate weighted engagement score: likes + retweets*2 + replies*1.5 + quotes*3 + views*0.01"""
    return (
        tweet.get('likes', 0) +
        tweet.get('retweets', 0) * 2 +
        tweet.get('replies', 0) * 1.5 +
        tweet.get('quotes', 0) * 3 +
        tweet.get('views', 0) * 0.01
    )

def check_thread_field(generated_tweets):
    """Check if all generated tweets have a 'thread' field (array)"""
    issues = []
    for i, tweet in enumerate(generated_tweets):
        if 'thread' not in tweet:
            issues.append(f"Tweet {i+1} missing 'thread' field")
        elif not isinstance(tweet['thread'], list):
            issues.append(f"Tweet {i+1} 'thread' is not an array (type: {type(tweet['thread']).__name__})")
    return issues

def check_placeholders(generated_tweets):
    """Check for placeholder tokens like [IMAGEN], [VIDEO], [LINK]"""
    placeholders = ['[IMAGEN]', '[VIDEO]', '[LINK]', '[ADJUNTO]']
    issues = []
    for i, tweet in enumerate(generated_tweets):
        text = tweet.get('text', '')
        for placeholder in placeholders:
            if placeholder.upper() in text.upper():
                issues.append(f"Tweet {i+1} contains placeholder '{placeholder}' in text")
        # Also check thread array
        if 'thread' in tweet and isinstance(tweet['thread'], list):
            for j, thread_text in enumerate(tweet['thread']):
                for placeholder in placeholders:
                    if placeholder.upper() in str(thread_text).upper():
                        issues.append(f"Tweet {i+1} thread[{j}] contains placeholder '{placeholder}'")
    return issues

def check_280_thread_rule(generated_tweets):
    """Check: text <= 280 OR (text > 280 implies thread.length >= 2)"""
    issues = []
    for i, tweet in enumerate(generated_tweets):
        text = tweet.get('text', '')
        thread = tweet.get('thread', [])
        text_len = len(text)
        
        if text_len > 280:
            if not isinstance(thread, list) or len(thread) < 2:
                issues.append(f"Tweet {i+1} has {text_len} chars but thread length is {len(thread) if isinstance(thread, list) else 'N/A'} (expected >= 2)")
        
        # Also check each thread item is <= 280
        if isinstance(thread, list):
            for j, thread_text in enumerate(thread):
                if len(str(thread_text)) > 280:
                    issues.append(f"Tweet {i+1} thread[{j}] exceeds 280 chars ({len(str(thread_text))} chars)")
    
    return issues

def create_test_image():
    """Create a small test PNG with text overlay"""
    img = Image.new('RGB', (400, 200), color='#1DA1F2')
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 70), "LANZAMIENTO IA", fill='white', font=font)
    draw.text((50, 120), "Nuevo producto", fill='white', font=font)
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    b64 = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/png;base64,{b64}"

print("=" * 80)
print("ZMETA-AI BACKEND REGRESSION + NEW FEATURE TEST")
print("=" * 80)

# TEST 1: USER MODE - Weighted Engagement Sorting + New Validations
print("\n" + "=" * 80)
print("TEST 1: USER MODE - @MorrrMorrr63705")
print("=" * 80)

try:
    start = time.time()
    response = requests.post(
        f"{BASE_URL}/analyze-and-generate",
        json={"type": "user", "query": "@MorrrMorrr63705"},
        timeout=120
    )
    elapsed = time.time() - start
    
    print(f"Response time: {elapsed:.2f}s")
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Check originalTweets non-empty
        original_tweets = data.get('originalTweets', [])
        log_test("USER MODE: originalTweets non-empty", len(original_tweets) > 0, 
                f"Found {len(original_tweets)} tweets")
        
        # Check weighted engagement sorting (DESCENDING)
        if len(original_tweets) > 1:
            scores = [calculate_engagement_score(t) for t in original_tweets]
            is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
            log_test("USER MODE: Weighted engagement sorting (DESCENDING)", is_sorted,
                    f"Scores: {[round(s, 2) for s in scores[:5]]}")
            if not is_sorted:
                print(f"  ❌ SORTING ERROR: Expected descending order")
                for i, (tweet, score) in enumerate(zip(original_tweets[:5], scores[:5])):
                    print(f"    Tweet {i+1}: score={score:.2f}, likes={tweet.get('likes')}, retweets={tweet.get('retweets')}, replies={tweet.get('replies')}, quotes={tweet.get('quotes')}, views={tweet.get('views')}")
        
        # Check generatedTweets exactly 3
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        log_test("USER MODE: generatedTweets exactly 3", len(generated_tweets) == 3,
                f"Found {len(generated_tweets)} tweets")
        
        # Check thread field presence
        thread_issues = check_thread_field(generated_tweets)
        log_test("USER MODE: All tweets have 'thread' field", len(thread_issues) == 0,
                "\n  ".join(thread_issues) if thread_issues else "All tweets have thread field (array)")
        
        # Check for placeholders
        placeholder_issues = check_placeholders(generated_tweets)
        log_test("USER MODE: No placeholder tokens", len(placeholder_issues) == 0,
                "\n  ".join(placeholder_issues) if placeholder_issues else "No placeholders found")
        
        # Check 280/thread rule
        rule_issues = check_280_thread_rule(generated_tweets)
        log_test("USER MODE: 280/thread rule compliance", len(rule_issues) == 0,
                "\n  ".join(rule_issues) if rule_issues else "All tweets comply with 280/thread rule")
        
        # Check all required fields
        all_fields_ok = True
        for i, tweet in enumerate(generated_tweets):
            required = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint', 'thread']
            missing = [f for f in required if f not in tweet]
            if missing:
                print(f"  ❌ Tweet {i+1} missing fields: {missing}")
                all_fields_ok = False
        log_test("USER MODE: All required fields present", all_fields_ok)
        
    else:
        log_test("USER MODE: HTTP 200", False, f"Got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("USER MODE: Request", False, f"Exception: {str(e)}")

# TEST 2: TOPIC MODE - Same validations
print("\n" + "=" * 80)
print("TEST 2: TOPIC MODE - Inteligencia Artificial")
print("=" * 80)

try:
    start = time.time()
    response = requests.post(
        f"{BASE_URL}/analyze-and-generate",
        json={"type": "topic", "query": "Inteligencia Artificial", "minFaves": 100},
        timeout=120
    )
    elapsed = time.time() - start
    
    print(f"Response time: {elapsed:.2f}s")
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Check originalTweets non-empty
        original_tweets = data.get('originalTweets', [])
        log_test("TOPIC MODE: originalTweets non-empty", len(original_tweets) > 0,
                f"Found {len(original_tweets)} tweets")
        
        # Check weighted engagement sorting (DESCENDING)
        if len(original_tweets) > 1:
            scores = [calculate_engagement_score(t) for t in original_tweets]
            is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
            log_test("TOPIC MODE: Weighted engagement sorting (DESCENDING)", is_sorted,
                    f"Scores: {[round(s, 2) for s in scores[:5]]}")
            if not is_sorted:
                print(f"  ❌ SORTING ERROR: Expected descending order")
                for i, (tweet, score) in enumerate(zip(original_tweets[:5], scores[:5])):
                    print(f"    Tweet {i+1}: score={score:.2f}, likes={tweet.get('likes')}, retweets={tweet.get('retweets')}, replies={tweet.get('replies')}, quotes={tweet.get('quotes')}, views={tweet.get('views')}")
        
        # Check generatedTweets exactly 3
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        log_test("TOPIC MODE: generatedTweets exactly 3", len(generated_tweets) == 3,
                f"Found {len(generated_tweets)} tweets")
        
        # Check thread field presence
        thread_issues = check_thread_field(generated_tweets)
        log_test("TOPIC MODE: All tweets have 'thread' field", len(thread_issues) == 0,
                "\n  ".join(thread_issues) if thread_issues else "All tweets have thread field (array)")
        
        # Check for placeholders
        placeholder_issues = check_placeholders(generated_tweets)
        log_test("TOPIC MODE: No placeholder tokens", len(placeholder_issues) == 0,
                "\n  ".join(placeholder_issues) if placeholder_issues else "No placeholders found")
        
        # Check 280/thread rule
        rule_issues = check_280_thread_rule(generated_tweets)
        log_test("TOPIC MODE: 280/thread rule compliance", len(rule_issues) == 0,
                "\n  ".join(rule_issues) if rule_issues else "All tweets comply with 280/thread rule")
        
        # Check all required fields
        all_fields_ok = True
        for i, tweet in enumerate(generated_tweets):
            required = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint', 'thread']
            missing = [f for f in required if f not in tweet]
            if missing:
                print(f"  ❌ Tweet {i+1} missing fields: {missing}")
                all_fields_ok = False
        log_test("TOPIC MODE: All required fields present", all_fields_ok)
        
    else:
        log_test("TOPIC MODE: HTTP 200", False, f"Got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("TOPIC MODE: Request", False, f"Exception: {str(e)}")

# TEST 3: VISION MODE - Image with thread field checks
print("\n" + "=" * 80)
print("TEST 3: VISION MODE - Image with text overlay")
print("=" * 80)

try:
    image_data_url = create_test_image()
    print(f"Created test image (data URL length: {len(image_data_url)} chars)")
    
    start = time.time()
    response = requests.post(
        f"{BASE_URL}/vision-generate",
        json={"image": image_data_url, "note": "lanzamiento"},
        timeout=120
    )
    elapsed = time.time() - start
    
    print(f"Response time: {elapsed:.2f}s")
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Check vision object
        vision = data.get('vision', {})
        has_vision = all(k in vision for k in ['description', 'ocr', 'tone', 'subjects'])
        log_test("VISION MODE: vision object complete", has_vision,
                f"Keys: {list(vision.keys())}")
        
        # Check audio object
        audio = data.get('audio', {})
        has_audio = 'tone' in audio
        log_test("VISION MODE: audio object present", has_audio,
                f"Audio tone: {audio.get('tone', 'N/A')}")
        
        # Check combined_hook_angle
        has_hook = 'combined_hook_angle' in data and isinstance(data['combined_hook_angle'], str)
        log_test("VISION MODE: combined_hook_angle present", has_hook)
        
        # Check generatedTweets exactly 3
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        log_test("VISION MODE: generatedTweets exactly 3", len(generated_tweets) == 3,
                f"Found {len(generated_tweets)} tweets")
        
        # Check thread field presence
        thread_issues = check_thread_field(generated_tweets)
        log_test("VISION MODE: All tweets have 'thread' field", len(thread_issues) == 0,
                "\n  ".join(thread_issues) if thread_issues else "All tweets have thread field (array)")
        
        # Check for placeholders
        placeholder_issues = check_placeholders(generated_tweets)
        log_test("VISION MODE: No placeholder tokens", len(placeholder_issues) == 0,
                "\n  ".join(placeholder_issues) if placeholder_issues else "No placeholders found")
        
        # Check 280/thread rule
        rule_issues = check_280_thread_rule(generated_tweets)
        log_test("VISION MODE: 280/thread rule compliance", len(rule_issues) == 0,
                "\n  ".join(rule_issues) if rule_issues else "All tweets comply with 280/thread rule")
        
        # Check all required fields
        all_fields_ok = True
        for i, tweet in enumerate(generated_tweets):
            required = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint', 'thread']
            missing = [f for f in required if f not in tweet]
            if missing:
                print(f"  ❌ Tweet {i+1} missing fields: {missing}")
                all_fields_ok = False
        log_test("VISION MODE: All required fields present", all_fields_ok)
        
    else:
        log_test("VISION MODE: HTTP 200", False, f"Got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("VISION MODE: Request", False, f"Exception: {str(e)}")

# TEST 4: TEXT TEMPLATE MODE - Thread field checks
print("\n" + "=" * 80)
print("TEST 4: TEXT TEMPLATE MODE - format=thread, topic=Productividad")
print("=" * 80)

try:
    start = time.time()
    response = requests.post(
        f"{BASE_URL}/text-template",
        json={"format": "thread", "topic": "Productividad"},
        timeout=120
    )
    elapsed = time.time() - start
    
    print(f"Response time: {elapsed:.2f}s")
    print(f"Status code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Check generatedTweets exactly 3
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        log_test("TEXT TEMPLATE: generatedTweets exactly 3", len(generated_tweets) == 3,
                f"Found {len(generated_tweets)} tweets")
        
        # Check thread field presence
        thread_issues = check_thread_field(generated_tweets)
        log_test("TEXT TEMPLATE: All tweets have 'thread' field", len(thread_issues) == 0,
                "\n  ".join(thread_issues) if thread_issues else "All tweets have thread field (array)")
        
        # Check for placeholders
        placeholder_issues = check_placeholders(generated_tweets)
        log_test("TEXT TEMPLATE: No placeholder tokens", len(placeholder_issues) == 0,
                "\n  ".join(placeholder_issues) if placeholder_issues else "No placeholders found")
        
        # Check 280/thread rule
        rule_issues = check_280_thread_rule(generated_tweets)
        log_test("TEXT TEMPLATE: 280/thread rule compliance", len(rule_issues) == 0,
                "\n  ".join(rule_issues) if rule_issues else "All tweets comply with 280/thread rule")
        
        # Check all required fields
        all_fields_ok = True
        for i, tweet in enumerate(generated_tweets):
            required = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint', 'thread']
            missing = [f for f in required if f not in tweet]
            if missing:
                print(f"  ❌ Tweet {i+1} missing fields: {missing}")
                all_fields_ok = False
        log_test("TEXT TEMPLATE: All required fields present", all_fields_ok)
        
    else:
        log_test("TEXT TEMPLATE: HTTP 200", False, f"Got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("TEXT TEMPLATE: Request", False, f"Exception: {str(e)}")

print("\n" + "=" * 80)
print("TEST SUITE COMPLETE")
print("=" * 80)
