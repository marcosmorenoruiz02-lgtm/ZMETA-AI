#!/usr/bin/env python3
"""
ZMETA-AI Backend Test Suite - Viral Growth Engine + Advanced Sorting
Tests all endpoints with new requirements:
- Composite score sorting (views*0.05 + likes*1 + retweets*2 + replies*1.5 + quotes*3)
- primeTimes array (window/count/score)
- growth object (topBanners, loopOutro, replyStrategy)
- firstSelfReply in each generatedTweet
"""

import requests
import json
import time
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

# Base URL from .env
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"
TIMEOUT = 90  # Allow up to 90s per request

def log_test(name, status, details=""):
    """Log test results"""
    symbol = "✅" if status else "❌"
    print(f"\n{symbol} {name}")
    if details:
        print(f"   {details}")

def verify_composite_score_sorting(tweets):
    """Verify tweets are sorted by composite score in DESCENDING order"""
    if not tweets or len(tweets) < 2:
        return True, []
    
    scores = []
    for t in tweets:
        score = (t.get('views', 0) * 0.05 + 
                 t.get('likes', 0) * 1 + 
                 t.get('retweets', 0) * 2 + 
                 t.get('replies', 0) * 1.5 + 
                 t.get('quotes', 0) * 3)
        scores.append(round(score, 2))
    
    # Check if sorted in descending order
    is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
    return is_sorted, scores

def verify_prime_times(prime_times):
    """Verify primeTimes structure"""
    if not isinstance(prime_times, list):
        return False, "primeTimes is not an array"
    
    if len(prime_times) > 3:
        return False, f"primeTimes has {len(prime_times)} items (max 3)"
    
    for pt in prime_times:
        if not isinstance(pt, dict):
            return False, "primeTimes item is not an object"
        if 'window' not in pt or 'count' not in pt or 'score' not in pt:
            return False, f"primeTimes item missing required fields: {pt}"
        if not isinstance(pt['window'], str):
            return False, f"window is not a string: {pt['window']}"
        if not isinstance(pt['count'], int) or pt['count'] < 0:
            return False, f"count is not a valid integer: {pt['count']}"
        if not isinstance(pt['score'], (int, float)) or pt['score'] < 0:
            return False, f"score is not a valid number: {pt['score']}"
    
    return True, f"{len(prime_times)} items with valid structure"

def verify_growth_object(growth):
    """Verify growth object structure"""
    if not isinstance(growth, dict):
        return False, "growth is not an object"
    
    # Check topBanners
    if 'topBanners' not in growth:
        return False, "growth missing topBanners"
    if not isinstance(growth['topBanners'], list):
        return False, "topBanners is not an array"
    if len(growth['topBanners']) != 3:
        return False, f"topBanners has {len(growth['topBanners'])} items (expected 3)"
    for banner in growth['topBanners']:
        if not isinstance(banner, str) or not banner.strip():
            return False, f"topBanners item is not a non-empty string: {banner}"
        # Check if mostly uppercase (viral banner style)
        if not any(c.isupper() for c in banner):
            return False, f"topBanners item not uppercase-ish: {banner}"
    
    # Check loopOutro
    if 'loopOutro' not in growth:
        return False, "growth missing loopOutro"
    if not isinstance(growth['loopOutro'], str) or not growth['loopOutro'].strip():
        return False, "loopOutro is not a non-empty string"
    
    # Check replyStrategy
    if 'replyStrategy' not in growth:
        return False, "growth missing replyStrategy"
    if not isinstance(growth['replyStrategy'], str) or not growth['replyStrategy'].strip():
        return False, "replyStrategy is not a non-empty string"
    
    return True, f"topBanners: {len(growth['topBanners'])}, loopOutro: {len(growth['loopOutro'])} chars, replyStrategy: {len(growth['replyStrategy'])} chars"

def verify_generated_tweets(tweets):
    """Verify generatedTweets structure including firstSelfReply"""
    if not isinstance(tweets, list):
        return False, "generatedTweets is not an array"
    
    if len(tweets) != 3:
        return False, f"generatedTweets has {len(tweets)} items (expected exactly 3)"
    
    for i, tweet in enumerate(tweets):
        if not isinstance(tweet, dict):
            return False, f"Tweet {i+1} is not an object"
        
        # Check required fields
        required = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint', 'thread', 'firstSelfReply']
        for field in required:
            if field not in tweet:
                return False, f"Tweet {i+1} missing field: {field}"
        
        # Validate firstSelfReply (NEW REQUIREMENT)
        if not isinstance(tweet['firstSelfReply'], str) or not tweet['firstSelfReply'].strip():
            return False, f"Tweet {i+1} firstSelfReply is not a non-empty string"
        if len(tweet['firstSelfReply']) > 280:
            return False, f"Tweet {i+1} firstSelfReply exceeds 280 chars: {len(tweet['firstSelfReply'])}"
        
        # Validate other fields
        if not isinstance(tweet['style'], str) or not tweet['style'].strip():
            return False, f"Tweet {i+1} style is not a non-empty string"
        if not isinstance(tweet['text'], str) or not tweet['text'].strip():
            return False, f"Tweet {i+1} text is not a non-empty string"
        if not isinstance(tweet['rationale'], str) or not tweet['rationale'].strip():
            return False, f"Tweet {i+1} rationale is not a non-empty string"
        if not isinstance(tweet['hookStrength'], int) or not (0 <= tweet['hookStrength'] <= 100):
            return False, f"Tweet {i+1} hookStrength is not an int 0-100: {tweet['hookStrength']}"
        if tweet['retention'] not in ['Alta', 'Media', 'Baja']:
            return False, f"Tweet {i+1} retention is not Alta/Media/Baja: {tweet['retention']}"
        if not isinstance(tweet['weakPoint'], str) or not tweet['weakPoint'].strip():
            return False, f"Tweet {i+1} weakPoint is not a non-empty string"
        if not isinstance(tweet['thread'], list):
            return False, f"Tweet {i+1} thread is not an array"
    
    return True, f"All 3 tweets have valid structure including firstSelfReply"

