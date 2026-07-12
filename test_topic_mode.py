#!/usr/bin/env python3
"""
Focused test for MODE TOPIC after fix
Tests only the topic scraping functionality with two different topics
"""

import requests
import json
import sys
import time

# Base URL from .env NEXT_PUBLIC_BASE_URL
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"
TIMEOUT = 90  # Allow up to 90s for external API calls
HEADERS = {"Content-Type": "application/json"}

def print_section(title: str):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_test(test_name: str):
    print(f"\n▶ TEST: {test_name}")

def print_success(message: str):
    print(f"  ✅ {message}")

def print_error(message: str):
    print(f"  ❌ {message}")

def print_info(message: str):
    print(f"  ℹ️  {message}")

def validate_topic_response(data: dict, topic: str) -> tuple[bool, list]:
    """
    Validate MODE TOPIC response structure
    Returns (is_valid, errors)
    """
    errors = []
    
    # Check originalTweets
    if "originalTweets" not in data:
        errors.append("Missing 'originalTweets' field")
    elif not isinstance(data["originalTweets"], list):
        errors.append("'originalTweets' is not an array")
    elif len(data["originalTweets"]) == 0:
        errors.append("'originalTweets' array is EMPTY - no tweets found")
    else:
        # Validate first tweet structure
        tweet = data["originalTweets"][0]
        required_fields = ["text", "likes", "retweets", "replies", "views"]
        for field in required_fields:
            if field not in tweet:
                errors.append(f"Tweet missing '{field}' field")
            elif not isinstance(tweet[field], (int, str)):
                errors.append(f"Tweet '{field}' has invalid type")
        
        print_info(f"Found {len(data['originalTweets'])} original tweets")
    
    # Check analysis
    if "analysis" not in data:
        errors.append("Missing 'analysis' field")
    else:
        analysis = data["analysis"]
        
        # Check generatedTweets - MUST be exactly 3
        if "generatedTweets" not in analysis:
            errors.append("Missing 'analysis.generatedTweets' field")
        elif not isinstance(analysis["generatedTweets"], list):
            errors.append("'analysis.generatedTweets' is not an array")
        else:
            gen_tweets = analysis["generatedTweets"]
            count = len(gen_tweets)
            
            if count != 3:
                errors.append(f"❌ CRITICAL: generatedTweets has {count} items, expected EXACTLY 3")
            else:
                print_success(f"generatedTweets has EXACTLY 3 items ✓")
                
                # Validate each generated tweet
                for i, gt in enumerate(gen_tweets):
                    if "style" not in gt or not gt["style"]:
                        errors.append(f"generatedTweets[{i}] missing or empty 'style'")
                    if "text" not in gt or not gt["text"]:
                        errors.append(f"generatedTweets[{i}] missing or empty 'text'")
                    if "rationale" not in gt or not gt["rationale"]:
                        errors.append(f"generatedTweets[{i}] missing or empty 'rationale'")
                    
                    if not errors:
                        print_info(f"  Tweet {i+1}: style='{gt['style'][:30]}...', text length={len(gt['text'])}, rationale length={len(gt['rationale'])}")
    
    return (len(errors) == 0, errors)

def test_topic(query: str, min_faves: int) -> bool:
    """Test MODE TOPIC with given query"""
    print_test(f"MODE TOPIC - Query: '{query}', minFaves: {min_faves}")
    
    payload = {
        "type": "topic",
        "query": query,
        "minFaves": min_faves
    }
    
    try:
        print_info(f"POST {BASE_URL}/analyze-and-generate")
        print_info(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
        print_info(f"Timeout: {TIMEOUT}s (external APIs: twitterapi.io + Gemini)")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/analyze-and-generate",
            json=payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print_info(f"Response received in {elapsed:.2f}s")
        print_info(f"HTTP Status: {response.status_code}")
        
        # Check status code
        if response.status_code != 200:
            print_error(f"Expected HTTP 200, got {response.status_code}")
            try:
                error_data = response.json()
                print_error(f"Error response: {json.dumps(error_data, ensure_ascii=False)}")
            except:
                print_error(f"Response text: {response.text[:500]}")
            return False
        
        print_success("HTTP 200 OK")
        
        # Parse JSON
        try:
            data = response.json()
        except json.JSONDecodeError as e:
            print_error(f"Failed to parse JSON: {e}")
            print_info(f"Response text: {response.text[:500]}")
            return False
        
        # Validate structure
        is_valid, errors = validate_topic_response(data, query)
        
        if not is_valid:
            print_error(f"Response validation FAILED:")
            for error in errors:
                print(f"    - {error}")
            return False
        
        print_success(f"✅ MODE TOPIC test PASSED for '{query}'")
        return True
        
    except requests.exceptions.Timeout:
        print_error(f"Request TIMED OUT after {TIMEOUT}s")
        print_info("This may indicate slow external API responses or a backend issue")
        return False
    except requests.exceptions.RequestException as e:
        print_error(f"Request failed: {str(e)}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run MODE TOPIC tests"""
    print_section("MODE TOPIC RETEST - After Fix")
    print_info(f"Base URL: {BASE_URL}")
    print_info("Testing two different topics to verify fix")
    
    results = {}
    
    # Test 1: Inteligencia Artificial
    print_section("TEST 1: Topic = 'Inteligencia Artificial'")
    results["inteligencia_artificial"] = test_topic("Inteligencia Artificial", 100)
    
    # Test 2: SaaS
    print_section("TEST 2: Topic = 'SaaS'")
    results["saas"] = test_topic("SaaS", 100)
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("✅ ALL MODE TOPIC TESTS PASSED")
        print_info("Both topics returned HTTP 200 with valid structure")
        print_info("Each response contains originalTweets and EXACTLY 3 generatedTweets")
        return 0
    else:
        print_error(f"❌ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
