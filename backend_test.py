#!/usr/bin/env python3
"""
Backend API Tests for ZMETA-AI Multimedia Vision + Text Express + Scheduling
Tests POST /api/vision-generate, POST /api/text-template, POST/GET /api/schedule
"""

import requests
import base64
import io
import os
from PIL import Image, ImageDraw, ImageFont

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://viral-insights-forge.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
TIMEOUT = 90  # LLM calls are slow

def create_test_image():
    """Create a test image with text overlay using PIL"""
    # Create a 400x200 image with gradient background
    img = Image.new('RGB', (400, 200), color=(73, 109, 137))
    d = ImageDraw.Draw(img)
    
    # Add text overlay
    text = "OFERTA IA\n90% descuento"
    try:
        # Try to use a default font
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Draw text in center
    d.text((50, 70), text, fill=(255, 255, 255), font=font)
    
    # Convert to base64 data URL
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    img_b64 = base64.b64encode(img_bytes).decode('utf-8')
    data_url = f"data:image/png;base64,{img_b64}"
    
    return data_url

def test_vision_generate():
    """Test POST /api/vision-generate endpoint"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/vision-generate (Gemini Vision)")
    print("="*80)
    
    # Generate test image
    print("\n[1.1] Creating test image with PIL...")
    try:
        test_image = create_test_image()
        print(f"✓ Test image created (data URL length: {len(test_image)} chars)")
    except Exception as e:
        print(f"✗ Failed to create test image: {e}")
        return False
    
    # Test valid request
    print("\n[1.2] Testing valid request with image and note...")
    try:
        payload = {
            "image": test_image,
            "note": "tono motivador para lanzamiento"
        }
        response = requests.post(f"{API_BASE}/vision-generate", json=payload, timeout=TIMEOUT)
        print(f"Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ Expected HTTP 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"✓ HTTP 200 received")
        
        # Validate response structure
        print("\n[1.3] Validating response structure...")
        
        # Check vision object
        if 'vision' not in data:
            print("✗ Missing 'vision' object")
            return False
        
        vision = data['vision']
        required_vision_fields = ['description', 'ocr', 'tone', 'subjects']
        for field in required_vision_fields:
            if field not in vision:
                print(f"✗ Missing vision.{field}")
                return False
            if field == 'subjects':
                if not isinstance(vision[field], list):
                    print(f"✗ vision.subjects must be array, got {type(vision[field])}")
                    return False
            else:
                if not isinstance(vision[field], str):
                    print(f"✗ vision.{field} must be string, got {type(vision[field])}")
                    return False
                if field in ['description', 'tone'] and not vision[field]:
                    print(f"✗ vision.{field} is empty")
                    return False
        
        print(f"✓ vision object valid: description='{vision['description'][:50]}...', ocr='{vision['ocr']}', tone='{vision['tone']}', subjects={len(vision['subjects'])} items")
        
        # Check analysis object
        if 'analysis' not in data:
            print("✗ Missing 'analysis' object")
            return False
        
        analysis = data['analysis']
        if 'generatedTweets' not in analysis:
            print("✗ Missing analysis.generatedTweets")
            return False
        
        tweets = analysis['generatedTweets']
        if not isinstance(tweets, list):
            print(f"✗ analysis.generatedTweets must be array, got {type(tweets)}")
            return False
        
        if len(tweets) != 3:
            print(f"✗ Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
            return False
        
        print(f"✓ analysis.generatedTweets has EXACTLY 3 items")
        
        # Validate each tweet
        required_tweet_fields = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint']
        for i, tweet in enumerate(tweets):
            for field in required_tweet_fields:
                if field not in tweet:
                    print(f"✗ Tweet {i+1} missing field '{field}'")
                    return False
                
                if field == 'hookStrength':
                    if not isinstance(tweet[field], int) or not (0 <= tweet[field] <= 100):
                        print(f"✗ Tweet {i+1} hookStrength must be int 0-100, got {tweet[field]}")
                        return False
                elif field == 'retention':
                    if tweet[field] not in ['Alta', 'Media', 'Baja']:
                        print(f"✗ Tweet {i+1} retention must be Alta/Media/Baja, got '{tweet[field]}'")
                        return False
                else:
                    if not isinstance(tweet[field], str) or not tweet[field]:
                        print(f"✗ Tweet {i+1} {field} must be non-empty string")
                        return False
        
        print(f"✓ All 3 tweets have valid structure (style/text/rationale/hookStrength/retention/weakPoint)")
        
        # Check metrics
        if 'metrics' not in data:
            print("✗ Missing 'metrics' object")
            return False
        
        print(f"✓ metrics object present: {data['metrics']}")
        
    except requests.exceptions.Timeout:
        print(f"✗ Request timed out after {TIMEOUT}s")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test validation: invalid image
    print("\n[1.4] Testing validation: invalid image (not a data URL)...")
    try:
        payload = {"image": "not-a-data-url"}
        response = requests.post(f"{API_BASE}/vision-generate", json=payload, timeout=TIMEOUT)
        if response.status_code != 400:
            print(f"✗ Expected HTTP 400, got {response.status_code}")
            return False
        print(f"✓ HTTP 400 returned for invalid image")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test validation: missing image
    print("\n[1.5] Testing validation: missing image...")
    try:
        payload = {}
        response = requests.post(f"{API_BASE}/vision-generate", json=payload, timeout=TIMEOUT)
        if response.status_code != 400:
            print(f"✗ Expected HTTP 400, got {response.status_code}")
            return False
        print(f"✓ HTTP 400 returned for missing image")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    print("\n✅ POST /api/vision-generate - ALL TESTS PASSED")
    return True

def test_text_template():
    """Test POST /api/text-template endpoint"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/text-template (Express Text Templates)")
    print("="*80)
    
    test_cases = [
        {"format": "thread", "topic": "Productividad con IA"},
        {"format": "controversy", "topic": "SaaS"},
        {"format": "myth", "topic": "Finanzas"}
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n[2.{i+1}] Testing format='{test_case['format']}', topic='{test_case['topic']}'...")
        try:
            response = requests.post(f"{API_BASE}/text-template", json=test_case, timeout=TIMEOUT)
            print(f"Response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"✗ Expected HTTP 200, got {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
            
            data = response.json()
            print(f"✓ HTTP 200 received")
            
            # Validate analysis object
            if 'analysis' not in data:
                print("✗ Missing 'analysis' object")
                return False
            
            analysis = data['analysis']
            
            # Check patternAnalysis
            if 'patternAnalysis' not in analysis:
                print("✗ Missing analysis.patternAnalysis")
                return False
            
            print(f"✓ analysis.patternAnalysis present")
            
            # Check generatedTweets
            if 'generatedTweets' not in analysis:
                print("✗ Missing analysis.generatedTweets")
                return False
            
            tweets = analysis['generatedTweets']
            if not isinstance(tweets, list):
                print(f"✗ analysis.generatedTweets must be array, got {type(tweets)}")
                return False
            
            if len(tweets) != 3:
                print(f"✗ Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
                return False
            
            print(f"✓ analysis.generatedTweets has EXACTLY 3 items")
            
            # Validate each tweet
            required_fields = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint']
            for j, tweet in enumerate(tweets):
                for field in required_fields:
                    if field not in tweet:
                        print(f"✗ Tweet {j+1} missing field '{field}'")
                        return False
                    
                    if field == 'hookStrength':
                        if not isinstance(tweet[field], int) or not (0 <= tweet[field] <= 100):
                            print(f"✗ Tweet {j+1} hookStrength must be int 0-100, got {tweet[field]}")
                            return False
                    elif field == 'retention':
                        if tweet[field] not in ['Alta', 'Media', 'Baja']:
                            print(f"✗ Tweet {j+1} retention must be Alta/Media/Baja, got '{tweet[field]}'")
                            return False
                    else:
                        if not isinstance(tweet[field], str) or not tweet[field]:
                            print(f"✗ Tweet {j+1} {field} must be non-empty string")
                            return False
            
            print(f"✓ All 3 tweets have valid structure (style/text/rationale/hookStrength/retention/weakPoint)")
            
            # Check metrics
            if 'metrics' not in data:
                print("✗ Missing 'metrics' object")
                return False
            
            print(f"✓ metrics object present")
            
        except requests.exceptions.Timeout:
            print(f"✗ Request timed out after {TIMEOUT}s")
            return False
        except Exception as e:
            print(f"✗ Error: {e}")
            return False
    
    # Test validation: invalid format
    print("\n[2.4] Testing validation: invalid format...")
    try:
        payload = {"format": "invalid", "topic": "x"}
        response = requests.post(f"{API_BASE}/text-template", json=payload, timeout=TIMEOUT)
        if response.status_code != 400:
            print(f"✗ Expected HTTP 400, got {response.status_code}")
            return False
        print(f"✓ HTTP 400 returned for invalid format")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test validation: missing topic
    print("\n[2.5] Testing validation: missing topic...")
    try:
        payload = {"format": "thread"}
        response = requests.post(f"{API_BASE}/text-template", json=payload, timeout=TIMEOUT)
        if response.status_code != 400:
            print(f"✗ Expected HTTP 400, got {response.status_code}")
            return False
        print(f"✓ HTTP 400 returned for missing topic")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    print("\n✅ POST /api/text-template - ALL TESTS PASSED")
    return True

def test_schedule():
    """Test POST and GET /api/schedule endpoints"""
    print("\n" + "="*80)
    print("TEST 3: POST/GET /api/schedule (Draft Scheduling)")
    print("="*80)
    
    # Test POST /api/schedule
    print("\n[3.1] Testing POST /api/schedule with valid data...")
    try:
        payload = {
            "text": "Mi primer tweet programado",
            "style": "Directo",
            "hasMedia": False
        }
        response = requests.post(f"{API_BASE}/schedule", json=payload, timeout=30)
        print(f"Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ Expected HTTP 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        print(f"✓ HTTP 200 received")
        
        # Validate response structure
        if 'draft' not in data:
            print("✗ Missing 'draft' object")
            return False
        
        draft = data['draft']
        required_fields = ['id', 'text', 'scheduledAt', 'status']
        for field in required_fields:
            if field not in draft:
                print(f"✗ draft missing field '{field}'")
                return False
        
        if draft['status'] != 'scheduled':
            print(f"✗ Expected draft.status='scheduled', got '{draft['status']}'")
            return False
        
        print(f"✓ draft object valid: id={draft['id']}, text='{draft['text']}', status='{draft['status']}'")
        
        if 'count' not in data:
            print("✗ Missing 'count' field")
            return False
        
        if not isinstance(data['count'], int) or data['count'] < 1:
            print(f"✗ count must be >= 1, got {data['count']}")
            return False
        
        print(f"✓ count field valid: {data['count']}")
        
        saved_draft_id = draft['id']
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test GET /api/schedule
    print("\n[3.2] Testing GET /api/schedule...")
    try:
        response = requests.get(f"{API_BASE}/schedule", timeout=30)
        print(f"Response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"✗ Expected HTTP 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"✓ HTTP 200 received")
        
        if 'items' not in data:
            print("✗ Missing 'items' array")
            return False
        
        if not isinstance(data['items'], list):
            print(f"✗ items must be array, got {type(data['items'])}")
            return False
        
        if 'count' not in data:
            print("✗ Missing 'count' field")
            return False
        
        print(f"✓ Response structure valid: items array with {len(data['items'])} items, count={data['count']}")
        
        # Check if our draft is in the list
        found = False
        for item in data['items']:
            if item.get('id') == saved_draft_id:
                found = True
                print(f"✓ Previously created draft found in list: '{item['text']}'")
                break
        
        if not found:
            print(f"⚠ Warning: Previously created draft (id={saved_draft_id}) not found in list")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test validation: missing text
    print("\n[3.3] Testing validation: missing text...")
    try:
        payload = {}
        response = requests.post(f"{API_BASE}/schedule", json=payload, timeout=30)
        if response.status_code != 400:
            print(f"✗ Expected HTTP 400, got {response.status_code}")
            return False
        print(f"✓ HTTP 400 returned for missing text")
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    print("\n✅ POST/GET /api/schedule - ALL TESTS PASSED")
    return True

def main():
    """Run all backend tests"""
    print("\n" + "="*80)
    print("ZMETA-AI BACKEND API TESTS")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Timeout: {TIMEOUT}s per request")
    print("="*80)
    
    results = {
        "vision-generate": False,
        "text-template": False,
        "schedule": False
    }
    
    try:
        results["vision-generate"] = test_vision_generate()
    except Exception as e:
        print(f"\n✗ CRITICAL ERROR in vision-generate test: {e}")
    
    try:
        results["text-template"] = test_text_template()
    except Exception as e:
        print(f"\n✗ CRITICAL ERROR in text-template test: {e}")
    
    try:
        results["schedule"] = test_schedule()
    except Exception as e:
        print(f"\n✗ CRITICAL ERROR in schedule test: {e}")
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    for endpoint, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{endpoint}: {status}")
    
    all_passed = all(results.values())
    print("\n" + "="*80)
    if all_passed:
        print("🎉 ALL BACKEND TESTS PASSED")
    else:
        print("⚠️  SOME TESTS FAILED")
    print("="*80)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())