def create_test_image():
    """Create a small test PNG with text"""
    img = Image.new('RGB', (400, 200), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Draw text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 50), "LANZAMIENTO", fill='white', font=font)
    draw.text((50, 120), "Producto IA", fill='#00d4ff', font=font)
    
    # Convert to data URL
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    b64 = base64.b64encode(img_bytes).decode('utf-8')
    return f"data:image/png;base64,{b64}"

def test_user_mode():
    """Test USER MODE with @MorrrMorrr63705"""
    print("\n" + "="*80)
    print("TEST 1: USER MODE - @MorrrMorrr63705")
    print("="*80)
    
    try:
        payload = {
            "type": "user",
            "query": "@MorrrMorrr63705"
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/analyze-and-generate", json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        log_test(f"HTTP Status", response.status_code == 200, f"Status: {response.status_code}, Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"   Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check originalTweets
        if 'originalTweets' not in data:
            log_test("originalTweets present", False, "Missing originalTweets")
            return False
        
        tweets = data['originalTweets']
        log_test("originalTweets non-empty", len(tweets) > 0, f"Count: {len(tweets)}")
        
        # Verify composite score sorting
        is_sorted, scores = verify_composite_score_sorting(tweets)
        log_test("Composite score sorting (DESCENDING)", is_sorted, f"Scores: {scores[:5]}")
        
        # Verify primeTimes
        if 'primeTimes' not in data:
            log_test("primeTimes present", False, "Missing primeTimes")
            return False
        
        pt_valid, pt_msg = verify_prime_times(data['primeTimes'])
        log_test("primeTimes structure", pt_valid, pt_msg)
        
        # Verify growth object
        if 'growth' not in data:
            log_test("growth object present", False, "Missing growth")
            return False
        
        growth_valid, growth_msg = verify_growth_object(data['growth'])
        log_test("growth object structure", growth_valid, growth_msg)
        
        # Verify generatedTweets
        if 'analysis' not in data or 'generatedTweets' not in data['analysis']:
            log_test("analysis.generatedTweets present", False, "Missing analysis.generatedTweets")
            return False
        
        tweets_valid, tweets_msg = verify_generated_tweets(data['analysis']['generatedTweets'])
        log_test("generatedTweets structure (with firstSelfReply)", tweets_valid, tweets_msg)
        
        # Print sample firstSelfReply
        if tweets_valid and len(data['analysis']['generatedTweets']) > 0:
            sample = data['analysis']['generatedTweets'][0]['firstSelfReply']
            print(f"   Sample firstSelfReply: \"{sample[:100]}...\"")
        
        return is_sorted and pt_valid and growth_valid and tweets_valid
        
    except Exception as e:
        log_test("USER MODE", False, f"Exception: {str(e)}")
        return False

def test_topic_mode():
    """Test TOPIC MODE with Inteligencia Artificial"""
    print("\n" + "="*80)
    print("TEST 2: TOPIC MODE - Inteligencia Artificial")
    print("="*80)
    
    try:
        payload = {
            "type": "topic",
            "query": "Inteligencia Artificial",
            "minFaves": 100
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/analyze-and-generate", json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        log_test(f"HTTP Status", response.status_code == 200, f"Status: {response.status_code}, Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"   Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check originalTweets
        tweets = data.get('originalTweets', [])
        log_test("originalTweets non-empty", len(tweets) > 0, f"Count: {len(tweets)}")
        
        # Verify composite score sorting
        is_sorted, scores = verify_composite_score_sorting(tweets)
        log_test("Composite score sorting (DESCENDING)", is_sorted, f"Scores: {scores[:5]}")
        
        # Verify primeTimes
        pt_valid, pt_msg = verify_prime_times(data.get('primeTimes', []))
        log_test("primeTimes structure", pt_valid, pt_msg)
        
        # Verify growth object
        growth_valid, growth_msg = verify_growth_object(data.get('growth', {}))
        log_test("growth object structure", growth_valid, growth_msg)
        
        # Verify generatedTweets
        tweets_valid, tweets_msg = verify_generated_tweets(data.get('analysis', {}).get('generatedTweets', []))
        log_test("generatedTweets structure (with firstSelfReply)", tweets_valid, tweets_msg)
        
        return is_sorted and pt_valid and growth_valid and tweets_valid
        
    except Exception as e:
        log_test("TOPIC MODE", False, f"Exception: {str(e)}")
        return False

def test_vision_mode():
    """Test VISION MODE with image"""
    print("\n" + "="*80)
    print("TEST 3: VISION MODE - Image with text")
    print("="*80)
    
    try:
        image_data = create_test_image()
        payload = {
            "image": image_data,
            "note": "lanzamiento"
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/vision-generate", json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        log_test(f"HTTP Status", response.status_code == 200, f"Status: {response.status_code}, Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"   Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Verify growth object
        growth_valid, growth_msg = verify_growth_object(data.get('growth', {}))
        log_test("growth object structure", growth_valid, growth_msg)
        
        # Verify generatedTweets
        tweets_valid, tweets_msg = verify_generated_tweets(data.get('analysis', {}).get('generatedTweets', []))
        log_test("generatedTweets structure (with firstSelfReply)", tweets_valid, tweets_msg)
        
        # Check audio.tone (should be like "Sin audio")
        audio_tone = data.get('audio', {}).get('tone', '')
        log_test("audio.tone present", bool(audio_tone), f"Tone: {audio_tone}")
        
        return growth_valid and tweets_valid
        
    except Exception as e:
        log_test("VISION MODE", False, f"Exception: {str(e)}")
        return False

def test_text_template():
    """Test TEXT TEMPLATE with controversy format"""
    print("\n" + "="*80)
    print("TEST 4: TEXT TEMPLATE - controversy/SaaS")
    print("="*80)
    
    try:
        payload = {
            "format": "controversy",
            "topic": "SaaS"
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/text-template", json=payload, timeout=TIMEOUT)
        elapsed = time.time() - start
        
        log_test(f"HTTP Status", response.status_code == 200, f"Status: {response.status_code}, Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"   Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Verify growth object
        growth_valid, growth_msg = verify_growth_object(data.get('growth', {}))
        log_test("growth object structure", growth_valid, growth_msg)
        
        # Verify generatedTweets
        tweets_valid, tweets_msg = verify_generated_tweets(data.get('analysis', {}).get('generatedTweets', []))
        log_test("generatedTweets structure (with firstSelfReply)", tweets_valid, tweets_msg)
        
        return growth_valid and tweets_valid
        
    except Exception as e:
        log_test("TEXT TEMPLATE", False, f"Exception: {str(e)}")
        return False

def test_schedule_stability():
    """Test GET /api/schedule stability (3 consecutive calls)"""
    print("\n" + "="*80)
    print("TEST 5: SCHEDULE STABILITY - 3 consecutive calls")
    print("="*80)
    
    try:
        results = []
        for i in range(3):
            start = time.time()
            response = requests.get(f"{BASE_URL}/schedule", timeout=30)
            elapsed = time.time() - start
            
            success = response.status_code == 200
            results.append(success)
            
            log_test(f"Call {i+1}", success, f"Status: {response.status_code}, Time: {elapsed:.2f}s")
            
            if success:
                data = response.json()
                if 'items' not in data or 'count' not in data:
                    log_test(f"Call {i+1} structure", False, "Missing items or count")
                    results[-1] = False
            
            time.sleep(0.5)  # Small delay between calls
        
        all_passed = all(results)
        log_test("All 3 calls successful", all_passed, f"Results: {results}")
        
        return all_passed
        
    except Exception as e:
        log_test("SCHEDULE STABILITY", False, f"Exception: {str(e)}")
        return False

def test_metrics_endpoint():
    """Quick test of GET /api/metrics"""
    print("\n" + "="*80)
    print("TEST 6: METRICS ENDPOINT")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/metrics", timeout=30)
        
        success = response.status_code == 200
        log_test("HTTP Status", success, f"Status: {response.status_code}")
        
        if success:
            data = response.json()
            has_fields = 'posts' in data and 'diagnostics' in data and 'hours_saved' in data
            log_test("Response structure", has_fields, f"Data: {data}")
            return has_fields
        
        return False
        
    except Exception as e:
        log_test("METRICS ENDPOINT", False, f"Exception: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("ZMETA-AI BACKEND TEST SUITE - VIRAL GROWTH ENGINE")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Timeout: {TIMEOUT}s per request")
    
    results = {
        "USER MODE": test_user_mode(),
        "TOPIC MODE": test_topic_mode(),
        "VISION MODE": test_vision_mode(),
        "TEXT TEMPLATE": test_text_template(),
        "SCHEDULE STABILITY": test_schedule_stability(),
        "METRICS": test_metrics_endpoint()
    }
    
    print("\n" + "="*80)
    print("FINAL RESULTS")
    print("="*80)
    
    for test_name, passed in results.items():
        symbol = "✅" if passed else "❌"
        print(f"{symbol} {test_name}: {'PASSED' if passed else 'FAILED'}")
    
    total = len(results)
    passed = sum(results.values())
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return all(results.values())

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
