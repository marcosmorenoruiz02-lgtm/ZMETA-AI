#!/usr/bin/env python3
"""
Backend API Tests for Viral Tweet Analysis App
Tests the POST /api/analyze-and-generate endpoint and GET /api/history endpoint
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Base URL from .env NEXT_PUBLIC_BASE_URL
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

# Test configuration
TIMEOUT = 90  # seconds - generous timeout for external API calls
HEADERS = {"Content-Type": "application/json"}

def print_section(title: str):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_test(test_name: str):
    """Print test name"""
    print(f"\n▶ TEST: {test_name}")

def print_success(message: str):
    """Print success message"""
    print(f"  ✅ {message}")

def print_error(message: str):
    """Print error message"""
    print(f"  ❌ {message}")

def print_info(message: str):
    """Print info message"""
    print(f"  ℹ️  {message}")

def validate_response_structure(data: Dict[str, Any], test_name: str) -> bool:
    """Validate the response structure for analyze-and-generate endpoint"""
    errors = []
    
    # Check for required top-level fields
    if "originalTweets" not in data:
        errors.append("Missing 'originalTweets' field")
    elif not isinstance(data["originalTweets"], list):
        errors.append("'originalTweets' is not an array")
    elif len(data["originalTweets"]) == 0:
        errors.append("'originalTweets' array is empty")
    else:
        # Validate first tweet structure
        tweet = data["originalTweets"][0]
        required_tweet_fields = ["text", "likes", "retweets", "replies", "views"]
        for field in required_tweet_fields:
            if field not in tweet:
                errors.append(f"Tweet missing '{field}' field")
    
    if "analysis" not in data:
        errors.append("Missing 'analysis' field")
    else:
        analysis = data["analysis"]
        
        # Check patternAnalysis
        if "patternAnalysis" not in analysis:
            errors.append("Missing 'analysis.patternAnalysis' field")
        else:
            pattern = analysis["patternAnalysis"]
            if "summary" not in pattern:
                errors.append("Missing 'analysis.patternAnalysis.summary'")
            if "keyPatterns" not in pattern:
                errors.append("Missing 'analysis.patternAnalysis.keyPatterns'")
            elif not isinstance(pattern["keyPatterns"], list):
                errors.append("'analysis.patternAnalysis.keyPatterns' is not an array")
        
        # Check generatedTweets - MUST be exactly 3
        if "generatedTweets" not in analysis:
            errors.append("Missing 'analysis.generatedTweets' field")
        elif not isinstance(analysis["generatedTweets"], list):
            errors.append("'analysis.generatedTweets' is not an array")
        else:
            gen_tweets = analysis["generatedTweets"]
            if len(gen_tweets) != 3:
                errors.append(f"'analysis.generatedTweets' has {len(gen_tweets)} items, expected EXACTLY 3")
            else:
                # Validate each generated tweet
                for i, gt in enumerate(gen_tweets):
                    if "style" not in gt or not gt["style"]:
                        errors.append(f"generatedTweets[{i}] missing or empty 'style'")
                    if "text" not in gt or not gt["text"]:
                        errors.append(f"generatedTweets[{i}] missing or empty 'text'")
                    if "rationale" not in gt or not gt["rationale"]:
                        errors.append(f"generatedTweets[{i}] missing or empty 'rationale'")
    
    if errors:
        print_error(f"Response structure validation failed for {test_name}:")
        for error in errors:
            print(f"    - {error}")
        return False
    else:
        print_success(f"Response structure is valid for {test_name}")
        return True

def test_mode_user():
    """Test MODE USER (benchmarking) with @MorrrMorrr63705"""
    print_test("MODE USER - Benchmarking (@MorrrMorrr63705)")
    
    payload = {
        "type": "user",
        "query": "@MorrrMorrr63705"
    }
    
    try:
        print_info(f"Sending POST request to {BASE_URL}/analyze-and-generate")
        print_info(f"Payload: {json.dumps(payload)}")
        print_info(f"Timeout: {TIMEOUT}s (external APIs may take 10-40s)")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/analyze-and-generate",
            json=payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print_info(f"Response received in {elapsed:.2f}s")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        
        print_success("Status code is 200")
        
        data = response.json()
        
        # Check for userInfo (specific to user mode)
        if "userInfo" not in data:
            print_error("Missing 'userInfo' field in user mode response")
            return False
        
        user_info = data["userInfo"]
        if "userName" not in user_info or "followers" not in user_info:
            print_error("userInfo missing required fields (userName, followers)")
            return False
        
        print_success(f"userInfo present: @{user_info.get('userName')} with {user_info.get('followers')} followers")
        
        # Validate common structure
        is_valid = validate_response_structure(data, "MODE USER")
        
        if is_valid:
            print_success("MODE USER test PASSED")
            print_info(f"Found {len(data['originalTweets'])} original tweets")
            print_info(f"Generated {len(data['analysis']['generatedTweets'])} tweets")
            return True
        else:
            print_error("MODE USER test FAILED due to structure validation")
            return False
            
    except requests.exceptions.Timeout:
        print_error(f"Request timed out after {TIMEOUT}s")
        return False
    except requests.exceptions.RequestException as e:
        print_error(f"Request failed: {str(e)}")
        return False
    except json.JSONDecodeError as e:
        print_error(f"Failed to parse JSON response: {str(e)}")
        print_info(f"Response text: {response.text[:500]}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

def test_mode_topic():
    """Test MODE TOPIC (topic scraping) with 'Inteligencia Artificial'"""
    print_test("MODE TOPIC - Topic Scraping ('Inteligencia Artificial')")
    
    payload = {
        "type": "topic",
        "query": "Inteligencia Artificial",
        "minFaves": 100
    }
    
    try:
        print_info(f"Sending POST request to {BASE_URL}/analyze-and-generate")
        print_info(f"Payload: {json.dumps(payload)}")
        print_info(f"Timeout: {TIMEOUT}s (external APIs may take 10-40s)")
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/analyze-and-generate",
            json=payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        elapsed = time.time() - start_time
        
        print_info(f"Response received in {elapsed:.2f}s")
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        
        print_success("Status code is 200")
        
        data = response.json()
        
        # Validate common structure
        is_valid = validate_response_structure(data, "MODE TOPIC")
        
        if is_valid:
            print_success("MODE TOPIC test PASSED")
            print_info(f"Found {len(data['originalTweets'])} original tweets")
            print_info(f"Generated {len(data['analysis']['generatedTweets'])} tweets")
            return True
        else:
            print_error("MODE TOPIC test FAILED due to structure validation")
            return False
            
    except requests.exceptions.Timeout:
        print_error(f"Request timed out after {TIMEOUT}s")
        return False
    except requests.exceptions.RequestException as e:
        print_error(f"Request failed: {str(e)}")
        return False
    except json.JSONDecodeError as e:
        print_error(f"Failed to parse JSON response: {str(e)}")
        print_info(f"Response text: {response.text[:500]}")
        return False
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

def test_validation_invalid_type():
    """Test validation with invalid type"""
    print_test("VALIDATION - Invalid type")
    
    payload = {
        "type": "invalid",
        "query": "x"
    }
    
    try:
        print_info(f"Sending POST request with invalid type")
        print_info(f"Payload: {json.dumps(payload)}")
        
        response = requests.post(
            f"{BASE_URL}/analyze-and-generate",
            json=payload,
            headers=HEADERS,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400, got {response.status_code}")
            return False
        
        print_success("Status code is 400 (as expected)")
        
        data = response.json()
        if "error" in data:
            print_success(f"Error message present: {data['error']}")
        
        print_success("VALIDATION (invalid type) test PASSED")
        return True
        
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

def test_validation_missing_query():
    """Test validation with missing query"""
    print_test("VALIDATION - Missing query")
    
    payload = {
        "type": "user"
    }
    
    try:
        print_info(f"Sending POST request with missing query")
        print_info(f"Payload: {json.dumps(payload)}")
        
        response = requests.post(
            f"{BASE_URL}/analyze-and-generate",
            json=payload,
            headers=HEADERS,
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print_error(f"Expected status 400, got {response.status_code}")
            return False
        
        print_success("Status code is 400 (as expected)")
        
        data = response.json()
        if "error" in data:
            print_success(f"Error message present: {data['error']}")
        
        print_success("VALIDATION (missing query) test PASSED")
        return True
        
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

def test_history():
    """Test GET /api/history endpoint"""
    print_test("HISTORY - GET /api/history")
    
    try:
        print_info(f"Sending GET request to {BASE_URL}/history")
        
        response = requests.get(
            f"{BASE_URL}/history",
            timeout=10
        )
        
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print_error(f"Expected status 200, got {response.status_code}")
            return False
        
        print_success("Status code is 200")
        
        data = response.json()
        
        if not isinstance(data, list):
            print_error("Response is not an array")
            return False
        
        print_success(f"Response is an array with {len(data)} items")
        
        if len(data) > 0:
            print_info("History contains saved analyses from previous tests")
            # Check first item structure
            first = data[0]
            if "id" in first and "type" in first and "query" in first:
                print_success("History items have expected structure")
        else:
            print_info("History is empty (no analyses saved yet)")
        
        print_success("HISTORY test PASSED")
        return True
        
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print_section("VIRAL TWEET ANALYSIS APP - BACKEND API TESTS")
    print_info(f"Base URL: {BASE_URL}")
    print_info(f"Timeout: {TIMEOUT}s per request")
    
    results = {}
    
    # Test 1: MODE USER
    print_section("TEST 1: MODE USER (Benchmarking)")
    results["mode_user"] = test_mode_user()
    
    # Test 2: MODE TOPIC
    print_section("TEST 2: MODE TOPIC (Topic Scraping)")
    results["mode_topic"] = test_mode_topic()
    
    # Test 3: VALIDATION - Invalid type
    print_section("TEST 3: VALIDATION - Invalid Type")
    results["validation_invalid_type"] = test_validation_invalid_type()
    
    # Test 4: VALIDATION - Missing query
    print_section("TEST 4: VALIDATION - Missing Query")
    results["validation_missing_query"] = test_validation_missing_query()
    
    # Test 5: HISTORY
    print_section("TEST 5: HISTORY Endpoint")
    results["history"] = test_history()
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("ALL TESTS PASSED")
        return 0
    else:
        print_error(f"{total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
