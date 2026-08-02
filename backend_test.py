#!/usr/bin/env python3
"""
ZMETA-AI Backend Testing - Digital Personality + Voice Validation
Tests the upgraded analysis engine with personality extraction and voiceScore validation.
"""

import requests
import json
import time
import sys

# Base URL from .env
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

def log(msg):
    print(f"[TEST] {msg}")

def test_user_mode_personality():
    """
    TEST 1: USER MODE - Digital Personality + Voice Score
    POST /api/analyze-and-generate with type=user
    """
    log("=" * 80)
    log("TEST 1: USER MODE - Digital Personality + Voice Score")
    log("=" * 80)
    
    url = f"{BASE_URL}/analyze-and-generate"
    payload = {
        "type": "user",
        "query": "@MorrrMorrr63705"
    }
    
    try:
        log(f"POST {url}")
        log(f"Payload: {json.dumps(payload, indent=2)}")
        start = time.time()
        response = requests.post(url, json=payload, timeout=150)
        elapsed = time.time() - start
        log(f"Response time: {elapsed:.2f}s (allowed up to 150s)")
        log(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"❌ FAILED - Expected 200, got {response.status_code}")
            log(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # VALIDATION 1: Personality object exists at top level
        if "personality" not in data:
            log("❌ FAILED - Missing 'personality' object at top level")
            return False
        
        personality = data["personality"]
        log(f"✅ Personality object present")
        
        # VALIDATION 2: Check personality keys
        required_keys = [
            "tono_general", "nivel_humor", "nivel_ironia", "nivel_sarcasmo",
            "ritmo_escritura", "estructura_habitual", "uso_emojis",
            "objetivo_principal", "personalidad_global"
        ]
        
        missing_keys = []
        empty_keys = []
        for key in required_keys:
            if key not in personality:
                missing_keys.append(key)
            elif not personality[key] or personality[key] == "":
                empty_keys.append(key)
        
        if missing_keys:
            log(f"❌ FAILED - Missing personality keys: {missing_keys}")
            return False
        
        log(f"✅ All required personality keys present: {required_keys}")
        
        # Check for non-empty values (some may be "n/d" which is acceptable)
        non_empty_count = sum(1 for k in required_keys if personality.get(k) and personality[k] != "")
        log(f"✅ Non-empty personality keys: {non_empty_count}/{len(required_keys)}")
        
        # Special check: personalidad_global should be a real sentence
        personalidad_global = personality.get("personalidad_global", "")
        if len(personalidad_global) < 10:
            log(f"⚠️  WARNING - personalidad_global seems too short: '{personalidad_global}'")
        else:
            log(f"✅ personalidad_global is a real sentence: '{personalidad_global[:100]}...'")
        
        # VALIDATION 3: analysis.generatedTweets = exactly 3
        if "analysis" not in data or "generatedTweets" not in data["analysis"]:
            log("❌ FAILED - Missing analysis.generatedTweets")
            return False
        
        generated_tweets = data["analysis"]["generatedTweets"]
        if len(generated_tweets) != 3:
            log(f"❌ FAILED - Expected exactly 3 generatedTweets, got {len(generated_tweets)}")
            return False
        
        log(f"✅ analysis.generatedTweets has exactly 3 items")
        
        # VALIDATION 4: Each tweet has voiceScore (numeric 0-100)
        for i, tweet in enumerate(generated_tweets):
            # Check voiceScore
            if "voiceScore" not in tweet:
                log(f"❌ FAILED - Tweet #{i} missing 'voiceScore' field")
                return False
            
            voice_score = tweet["voiceScore"]
            if voice_score is None:
                log(f"⚠️  WARNING - Tweet #{i} has voiceScore=null (validation may have failed)")
            elif not isinstance(voice_score, (int, float)):
                log(f"❌ FAILED - Tweet #{i} voiceScore is not numeric: {type(voice_score)}")
                return False
            elif voice_score < 0 or voice_score > 100:
                log(f"❌ FAILED - Tweet #{i} voiceScore out of range: {voice_score}")
                return False
            else:
                log(f"✅ Tweet #{i} has valid voiceScore: {voice_score}")
            
            # Check previously verified fields
            required_fields = ["style", "text", "rationale", "hookStrength", "retention", "weakPoint", "thread", "firstSelfReply"]
            for field in required_fields:
                if field not in tweet:
                    log(f"❌ FAILED - Tweet #{i} missing field: {field}")
                    return False
        
        log(f"✅ All 3 tweets have voiceScore + all required fields")
        
        # VALIDATION 5: Regression checks
        # Check growth object
        if "growth" not in data:
            log("❌ FAILED - Missing 'growth' object")
            return False
        
        growth = data["growth"]
        if "topBanners" not in growth or len(growth["topBanners"]) != 3:
            log(f"❌ FAILED - growth.topBanners should have 3 items")
            return False
        if "loopOutro" not in growth or not growth["loopOutro"]:
            log(f"❌ FAILED - growth.loopOutro missing or empty")
            return False
        if "replyStrategy" not in growth or not growth["replyStrategy"]:
            log(f"❌ FAILED - growth.replyStrategy missing or empty")
            return False
        
        log(f"✅ growth object present with topBanners (3), loopOutro, replyStrategy")
        
        # Check primeTimes
        if "primeTimes" not in data:
            log("❌ FAILED - Missing 'primeTimes' array")
            return False
        
        prime_times = data["primeTimes"]
        if not isinstance(prime_times, list):
            log(f"❌ FAILED - primeTimes should be array")
            return False
        
        log(f"✅ primeTimes array present with {len(prime_times)} items")
        
        # Check metrics
        if "metrics" not in data:
            log("❌ FAILED - Missing 'metrics' object")
            return False
        
        log(f"✅ metrics object present")
        
        # Check originalTweets sorted DESC by composite score
        if "originalTweets" not in data:
            log("❌ FAILED - Missing 'originalTweets' array")
            return False
        
        original_tweets = data["originalTweets"]
        if len(original_tweets) == 0:
            log("⚠️  WARNING - originalTweets is empty")
        else:
            # Calculate composite scores
            scores = []
            for t in original_tweets:
                score = (t.get("views", 0) * 0.05 + 
                        t.get("likes", 0) * 1 + 
                        t.get("retweets", 0) * 2 + 
                        t.get("replies", 0) * 1.5 + 
                        t.get("quotes", 0) * 3)
                scores.append(score)
            
            # Check if sorted DESC
            is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
            if not is_sorted:
                log(f"❌ FAILED - originalTweets NOT sorted DESC by composite score: {scores}")
                return False
            
            log(f"✅ originalTweets sorted DESC by composite score: {scores[:5]}")
        
        log("=" * 80)
        log("✅ TEST 1 PASSED - USER MODE with personality + voiceScore working")
        log("=" * 80)
        return True
        
    except requests.exceptions.Timeout:
        log(f"❌ FAILED - Request timeout (>150s)")
        return False
    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_topic_mode_personality():
    """
    TEST 2: TOPIC MODE - Digital Personality + Voice Score
    POST /api/analyze-and-generate with type=topic
    """
    log("=" * 80)
    log("TEST 2: TOPIC MODE - Digital Personality + Voice Score")
    log("=" * 80)
    
    url = f"{BASE_URL}/analyze-and-generate"
    payload = {
        "type": "topic",
        "query": "Inteligencia Artificial",
        "minFaves": 100
    }
    
    try:
        log(f"POST {url}")
        log(f"Payload: {json.dumps(payload, indent=2)}")
        start = time.time()
        response = requests.post(url, json=payload, timeout=150)
        elapsed = time.time() - start
        log(f"Response time: {elapsed:.2f}s (allowed up to 150s)")
        log(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"❌ FAILED - Expected 200, got {response.status_code}")
            log(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # VALIDATION 1: Personality object exists
        if "personality" not in data:
            log("❌ FAILED - Missing 'personality' object at top level")
            return False
        
        log(f"✅ Personality object present")
        
        # VALIDATION 2: Each generatedTweet has numeric voiceScore
        if "analysis" not in data or "generatedTweets" not in data["analysis"]:
            log("❌ FAILED - Missing analysis.generatedTweets")
            return False
        
        generated_tweets = data["analysis"]["generatedTweets"]
        if len(generated_tweets) != 3:
            log(f"❌ FAILED - Expected exactly 3 generatedTweets, got {len(generated_tweets)}")
            return False
        
        for i, tweet in enumerate(generated_tweets):
            if "voiceScore" not in tweet:
                log(f"❌ FAILED - Tweet #{i} missing 'voiceScore' field")
                return False
            
            voice_score = tweet["voiceScore"]
            if voice_score is None:
                log(f"⚠️  WARNING - Tweet #{i} has voiceScore=null")
            elif not isinstance(voice_score, (int, float)):
                log(f"❌ FAILED - Tweet #{i} voiceScore is not numeric: {type(voice_score)}")
                return False
            else:
                log(f"✅ Tweet #{i} has valid voiceScore: {voice_score}")
        
        # VALIDATION 3: growth + primeTimes present
        if "growth" not in data:
            log("❌ FAILED - Missing 'growth' object")
            return False
        
        if "primeTimes" not in data:
            log("❌ FAILED - Missing 'primeTimes' array")
            return False
        
        log(f"✅ growth and primeTimes present")
        
        log("=" * 80)
        log("✅ TEST 2 PASSED - TOPIC MODE with personality + voiceScore working")
        log("=" * 80)
        return True
        
    except requests.exceptions.Timeout:
        log(f"❌ FAILED - Request timeout (>150s)")
        return False
    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_text_template_regression():
    """
    TEST 3: Regression - POST /api/text-template
    """
    log("=" * 80)
    log("TEST 3: Regression - POST /api/text-template")
    log("=" * 80)
    
    url = f"{BASE_URL}/text-template"
    payload = {
        "format": "myth",
        "topic": "SaaS"
    }
    
    try:
        log(f"POST {url}")
        log(f"Payload: {json.dumps(payload, indent=2)}")
        start = time.time()
        response = requests.post(url, json=payload, timeout=30)
        elapsed = time.time() - start
        log(f"Response time: {elapsed:.2f}s")
        log(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"❌ FAILED - Expected 200, got {response.status_code}")
            log(f"Response: {response.text[:500]}")
            return False
        
        data = response.json()
        
        # Check structure
        if "analysis" not in data or "generatedTweets" not in data["analysis"]:
            log("❌ FAILED - Missing analysis.generatedTweets")
            return False
        
        generated_tweets = data["analysis"]["generatedTweets"]
        if len(generated_tweets) != 3:
            log(f"❌ FAILED - Expected 3 tweets, got {len(generated_tweets)}")
            return False
        
        # Check each tweet has required fields
        for i, tweet in enumerate(generated_tweets):
            required_fields = ["text", "firstSelfReply", "thread"]
            for field in required_fields:
                if field not in tweet:
                    log(f"❌ FAILED - Tweet #{i} missing field: {field}")
                    return False
        
        log(f"✅ text-template returns 3 tweets with firstSelfReply + thread")
        
        log("=" * 80)
        log("✅ TEST 3 PASSED - text-template regression OK")
        log("=" * 80)
        return True
        
    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_metrics_regression():
    """
    TEST 4: Regression - GET /api/metrics
    """
    log("=" * 80)
    log("TEST 4: Regression - GET /api/metrics")
    log("=" * 80)
    
    url = f"{BASE_URL}/metrics"
    
    try:
        log(f"GET {url}")
        response = requests.get(url, timeout=10)
        log(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"❌ FAILED - Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check structure
        required_fields = ["posts", "diagnostics", "hours_saved"]
        for field in required_fields:
            if field not in data:
                log(f"❌ FAILED - Missing field: {field}")
                return False
        
        log(f"✅ metrics endpoint returns: {data}")
        
        log("=" * 80)
        log("✅ TEST 4 PASSED - metrics regression OK")
        log("=" * 80)
        return True
        
    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_schedule_regression():
    """
    TEST 5: Regression - GET /api/schedule
    """
    log("=" * 80)
    log("TEST 5: Regression - GET /api/schedule")
    log("=" * 80)
    
    url = f"{BASE_URL}/schedule"
    
    try:
        log(f"GET {url}")
        response = requests.get(url, timeout=10)
        log(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            log(f"❌ FAILED - Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        # Check structure
        if "items" not in data or "count" not in data:
            log(f"❌ FAILED - Missing items or count field")
            return False
        
        log(f"✅ schedule endpoint returns: items={len(data['items'])}, count={data['count']}")
        
        log("=" * 80)
        log("✅ TEST 5 PASSED - schedule regression OK")
        log("=" * 80)
        return True
        
    except Exception as e:
        log(f"❌ FAILED - Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    log("Starting ZMETA-AI Backend Testing - Digital Personality + Voice Validation")
    log(f"Base URL: {BASE_URL}")
    log("")
    
    results = []
    
    # Run all tests
    results.append(("USER MODE - Personality + VoiceScore", test_user_mode_personality()))
    results.append(("TOPIC MODE - Personality + VoiceScore", test_topic_mode_personality()))
    results.append(("Regression: text-template", test_text_template_regression()))
    results.append(("Regression: metrics", test_metrics_regression()))
    results.append(("Regression: schedule", test_schedule_regression()))
    
    # Summary
    log("")
    log("=" * 80)
    log("FINAL SUMMARY")
    log("=" * 80)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        log(f"{status} - {test_name}")
    
    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)
    
    log("")
    log(f"Total: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        log("🎉 ALL TESTS PASSED")
        sys.exit(0)
    else:
        log("⚠️  SOME TESTS FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
