#!/usr/bin/env python3
"""
Backend API Tests for ZMETA-AI Viral Tweet App
Tests new endpoints: /api/alerts, /api/metrics, score fields in analyze-and-generate, /api/rewrite
"""

import requests
import json
import time
from urllib.parse import urlencode

# Base URL from .env
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

def test_alerts():
    """Test 1: GET /api/alerts?topic=Inteligencia%20Artificial"""
    print("\n" + "="*80)
    print("TEST 1: GET /api/alerts?topic=Inteligencia%20Artificial")
    print("="*80)
    
    try:
        topic = "Inteligencia Artificial"
        url = f"{BASE_URL}/alerts?topic={requests.utils.quote(topic)}"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        # Verify structure
        if "alerts" not in data:
            print("❌ FAILED: Response missing 'alerts' field")
            return False
        
        alerts = data["alerts"]
        if not isinstance(alerts, list):
            print("❌ FAILED: 'alerts' is not an array")
            return False
        
        if len(alerts) < 2:
            print(f"❌ FAILED: Expected at least 2 alerts, got {len(alerts)}")
            return False
        
        # Check for trend and performance types
        types = [a.get("type") for a in alerts]
        if "trend" not in types:
            print("❌ FAILED: No alert with type 'trend'")
            return False
        if "performance" not in types:
            print("❌ FAILED: No alert with type 'performance'")
            return False
        
        # Verify each alert has required fields
        for i, alert in enumerate(alerts):
            required_fields = ["id", "type", "title", "message"]
            for field in required_fields:
                if field not in alert:
                    print(f"❌ FAILED: Alert {i} missing field '{field}'")
                    return False
                if not alert[field]:
                    print(f"❌ FAILED: Alert {i} field '{field}' is empty")
                    return False
        
        # Verify trend message mentions the topic
        trend_alert = next((a for a in alerts if a["type"] == "trend"), None)
        if trend_alert:
            if topic not in trend_alert["message"]:
                print(f"❌ FAILED: Trend message does not mention topic '{topic}'")
                print(f"Message: {trend_alert['message']}")
                return False
        
        print("✅ PASSED: All validations passed")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_metrics():
    """Test 2: GET /api/metrics"""
    print("\n" + "="*80)
    print("TEST 2: GET /api/metrics")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/metrics"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify required fields
        required_fields = ["posts", "diagnostics", "hours_saved"]
        for field in required_fields:
            if field not in data:
                print(f"❌ FAILED: Response missing field '{field}'")
                return False, None
        
        posts = data["posts"]
        diagnostics = data["diagnostics"]
        hours_saved = data["hours_saved"]
        
        # Verify types
        if not isinstance(posts, (int, float)):
            print(f"❌ FAILED: 'posts' is not a number: {type(posts)}")
            return False, None
        if not isinstance(diagnostics, (int, float)):
            print(f"❌ FAILED: 'diagnostics' is not a number: {type(diagnostics)}")
            return False, None
        if not isinstance(hours_saved, (int, float)):
            print(f"❌ FAILED: 'hours_saved' is not a number: {type(hours_saved)}")
            return False, None
        
        # Verify formula: hours_saved = posts * 0.5 + diagnostics * 0.25
        expected_hours = round(posts * 0.5 + diagnostics * 0.25, 2)
        if abs(hours_saved - expected_hours) > 0.01:
            print(f"❌ FAILED: hours_saved formula incorrect")
            print(f"Expected: {expected_hours} (posts={posts} * 0.5 + diagnostics={diagnostics} * 0.25)")
            print(f"Got: {hours_saved}")
            return False, None
        
        print("✅ PASSED: All validations passed")
        return True, data
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None


