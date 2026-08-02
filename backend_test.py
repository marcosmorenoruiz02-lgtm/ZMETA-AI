#!/usr/bin/env python3
"""
Backend API Test for ZMETA-AI / ViralForge
Testing BUG FIX: Server connection error due to timeout
"""
import requests
import time
import json
import sys

BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

def test_analyze_user_mode():
    """Test POST /api/analyze-and-generate - MODE USER"""
    print("\n" + "="*80)
    print("TEST 1: POST /api/analyze-and-generate - MODE USER")
    print("="*80)
    
    url = f"{BASE_URL}/analyze-and-generate"
    payload = {
        "type": "user",
        "query": "@MorrrMorrr63705"
    }
    
    print(f"Request: POST {url}")
    print(f"Body: {json.dumps(payload, indent=2)}")
    
    try:
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=150)
        elapsed_time = time.time() - start_time
        
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"⏱️  RESPONSE TIME: {elapsed_time:.2f} seconds")
        
        if elapsed_time >= 55:
            print(f"⚠️  WARNING: Response time {elapsed_time:.2f}s is >= 55s (may exceed proxy timeout)")
        elif elapsed_time >= 45:
            print(f"⚠️  CAUTION: Response time {elapsed_time:.2f}s is >= 45s (close to timeout threshold)")
        else:
            print(f"✅ GOOD: Response time {elapsed_time:.2f}s is under 45s (safe margin)")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check personality object
            print("\n--- Checking personality object ---")
            if "personality" in data and data["personality"]:
                personality = data["personality"]
                required_keys = ["tono_general", "personalidad_global"]
                missing_keys = [k for k in required_keys if k not in personality or not personality[k]]
                if missing_keys:
                    print(f"❌ FAIL: personality missing keys: {missing_keys}")
                    return False
                print(f"✅ personality object present with required keys")
                print(f"   - tono_general: {personality.get('tono_general', 'N/A')[:50]}...")
                print(f"   - personalidad_global: {personality.get('personalidad_global', 'N/A')[:80]}...")
            else:
                print(f"❌ FAIL: personality object missing or null")
                return False
            
            # Check analysis.generatedTweets
            print("\n--- Checking analysis.generatedTweets ---")
            if "analysis" not in data or "generatedTweets" not in data["analysis"]:
                print(f"❌ FAIL: analysis.generatedTweets not found")
                return False
            
            tweets = data["analysis"]["generatedTweets"]
            if len(tweets) != 3:
                print(f"❌ FAIL: Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
                return False
            print(f"✅ analysis.generatedTweets has EXACTLY 3 items")
            
            # Check each tweet for voiceScore and other fields
            print("\n--- Checking each generatedTweet ---")
            for i, tweet in enumerate(tweets):
                print(f"\nTweet #{i+1}:")
                
                # Check voiceScore (CRITICAL)
                if "voiceScore" not in tweet:
                    print(f"  ❌ FAIL: voiceScore field missing")
                    return False
                
                voice_score = tweet["voiceScore"]
                if not isinstance(voice_score, (int, float)) or voice_score < 0 or voice_score > 100:
                    print(f"  ❌ FAIL: voiceScore must be numeric 0-100, got: {voice_score} (type: {type(voice_score)})")
                    return False
                print(f"  ✅ voiceScore: {voice_score} (valid numeric 0-100)")
                
                # Check other required fields
                required_fields = ["style", "text", "rationale", "hookStrength", "retention", "weakPoint", "thread"]
                for field in required_fields:
                    if field not in tweet:
                        print(f"  ❌ FAIL: {field} field missing")
                        return False
                    
                    if field == "hookStrength":
                        if not isinstance(tweet[field], (int, float)) or tweet[field] < 0 or tweet[field] > 100:
                            print(f"  ❌ FAIL: hookStrength must be numeric 0-100, got: {tweet[field]}")
                            return False
                    elif field == "retention":
                        if tweet[field] not in ["Alta", "Media", "Baja"]:
                            print(f"  ❌ FAIL: retention must be Alta/Media/Baja, got: {tweet[field]}")
                            return False
                    elif field == "thread":
                        if not isinstance(tweet[field], list):
                            print(f"  ❌ FAIL: thread must be array, got: {type(tweet[field])}")
                            return False
                    elif field in ["style", "text", "rationale", "weakPoint"]:
                        if not isinstance(tweet[field], str) or not tweet[field]:
                            print(f"  ❌ FAIL: {field} must be non-empty string")
                            return False
                
                print(f"  ✅ All required fields present: {', '.join(required_fields)}")
            
            # Check REGRESSION: growth object
            print("\n--- Checking REGRESSION: growth object ---")
            if "growth" not in data or not data["growth"]:
                print(f"❌ FAIL: growth object missing")
                return False
            
            growth = data["growth"]
            if "topBanners" not in growth or not isinstance(growth["topBanners"], list) or len(growth["topBanners"]) != 3:
                print(f"❌ FAIL: growth.topBanners must be array with 3 items")
                return False
            if "loopOutro" not in growth or not growth["loopOutro"]:
                print(f"❌ FAIL: growth.loopOutro missing or empty")
                return False
            if "replyStrategy" not in growth or not growth["replyStrategy"]:
                print(f"❌ FAIL: growth.replyStrategy missing or empty")
                return False
            print(f"✅ growth object present with topBanners (3), loopOutro, replyStrategy")
            
            # Check REGRESSION: primeTimes array
            print("\n--- Checking REGRESSION: primeTimes array ---")
            if "primeTimes" not in data or not isinstance(data["primeTimes"], list):
                print(f"❌ FAIL: primeTimes must be array")
                return False
            print(f"✅ primeTimes array present with {len(data['primeTimes'])} items")
            
            # Check REGRESSION: metrics object
            print("\n--- Checking REGRESSION: metrics object ---")
            if "metrics" not in data or not data["metrics"]:
                print(f"❌ FAIL: metrics object missing")
                return False
            print(f"✅ metrics object present")
            
            # Check REGRESSION: originalTweets sorted DESCENDING
            print("\n--- Checking REGRESSION: originalTweets sorting ---")
            if "originalTweets" not in data or not isinstance(data["originalTweets"], list):
                print(f"❌ FAIL: originalTweets must be array")
                return False
            
            original_tweets = data["originalTweets"]
            if len(original_tweets) > 1:
                # Calculate composite scores
                def composite_score(t):
                    return (t.get("views", 0) * 0.05 + 
                           t.get("likes", 0) * 1 + 
                           t.get("retweets", 0) * 2 + 
                           t.get("replies", 0) * 1.5 + 
                           t.get("quotes", 0) * 3)
                
                scores = [composite_score(t) for t in original_tweets]
                is_descending = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
                
                if not is_descending:
                    print(f"❌ FAIL: originalTweets not sorted DESCENDING by composite score")
                    print(f"   Scores: {scores}")
                    return False
                print(f"✅ originalTweets sorted DESCENDING by composite score: {scores[:5]}")
            else:
                print(f"✅ originalTweets has {len(original_tweets)} items (sorting check skipped)")
            
            print("\n" + "="*80)
            print("✅ TEST 1 PASSED - MODE USER")
            print(f"⏱️  FINAL RESPONSE TIME: {elapsed_time:.2f} seconds")
            print("="*80)
            return True
        
        elif response.status_code == 402:
            print(f"⚠️  EXTERNAL DEPENDENCY ISSUE: Twitter API credits exhausted (402)")
            print(f"Response: {response.text}")
            return "SKIP"
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        elapsed_time = time.time() - start_time
        print(f"❌ FAIL: Request timed out after {elapsed_time:.2f} seconds")
        return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False


def test_analyze_topic_mode():
    """Test POST /api/analyze-and-generate - MODE TOPIC"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/analyze-and-generate - MODE TOPIC")
    print("="*80)
    
    url = f"{BASE_URL}/analyze-and-generate"
    payload = {
        "type": "topic",
        "query": "Inteligencia Artificial",
        "minFaves": 100
    }
    
    print(f"Request: POST {url}")
    print(f"Body: {json.dumps(payload, indent=2)}")
    
    try:
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=150)
        elapsed_time = time.time() - start_time
        
        print(f"\n✅ Response Status: {response.status_code}")
        print(f"⏱️  RESPONSE TIME: {elapsed_time:.2f} seconds")
        
        if elapsed_time >= 55:
            print(f"⚠️  WARNING: Response time {elapsed_time:.2f}s is >= 55s (may exceed proxy timeout)")
        elif elapsed_time >= 45:
            print(f"⚠️  CAUTION: Response time {elapsed_time:.2f}s is >= 45s (close to timeout threshold)")
        else:
            print(f"✅ GOOD: Response time {elapsed_time:.2f}s is under 45s (safe margin)")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check personality object
            print("\n--- Checking personality object ---")
            if "personality" in data and data["personality"]:
                personality = data["personality"]
                required_keys = ["tono_general", "personalidad_global"]
                missing_keys = [k for k in required_keys if k not in personality or not personality[k]]
                if missing_keys:
                    print(f"❌ FAIL: personality missing keys: {missing_keys}")
                    return False
                print(f"✅ personality object present with required keys")
                print(f"   - tono_general: {personality.get('tono_general', 'N/A')[:50]}...")
                print(f"   - personalidad_global: {personality.get('personalidad_global', 'N/A')[:80]}...")
            else:
                print(f"❌ FAIL: personality object missing or null")
                return False
            
            # Check analysis.generatedTweets
            print("\n--- Checking analysis.generatedTweets ---")
            if "analysis" not in data or "generatedTweets" not in data["analysis"]:
                print(f"❌ FAIL: analysis.generatedTweets not found")
                return False
            
            tweets = data["analysis"]["generatedTweets"]
            if len(tweets) != 3:
                print(f"❌ FAIL: Expected EXACTLY 3 generatedTweets, got {len(tweets)}")
                return False
            print(f"✅ analysis.generatedTweets has EXACTLY 3 items")
            
            # Check each tweet for voiceScore and other fields
            print("\n--- Checking each generatedTweet ---")
            for i, tweet in enumerate(tweets):
                print(f"\nTweet #{i+1}:")
                
                # Check voiceScore (CRITICAL)
                if "voiceScore" not in tweet:
                    print(f"  ❌ FAIL: voiceScore field missing")
                    return False
                
                voice_score = tweet["voiceScore"]
                if not isinstance(voice_score, (int, float)) or voice_score < 0 or voice_score > 100:
                    print(f"  ❌ FAIL: voiceScore must be numeric 0-100, got: {voice_score} (type: {type(voice_score)})")
                    return False
                print(f"  ✅ voiceScore: {voice_score} (valid numeric 0-100)")
                
                # Check other required fields
                required_fields = ["style", "text", "rationale", "hookStrength", "retention", "weakPoint", "thread"]
                for field in required_fields:
                    if field not in tweet:
                        print(f"  ❌ FAIL: {field} field missing")
                        return False
                    
                    if field == "hookStrength":
                        if not isinstance(tweet[field], (int, float)) or tweet[field] < 0 or tweet[field] > 100:
                            print(f"  ❌ FAIL: hookStrength must be numeric 0-100, got: {tweet[field]}")
                            return False
                    elif field == "retention":
                        if tweet[field] not in ["Alta", "Media", "Baja"]:
                            print(f"  ❌ FAIL: retention must be Alta/Media/Baja, got: {tweet[field]}")
                            return False
                    elif field == "thread":
                        if not isinstance(tweet[field], list):
                            print(f"  ❌ FAIL: thread must be array, got: {type(tweet[field])}")
                            return False
                    elif field in ["style", "text", "rationale", "weakPoint"]:
                        if not isinstance(tweet[field], str) or not tweet[field]:
                            print(f"  ❌ FAIL: {field} must be non-empty string")
                            return False
                
                print(f"  ✅ All required fields present: {', '.join(required_fields)}")
            
            # Check REGRESSION: growth object
            print("\n--- Checking REGRESSION: growth object ---")
            if "growth" not in data or not data["growth"]:
                print(f"❌ FAIL: growth object missing")
                return False
            
            growth = data["growth"]
            if "topBanners" not in growth or not isinstance(growth["topBanners"], list) or len(growth["topBanners"]) != 3:
                print(f"❌ FAIL: growth.topBanners must be array with 3 items")
                return False
            if "loopOutro" not in growth or not growth["loopOutro"]:
                print(f"❌ FAIL: growth.loopOutro missing or empty")
                return False
            if "replyStrategy" not in growth or not growth["replyStrategy"]:
                print(f"❌ FAIL: growth.replyStrategy missing or empty")
                return False
            print(f"✅ growth object present with topBanners (3), loopOutro, replyStrategy")
            
            # Check REGRESSION: primeTimes array
            print("\n--- Checking REGRESSION: primeTimes array ---")
            if "primeTimes" not in data or not isinstance(data["primeTimes"], list):
                print(f"❌ FAIL: primeTimes must be array")
                return False
            print(f"✅ primeTimes array present with {len(data['primeTimes'])} items")
            
            # Check REGRESSION: metrics object
            print("\n--- Checking REGRESSION: metrics object ---")
            if "metrics" not in data or not data["metrics"]:
                print(f"❌ FAIL: metrics object missing")
                return False
            print(f"✅ metrics object present")
            
            # Check REGRESSION: originalTweets sorted DESCENDING
            print("\n--- Checking REGRESSION: originalTweets sorting ---")
            if "originalTweets" not in data or not isinstance(data["originalTweets"], list):
                print(f"❌ FAIL: originalTweets must be array")
                return False
            
            original_tweets = data["originalTweets"]
            if len(original_tweets) > 1:
                # Calculate composite scores
                def composite_score(t):
                    return (t.get("views", 0) * 0.05 + 
                           t.get("likes", 0) * 1 + 
                           t.get("retweets", 0) * 2 + 
                           t.get("replies", 0) * 1.5 + 
                           t.get("quotes", 0) * 3)
                
                scores = [composite_score(t) for t in original_tweets]
                is_descending = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
                
                if not is_descending:
                    print(f"❌ FAIL: originalTweets not sorted DESCENDING by composite score")
                    print(f"   Scores: {scores}")
                    return False
                print(f"✅ originalTweets sorted DESCENDING by composite score: {scores[:5]}")
            else:
                print(f"✅ originalTweets has {len(original_tweets)} items (sorting check skipped)")
            
            print("\n" + "="*80)
            print("✅ TEST 2 PASSED - MODE TOPIC")
            print(f"⏱️  FINAL RESPONSE TIME: {elapsed_time:.2f} seconds")
            print("="*80)
            return True
        
        elif response.status_code == 402:
            print(f"⚠️  EXTERNAL DEPENDENCY ISSUE: Twitter API credits exhausted (402)")
            print(f"Response: {response.text}")
            return "SKIP"
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        elapsed_time = time.time() - start_time
        print(f"❌ FAIL: Request timed out after {elapsed_time:.2f} seconds")
        return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False


if __name__ == "__main__":
    print("\n" + "="*80)
    print("ZMETA-AI / ViralForge - BUG FIX VERIFICATION")
    print("Testing: Server connection error fix (timeout reduction)")
    print("="*80)
    
    results = []
    
    # Test MODE USER
    result1 = test_analyze_user_mode()
    results.append(("MODE USER", result1))
    
    # Test MODE TOPIC
    result2 = test_analyze_topic_mode()
    results.append(("MODE TOPIC", result2))
    
    # Summary
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    for test_name, result in results:
        if result == True:
            print(f"✅ {test_name}: PASSED")
        elif result == "SKIP":
            print(f"⚠️  {test_name}: SKIPPED (external dependency issue)")
        else:
            print(f"❌ {test_name}: FAILED")
    
    # Exit code
    all_passed = all(r == True or r == "SKIP" for _, r in results)
    if all_passed:
        print("\n✅ ALL TESTS PASSED OR SKIPPED (external issues)")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)
