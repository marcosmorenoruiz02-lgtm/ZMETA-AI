#!/usr/bin/env python3
"""
ZMETA-AI / ViralForge Backend - FULL END-TO-END VERIFICATION
Tests all main endpoints and reports PASS/FAIL with detailed error messages.
"""

import requests
import time
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

# Base URL from .env
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

# Test results storage
test_results = []

def log_test(test_name, passed, details="", response_time=None):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "test": test_name,
        "status": status,
        "passed": passed,
        "details": details,
        "response_time": response_time
    }
    test_results.append(result)
    time_str = f" ({response_time:.2f}s)" if response_time else ""
    print(f"{status}{time_str} - {test_name}")
    if details:
        print(f"  Details: {details}")
    print()

def create_test_image(text, width=600, height=300):
    """Create a test image with text using PIL"""
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        font = ImageFont.load_default()
    
    # Calculate text position (center)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) / 2
    y = (height - text_height) / 2
    
    # Draw text
    draw.text((x, y), text, fill='black', font=font)
    
    # Convert to base64 data URL
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def test_analyze_user_mode():
    """TEST 1: POST /api/analyze-and-generate - MODE USER"""
    test_name = "POST /api/analyze-and-generate - MODE USER (@MorrrMorrr63705)"
    
    try:
        payload = {
            "type": "user",
            "query": "@MorrrMorrr63705"
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/analyze-and-generate", json=payload, timeout=150)
        response_time = time.time() - start_time
        
        # Check for Twitter API 402 error (credits exhausted)
        if response.status_code == 402 or (response.status_code >= 400 and "credits" in response.text.lower()):
            log_test(test_name, False, 
                    f"EXTERNAL DEPENDENCY ISSUE: Twitter API credits exhausted (HTTP {response.status_code}). User must recharge. NOT a code bug.",
                    response_time)
            return
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        # Validate personality object
        if "personality" not in data:
            errors.append("Missing 'personality' object")
        
        # Validate analysis.generatedTweets
        if "analysis" not in data or "generatedTweets" not in data["analysis"]:
            errors.append("Missing 'analysis.generatedTweets'")
        else:
            tweets = data["analysis"]["generatedTweets"]
            if len(tweets) != 3:
                errors.append(f"Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
            else:
                # Check each tweet has required fields
                required_fields = ["voiceScore", "hookStrength", "retention", "weakPoint", "thread", "firstSelfReply"]
                for i, tweet in enumerate(tweets):
                    for field in required_fields:
                        if field not in tweet:
                            errors.append(f"Tweet {i+1} missing '{field}'")
                        elif field == "voiceScore" and not isinstance(tweet[field], (int, type(None))):
                            errors.append(f"Tweet {i+1} voiceScore must be numeric or null, got {type(tweet[field])}")
                        elif field == "hookStrength" and not (isinstance(tweet[field], int) and 0 <= tweet[field] <= 100):
                            errors.append(f"Tweet {i+1} hookStrength must be 0-100, got {tweet[field]}")
        
        # Validate growth object
        if "growth" not in data:
            errors.append("Missing 'growth' object")
        elif data["growth"]:
            growth = data["growth"]
            if "topBanners" not in growth or len(growth["topBanners"]) != 3:
                errors.append("growth.topBanners must have 3 items")
            if "loopOutro" not in growth or not growth["loopOutro"]:
                errors.append("growth.loopOutro missing or empty")
            if "replyStrategy" not in growth or not growth["replyStrategy"]:
                errors.append("growth.replyStrategy missing or empty")
        
        # Validate primeTimes
        if "primeTimes" not in data:
            errors.append("Missing 'primeTimes' array")
        
        # Validate metrics
        if "metrics" not in data:
            errors.append("Missing 'metrics' object")
        
        # Validate originalTweets sorted DESC
        if "originalTweets" not in data or len(data["originalTweets"]) == 0:
            errors.append("Missing or empty 'originalTweets'")
        else:
            tweets = data["originalTweets"]
            # Check if sorted by engagement score (descending)
            for i in range(len(tweets) - 1):
                score_a = tweets[i].get("views", 0) * 0.05 + tweets[i].get("likes", 0) + tweets[i].get("retweets", 0) * 2 + tweets[i].get("replies", 0) * 1.5 + tweets[i].get("quotes", 0) * 3
                score_b = tweets[i+1].get("views", 0) * 0.05 + tweets[i+1].get("likes", 0) + tweets[i+1].get("retweets", 0) * 2 + tweets[i+1].get("replies", 0) * 1.5 + tweets[i+1].get("quotes", 0) * 3
                if score_a < score_b:
                    errors.append(f"originalTweets NOT sorted DESC by composite score (position {i} < {i+1})")
                    break
        
        # Check response time
        if response_time >= 55:
            errors.append(f"Response time {response_time:.2f}s exceeds 55s threshold")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"All validations passed. personality present, 3 tweets with all fields, growth/primeTimes/metrics present, originalTweets sorted DESC",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_analyze_topic_mode():
    """TEST 2: POST /api/analyze-and-generate - MODE TOPIC"""
    test_name = "POST /api/analyze-and-generate - MODE TOPIC (Inteligencia Artificial, minFaves=100)"
    
    try:
        payload = {
            "type": "topic",
            "query": "Inteligencia Artificial",
            "minFaves": 100
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/analyze-and-generate", json=payload, timeout=150)
        response_time = time.time() - start_time
        
        # Check for Twitter API 402 error
        if response.status_code == 402 or (response.status_code >= 400 and "credits" in response.text.lower()):
            log_test(test_name, False, 
                    f"EXTERNAL DEPENDENCY ISSUE: Twitter API credits exhausted (HTTP {response.status_code}). User must recharge. NOT a code bug.",
                    response_time)
            return
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        # Validate all originalTweets have likes >= 100
        if "originalTweets" not in data or len(data["originalTweets"]) == 0:
            errors.append("Missing or empty 'originalTweets'")
        else:
            for i, tweet in enumerate(data["originalTweets"]):
                if tweet.get("likes", 0) < 100:
                    errors.append(f"Tweet {i+1} has likes={tweet.get('likes', 0)} < 100 (minFaves filter not working)")
        
        # Validate analysis.generatedTweets
        if "analysis" not in data or "generatedTweets" not in data["analysis"]:
            errors.append("Missing 'analysis.generatedTweets'")
        else:
            tweets = data["analysis"]["generatedTweets"]
            if len(tweets) != 3:
                errors.append(f"Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
        
        # Check response time
        if response_time >= 55:
            errors.append(f"Response time {response_time:.2f}s exceeds 55s threshold")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"All validations passed. All originalTweets have likes >= 100, 3 generatedTweets present",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_vision_generate():
    """TEST 3: POST /api/vision-generate"""
    test_name = "POST /api/vision-generate (PIL image with text)"
    
    try:
        # Create test image
        image_data_url = create_test_image("CURSO DE PYTHON\n50% OFF", 600, 300)
        
        payload = {
            "image": image_data_url
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/vision-generate", json=payload, timeout=150)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        # Validate evidence object
        if "evidence" not in data:
            errors.append("Missing 'evidence' object")
        else:
            evidence = data["evidence"]
            if "evidenceSufficient" not in evidence:
                errors.append("Missing 'evidence.evidenceSufficient'")
            elif evidence["evidenceSufficient"] != True:
                errors.append(f"evidence.evidenceSufficient should be true for image with text, got {evidence['evidenceSufficient']}")
            
            if "usableFacts" not in evidence or len(evidence["usableFacts"]) == 0:
                errors.append("evidence.usableFacts should be non-empty for image with text")
        
        # Validate vision.ocr contains the text
        if "vision" not in data or "ocr" not in data["vision"]:
            errors.append("Missing 'vision.ocr'")
        else:
            ocr_text = data["vision"]["ocr"].upper()
            if "PYTHON" not in ocr_text and "50" not in ocr_text:
                errors.append(f"vision.ocr should contain 'PYTHON' or '50', got: {data['vision']['ocr'][:100]}")
        
        # Validate analysis.generatedTweets
        if "analysis" not in data or "generatedTweets" not in data["analysis"]:
            errors.append("Missing 'analysis.generatedTweets'")
        else:
            tweets = data["analysis"]["generatedTweets"]
            if len(tweets) != 3:
                errors.append(f"Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
            else:
                # Check for hallucination markers
                hallucination_markers = ["el vacío", "vacio es el gancho", "misterio", "introspección", "la nada"]
                for tweet in tweets:
                    text = tweet.get("text", "").lower()
                    for marker in hallucination_markers:
                        if marker in text:
                            errors.append(f"HALLUCINATION DETECTED: Tweet contains '{marker}'")
        
        # Validate growth object
        if "growth" not in data:
            errors.append("Missing 'growth' object")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"All validations passed. evidence.evidenceSufficient=true, usableFacts present, OCR extracted text, 3 tweets, NO hallucinations",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_text_template():
    """TEST 4: POST /api/text-template - all 3 formats"""
    formats = [
        ("thread", "Productividad con IA"),
        ("controversy", "SaaS"),
        ("myth", "Finanzas")
    ]
    
    for format_type, topic in formats:
        test_name = f"POST /api/text-template (format={format_type}, topic={topic})"
        
        try:
            payload = {
                "format": format_type,
                "topic": topic
            }
            
            start_time = time.time()
            response = requests.post(f"{BASE_URL}/text-template", json=payload, timeout=150)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                log_test(test_name, False, 
                        f"HTTP {response.status_code}: {response.text[:200]}", 
                        response_time)
                continue
            
            data = response.json()
            errors = []
            
            # Validate analysis.generatedTweets
            if "analysis" not in data or "generatedTweets" not in data["analysis"]:
                errors.append("Missing 'analysis.generatedTweets'")
            else:
                tweets = data["analysis"]["generatedTweets"]
                if len(tweets) != 3:
                    errors.append(f"Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
                else:
                    # Check each tweet has score fields
                    required_fields = ["hookStrength", "retention", "weakPoint"]
                    for i, tweet in enumerate(tweets):
                        for field in required_fields:
                            if field not in tweet:
                                errors.append(f"Tweet {i+1} missing '{field}'")
            
            if errors:
                log_test(test_name, False, "; ".join(errors), response_time)
            else:
                log_test(test_name, True, 
                        f"All validations passed. 3 tweets with all score fields",
                        response_time)
        
        except Exception as e:
            log_test(test_name, False, f"Exception: {str(e)}")

def test_rewrite():
    """TEST 5: POST /api/rewrite"""
    test_name = "POST /api/rewrite"
    
    try:
        payload = {
            "text": "La IA va a cambiar tu vida.",
            "weakPoint": "Gancho genérico",
            "style": "Directo"
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/rewrite", json=payload, timeout=150)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        # Validate required fields
        required_fields = ["text", "rationale", "hookStrength", "retention", "weakPoint", "metrics"]
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing '{field}'")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"All validations passed. text/rationale/hookStrength/retention/weakPoint/metrics present",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_schedule():
    """TEST 6: POST /api/schedule + GET /api/schedule"""
    
    # POST test
    test_name = "POST /api/schedule"
    try:
        payload = {
            "text": "Tweet de prueba",
            "style": "Directo"
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/schedule", json=payload, timeout=30)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
        else:
            data = response.json()
            errors = []
            
            if "draft" not in data:
                errors.append("Missing 'draft' object")
            if "count" not in data:
                errors.append("Missing 'count' field")
            
            if errors:
                log_test(test_name, False, "; ".join(errors), response_time)
            else:
                log_test(test_name, True, 
                        f"draft and count present",
                        response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
    
    # GET test
    test_name = "GET /api/schedule"
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/schedule", timeout=30)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
        else:
            data = response.json()
            errors = []
            
            if "items" not in data:
                errors.append("Missing 'items' array")
            if "count" not in data:
                errors.append("Missing 'count' field")
            
            if errors:
                log_test(test_name, False, "; ".join(errors), response_time)
            else:
                log_test(test_name, True, 
                        f"items array and count present",
                        response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_alerts():
    """TEST 7: GET /api/alerts"""
    test_name = "GET /api/alerts?topic=Inteligencia Artificial"
    
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/alerts?topic=Inteligencia%20Artificial", timeout=30)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        if "alerts" not in data:
            errors.append("Missing 'alerts' array")
        else:
            alerts = data["alerts"]
            if len(alerts) != 2:
                errors.append(f"Expected 2 alerts (trend + performance), got {len(alerts)}")
            else:
                types = [a.get("type") for a in alerts]
                if "trend" not in types:
                    errors.append("Missing 'trend' type alert")
                if "performance" not in types:
                    errors.append("Missing 'performance' type alert")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"2 alerts present (trend + performance)",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_metrics():
    """TEST 8: GET /api/metrics"""
    test_name = "GET /api/metrics"
    
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/metrics", timeout=30)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        required_fields = ["posts", "diagnostics", "hours_saved"]
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing '{field}'")
            elif not isinstance(data[field], (int, float)):
                errors.append(f"'{field}' must be a number, got {type(data[field])}")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"posts/diagnostics/hours_saved present (all numbers)",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_history():
    """TEST 9: GET /api/history"""
    test_name = "GET /api/history"
    
    try:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/history", timeout=30)
        response_time = time.time() - start_time
        
        if response.status_code != 200:
            log_test(test_name, False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    response_time)
            return
        
        data = response.json()
        errors = []
        
        if not isinstance(data, list):
            errors.append(f"Expected array, got {type(data)}")
        
        if errors:
            log_test(test_name, False, "; ".join(errors), response_time)
        else:
            log_test(test_name, True, 
                    f"Returns array with {len(data)} items",
                    response_time)
    
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def test_validations():
    """TEST 10: Validation tests (400 errors)"""
    
    # Test 1: Invalid type
    test_name = "VALIDATION: POST /api/analyze-and-generate (invalid type)"
    try:
        payload = {"type": "invalid", "query": "x"}
        response = requests.post(f"{BASE_URL}/analyze-and-generate", json=payload, timeout=30)
        
        if response.status_code == 400:
            log_test(test_name, True, f"Correctly returns HTTP 400")
        else:
            log_test(test_name, False, f"Expected HTTP 400, got {response.status_code}")
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
    
    # Test 2: Missing query
    test_name = "VALIDATION: POST /api/analyze-and-generate (missing query)"
    try:
        payload = {"type": "user"}
        response = requests.post(f"{BASE_URL}/analyze-and-generate", json=payload, timeout=30)
        
        if response.status_code == 400:
            log_test(test_name, True, f"Correctly returns HTTP 400")
        else:
            log_test(test_name, False, f"Expected HTTP 400, got {response.status_code}")
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
    
    # Test 3: POST /api/vision-generate empty body
    test_name = "VALIDATION: POST /api/vision-generate (empty body)"
    try:
        payload = {}
        response = requests.post(f"{BASE_URL}/vision-generate", json=payload, timeout=30)
        
        if response.status_code == 400:
            log_test(test_name, True, f"Correctly returns HTTP 400")
        else:
            log_test(test_name, False, f"Expected HTTP 400, got {response.status_code}")
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")
    
    # Test 4: POST /api/schedule empty body
    test_name = "VALIDATION: POST /api/schedule (empty body)"
    try:
        payload = {}
        response = requests.post(f"{BASE_URL}/schedule", json=payload, timeout=30)
        
        if response.status_code == 400:
            log_test(test_name, True, f"Correctly returns HTTP 400")
        else:
            log_test(test_name, False, f"Expected HTTP 400, got {response.status_code}")
    except Exception as e:
        log_test(test_name, False, f"Exception: {str(e)}")

def print_summary():
    """Print final summary table"""
    print("\n" + "="*80)
    print("FINAL SUMMARY - ZMETA-AI / ViralForge Backend Verification")
    print("="*80)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    
    print(f"\nTotal Tests: {len(test_results)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print("\n" + "-"*80)
    print(f"{'TEST NAME':<60} {'STATUS':<10} {'TIME':<10}")
    print("-"*80)
    
    for result in test_results:
        time_str = f"{result['response_time']:.2f}s" if result['response_time'] else "N/A"
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"{result['test']:<60} {status:<10} {time_str:<10}")
    
    print("-"*80)
    
    # Print failed tests details
    if failed > 0:
        print("\n" + "="*80)
        print("FAILED TESTS DETAILS")
        print("="*80)
        for result in test_results:
            if not result["passed"]:
                print(f"\n❌ {result['test']}")
                print(f"   {result['details']}")
    
    print("\n" + "="*80)

if __name__ == "__main__":
    print("="*80)
    print("ZMETA-AI / ViralForge Backend - FULL END-TO-END VERIFICATION")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    print()
    
    # Run all tests
    print("Running tests...\n")
    
    test_analyze_user_mode()
    test_analyze_topic_mode()
    test_vision_generate()
    test_text_template()
    test_rewrite()
    test_schedule()
    test_alerts()
    test_metrics()
    test_history()
    test_validations()
    
    # Print summary
    print_summary()