def test_analyze_and_generate_with_scores():
    """Test 3: POST /api/analyze-and-generate with score fields validation"""
    print("\n" + "="*80)
    print("TEST 3: POST /api/analyze-and-generate (verify score fields)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/analyze-and-generate"
        print(f"URL: {url}")
        
        payload = {
            "type": "user",
            "query": "@MorrrMorrr63705"
        }
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        print("Sending request (may take up to 90s for external LLM/Twitter calls)...")
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=120)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify analysis field exists
        if "analysis" not in data:
            print("❌ FAILED: Response missing 'analysis' field")
            return False, None
        
        analysis = data["analysis"]
        
        # Verify generatedTweets exists and has exactly 3 items
        if "generatedTweets" not in analysis:
            print("❌ FAILED: analysis missing 'generatedTweets' field")
            return False, None
        
        generated_tweets = analysis["generatedTweets"]
        if not isinstance(generated_tweets, list):
            print("❌ FAILED: generatedTweets is not an array")
            return False, None
        
        if len(generated_tweets) != 3:
            print(f"❌ FAILED: Expected exactly 3 generatedTweets, got {len(generated_tweets)}")
            return False, None
        
        print(f"✓ generatedTweets has exactly 3 items")
        
        # Verify EACH tweet has the NEW score fields
        required_fields = ["style", "text", "rationale", "hookStrength", "retention", "weakPoint"]
        for i, tweet in enumerate(generated_tweets):
            print(f"\nValidating generatedTweet #{i+1}:")
            print(f"  Fields: {list(tweet.keys())}")
            
            for field in required_fields:
                if field not in tweet:
                    print(f"❌ FAILED: generatedTweet #{i+1} missing field '{field}'")
                    return False, None
            
            # Verify hookStrength is integer 0-100
            hook_strength = tweet["hookStrength"]
            if not isinstance(hook_strength, int):
                print(f"❌ FAILED: generatedTweet #{i+1} hookStrength is not an integer: {type(hook_strength)}")
                return False, None
            if hook_strength < 0 or hook_strength > 100:
                print(f"❌ FAILED: generatedTweet #{i+1} hookStrength out of range (0-100): {hook_strength}")
                return False, None
            print(f"  ✓ hookStrength: {hook_strength}")
            
            # Verify retention is one of Alta/Media/Baja
            retention = tweet["retention"]
            if retention not in ["Alta", "Media", "Baja"]:
                print(f"❌ FAILED: generatedTweet #{i+1} retention invalid: '{retention}' (expected Alta/Media/Baja)")
                return False, None
            print(f"  ✓ retention: {retention}")
            
            # Verify weakPoint is non-empty string
            weak_point = tweet["weakPoint"]
            if not isinstance(weak_point, str) or not weak_point.strip():
                print(f"❌ FAILED: generatedTweet #{i+1} weakPoint is empty or not a string")
                return False, None
            print(f"  ✓ weakPoint: {weak_point[:50]}...")
            
            # Verify other fields are non-empty
            for field in ["style", "text", "rationale"]:
                if not tweet[field] or not str(tweet[field]).strip():
                    print(f"❌ FAILED: generatedTweet #{i+1} field '{field}' is empty")
                    return False, None
        
        # Verify metrics object exists
        if "metrics" not in data:
            print("❌ FAILED: Response missing 'metrics' field")
            return False, None
        
        metrics = data["metrics"]
        if "hours_saved" not in metrics:
            print("❌ FAILED: metrics missing 'hours_saved' field")
            return False, None
        
        print(f"\n✓ Response contains metrics object with hours_saved: {metrics['hours_saved']}")
        
        print("\n✅ PASSED: All score fields validated successfully")
        return True, data
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None


def test_metrics_increment(baseline_metrics):
    """Test 4: Verify metrics incremented after analyze-and-generate"""
    print("\n" + "="*80)
    print("TEST 4: GET /api/metrics (verify increment)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/metrics"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False, None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if baseline_metrics is None:
            print("⚠️ SKIPPED: No baseline metrics to compare")
            return True, data
        
        baseline_posts = baseline_metrics["posts"]
        baseline_diagnostics = baseline_metrics["diagnostics"]
        
        current_posts = data["posts"]
        current_diagnostics = data["diagnostics"]
        
        # After analyze-and-generate: posts should increase by 3, diagnostics by 1
        expected_posts = baseline_posts + 3
        expected_diagnostics = baseline_diagnostics + 1
        
        print(f"\nBaseline: posts={baseline_posts}, diagnostics={baseline_diagnostics}")
        print(f"Current:  posts={current_posts}, diagnostics={current_diagnostics}")
        print(f"Expected: posts={expected_posts}, diagnostics={expected_diagnostics}")
        
        if current_posts != expected_posts:
            print(f"❌ FAILED: posts did not increment by 3 (expected {expected_posts}, got {current_posts})")
            return False, None
        
        if current_diagnostics != expected_diagnostics:
            print(f"❌ FAILED: diagnostics did not increment by 1 (expected {expected_diagnostics}, got {current_diagnostics})")
            return False, None
        
        # Verify hours_saved formula
        expected_hours = round(current_posts * 0.5 + current_diagnostics * 0.25, 2)
        if abs(data["hours_saved"] - expected_hours) > 0.01:
            print(f"❌ FAILED: hours_saved formula incorrect after increment")
            return False, None
        
        print("\n✅ PASSED: Metrics incremented correctly (posts +3, diagnostics +1)")
        return True, data
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None


def test_rewrite():
    """Test 5: POST /api/rewrite with proper body"""
    print("\n" + "="*80)
    print("TEST 5: POST /api/rewrite (valid request)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/rewrite"
        print(f"URL: {url}")
        
        payload = {
            "text": "La IA va a cambiar tu vida. Aquí te explico cómo.",
            "weakPoint": "El gancho es genérico y no crea suficiente curiosidad.",
            "style": "Directo / Gancho corto"
        }
        print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        
        print("Sending request (may take up to 90s for LLM call)...")
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=120)
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify required fields
        required_fields = ["text", "rationale", "hookStrength", "retention", "weakPoint", "metrics"]
        for field in required_fields:
            if field not in data:
                print(f"❌ FAILED: Response missing field '{field}'")
                return False, None
        
        # Verify text is non-empty and different/improved
        rewritten_text = data["text"]
        if not isinstance(rewritten_text, str) or not rewritten_text.strip():
            print("❌ FAILED: 'text' is empty or not a string")
            return False, None
        if rewritten_text == payload["text"]:
            print("⚠️ WARNING: Rewritten text is identical to original (expected improvement)")
        print(f"✓ text: {rewritten_text[:100]}...")
        
        # Verify rationale is non-empty
        rationale = data["rationale"]
        if not isinstance(rationale, str) or not rationale.strip():
            print("❌ FAILED: 'rationale' is empty or not a string")
            return False, None
        print(f"✓ rationale: {rationale[:100]}...")
        
        # Verify hookStrength is integer 0-100
        hook_strength = data["hookStrength"]
        if not isinstance(hook_strength, int):
            print(f"❌ FAILED: hookStrength is not an integer: {type(hook_strength)}")
            return False, None
        if hook_strength < 0 or hook_strength > 100:
            print(f"❌ FAILED: hookStrength out of range (0-100): {hook_strength}")
            return False, None
        print(f"✓ hookStrength: {hook_strength}")
        
        # Verify retention is one of Alta/Media/Baja
        retention = data["retention"]
        if retention not in ["Alta", "Media", "Baja"]:
            print(f"❌ FAILED: retention invalid: '{retention}' (expected Alta/Media/Baja)")
            return False, None
        print(f"✓ retention: {retention}")
        
        # Verify weakPoint is string
        weak_point = data["weakPoint"]
        if not isinstance(weak_point, str):
            print(f"❌ FAILED: weakPoint is not a string: {type(weak_point)}")
            return False, None
        print(f"✓ weakPoint: {weak_point}")
        
        # Verify metrics object
        metrics = data["metrics"]
        if not isinstance(metrics, dict):
            print("❌ FAILED: 'metrics' is not an object")
            return False, None
        if "posts" not in metrics:
            print("❌ FAILED: metrics missing 'posts' field")
            return False, None
        print(f"✓ metrics: {json.dumps(metrics, indent=2)}")
        
        print("\n✅ PASSED: All validations passed")
        return True, data
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None


def test_rewrite_metrics_increment(baseline_metrics):
    """Test 6: Verify metrics incremented after rewrite"""
    print("\n" + "="*80)
    print("TEST 6: GET /api/metrics (verify rewrite increment)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/metrics"
        response = requests.get(url, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if baseline_metrics is None:
            print("⚠️ SKIPPED: No baseline metrics to compare")
            return True
        
        baseline_posts = baseline_metrics["posts"]
        current_posts = data["posts"]
        
        # After rewrite: posts should increase by 1
        expected_posts = baseline_posts + 1
        
        print(f"\nBaseline posts: {baseline_posts}")
        print(f"Current posts:  {current_posts}")
        print(f"Expected posts: {expected_posts}")
        
        if current_posts != expected_posts:
            print(f"❌ FAILED: posts did not increment by 1 (expected {expected_posts}, got {current_posts})")
            return False
        
        print("\n✅ PASSED: Metrics incremented correctly (posts +1)")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_rewrite_validation():
    """Test 7: POST /api/rewrite with empty body (validation)"""
    print("\n" + "="*80)
    print("TEST 7: POST /api/rewrite (validation - empty body)")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/rewrite"
        print(f"URL: {url}")
        
        payload = {}
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            print(f"❌ FAILED: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        # Verify error message exists
        if "error" not in data:
            print("❌ FAILED: Response missing 'error' field")
            return False
        
        print(f"✓ Error message: {data['error']}")
        print("\n✅ PASSED: Validation working correctly")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception - {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*80)
    print("ZMETA-AI BACKEND API TESTS - NEW ENDPOINTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    results = {}
    
    # Test 1: Alerts
    results["alerts"] = test_alerts()
    
    # Test 2: Metrics (baseline)
    success, baseline_metrics = test_metrics()
    results["metrics_baseline"] = success
    
    # Test 3: Analyze-and-generate with score fields
    success, analyze_data = test_analyze_and_generate_with_scores()
    results["analyze_with_scores"] = success
    
    # Test 4: Metrics increment after analyze-and-generate
    success, metrics_after_analyze = test_metrics_increment(baseline_metrics)
    results["metrics_after_analyze"] = success
    
    # Test 5: Rewrite with proper body
    success, rewrite_data = test_rewrite()
    results["rewrite"] = success
    
    # Test 6: Metrics increment after rewrite
    results["metrics_after_rewrite"] = test_rewrite_metrics_increment(metrics_after_analyze)
    
    # Test 7: Rewrite validation
    results["rewrite_validation"] = test_rewrite_validation()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    print(f"\nTotal: {passed}/{total} tests passed")
    print("="*80)
    
    return all(results.values())


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
