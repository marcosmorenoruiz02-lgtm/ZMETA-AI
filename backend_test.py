#!/usr/bin/env python3
"""
Backend test for POST /api/bookmark-score endpoint
Tests the deterministic heuristic bookmark scoring engine
"""

import requests
import json
import time
import os
from typing import Dict, Any

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://viral-insights-forge.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

def test_bookmark_score(test_name: str, body: Dict[str, Any], expected_checks: Dict[str, Any]) -> bool:
    """
    Test the bookmark-score endpoint with given body and validate response
    
    Args:
        test_name: Name of the test
        body: Request body to send
        expected_checks: Dictionary of expected values to validate
    
    Returns:
        True if test passed, False otherwise
    """
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")
    print(f"Request body: {json.dumps(body, ensure_ascii=False)}")
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-score",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed_time:.2f}s")
        
        # Check status code
        expected_status = expected_checks.get('status_code', 200)
        if response.status_code != expected_status:
            print(f"❌ FAIL: Expected status {expected_status}, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        # Parse JSON response
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)}")
        except json.JSONDecodeError as e:
            print(f"❌ FAIL: Invalid JSON response: {e}")
            print(f"Response text: {response.text}")
            return False
        
        # Validate response schema
        required_fields = ['score', 'grade', 'breakdown', 'missing_elements', 'suggested_format', 'cta', 'linkIsolation', 'cluster']
        for field in required_fields:
            if field not in data:
                print(f"❌ FAIL: Missing required field '{field}' in response")
                return False
        
        # Validate score is 0-100 integer
        if not isinstance(data['score'], (int, float)) or data['score'] < 0 or data['score'] > 100:
            print(f"❌ FAIL: score must be 0-100 integer, got {data['score']} (type: {type(data['score'])})")
            return False
        
        # Validate grade
        valid_grades = ['low', 'medium', 'high', 'elite']
        if data['grade'] not in valid_grades:
            print(f"❌ FAIL: grade must be one of {valid_grades}, got '{data['grade']}'")
            return False
        
        # Validate breakdown has 4 numeric sub-scores 0-100
        breakdown = data['breakdown']
        breakdown_fields = ['actionability', 'structure', 'specificity', 'saveability']
        for field in breakdown_fields:
            if field not in breakdown:
                print(f"❌ FAIL: Missing breakdown field '{field}'")
                return False
            value = breakdown[field]
            if not isinstance(value, (int, float)) or value < 0 or value > 100:
                print(f"❌ FAIL: breakdown.{field} must be 0-100, got {value}")
                return False
        
        # Validate missing_elements is array
        if not isinstance(data['missing_elements'], list):
            print(f"❌ FAIL: missing_elements must be array, got {type(data['missing_elements'])}")
            return False
        
        # Validate suggested_format is string
        if not isinstance(data['suggested_format'], str):
            print(f"❌ FAIL: suggested_format must be string, got {type(data['suggested_format'])}")
            return False
        
        # Validate cta object
        cta = data['cta']
        if not isinstance(cta.get('present'), bool):
            print(f"❌ FAIL: cta.present must be boolean, got {type(cta.get('present'))}")
            return False
        
        valid_cta_types = ['question', 'incentive', 'none']
        if cta.get('type') not in valid_cta_types:
            print(f"❌ FAIL: cta.type must be one of {valid_cta_types}, got '{cta.get('type')}'")
            return False
        
        if not isinstance(cta.get('suggestion'), str):
            print(f"❌ FAIL: cta.suggestion must be string, got {type(cta.get('suggestion'))}")
            return False
        
        # Validate linkIsolation object
        link_iso = data['linkIsolation']
        if not isinstance(link_iso.get('hasExternalLink'), bool):
            print(f"❌ FAIL: linkIsolation.hasExternalLink must be boolean, got {type(link_iso.get('hasExternalLink'))}")
            return False
        
        if not isinstance(link_iso.get('links'), list):
            print(f"❌ FAIL: linkIsolation.links must be array, got {type(link_iso.get('links'))}")
            return False
        
        if not isinstance(link_iso.get('recommendMoveToReply'), bool):
            print(f"❌ FAIL: linkIsolation.recommendMoveToReply must be boolean, got {type(link_iso.get('recommendMoveToReply'))}")
            return False
        
        # Validate cluster is string
        if not isinstance(data['cluster'], str):
            print(f"❌ FAIL: cluster must be string, got {type(data['cluster'])}")
            return False
        
        # Check specific expected values
        for key, expected_value in expected_checks.items():
            if key == 'status_code':
                continue  # Already checked
            
            if key == 'score_range':
                min_score, max_score = expected_value
                if not (min_score <= data['score'] <= max_score):
                    print(f"❌ FAIL: Expected score in range [{min_score}, {max_score}], got {data['score']}")
                    return False
            
            elif key == 'cta_present':
                if data['cta']['present'] != expected_value:
                    print(f"❌ FAIL: Expected cta.present={expected_value}, got {data['cta']['present']}")
                    return False
            
            elif key == 'hasExternalLink':
                if data['linkIsolation']['hasExternalLink'] != expected_value:
                    print(f"❌ FAIL: Expected linkIsolation.hasExternalLink={expected_value}, got {data['linkIsolation']['hasExternalLink']}")
                    return False
            
            elif key == 'recommendMoveToReply':
                if data['linkIsolation']['recommendMoveToReply'] != expected_value:
                    print(f"❌ FAIL: Expected linkIsolation.recommendMoveToReply={expected_value}, got {data['linkIsolation']['recommendMoveToReply']}")
                    return False
            
            elif key == 'links_contains':
                if expected_value not in data['linkIsolation']['links']:
                    print(f"❌ FAIL: Expected links to contain '{expected_value}', got {data['linkIsolation']['links']}")
                    return False
            
            elif key == 'missing_elements_non_empty':
                if expected_value and len(data['missing_elements']) == 0:
                    print(f"❌ FAIL: Expected missing_elements to be non-empty, got empty array")
                    return False
            
            elif key == 'grade_in':
                if data['grade'] not in expected_value:
                    print(f"❌ FAIL: Expected grade in {expected_value}, got '{data['grade']}'")
                    return False
            
            elif key == 'cta_suggestion_non_empty':
                if expected_value and len(data['cta']['suggestion']) == 0:
                    print(f"❌ FAIL: Expected cta.suggestion to be non-empty, got empty string")
                    return False
            
            elif key == 'response_time_max':
                if elapsed_time > expected_value:
                    print(f"❌ FAIL: Expected response time < {expected_value}s, got {elapsed_time:.2f}s")
                    return False
        
        print(f"✅ PASS: All validations passed")
        return True
        
    except requests.exceptions.Timeout:
        print(f"❌ FAIL: Request timeout after 10s")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ FAIL: Request error: {e}")
        return False
    except Exception as e:
        print(f"❌ FAIL: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all bookmark-score tests"""
    print(f"\n{'#'*80}")
    print(f"# BOOKMARK-BAIT ENGINE - POST /api/bookmark-score TESTS")
    print(f"# Testing deterministic heuristic endpoint (NO external APIs, NO LLM)")
    print(f"# Base URL: {API_URL}")
    print(f"{'#'*80}")
    
    results = []
    
    # TEST 1: Rich post with list + CTA
    results.append(test_bookmark_score(
        "TEST 1: Rich post with list + CTA (Spanish)",
        {
            "text": "Cómo automatizar tu trabajo con IA:\n1. Usa GPT\n2. Crea agentes\n3. Ahorra 40% de tiempo\n\n¿Cuál usarías tú?",
            "cluster": "tech_ai",
            "hasThread": False,
            "firstReply": ""
        },
        {
            "status_code": 200,
            "cta_present": True,  # Contains "?"
            "hasExternalLink": False,
            "response_time_max": 2.0
        }
    ))
    
    # TEST 2: Link isolation ON (link in text, no firstReply)
    results.append(test_bookmark_score(
        "TEST 2: Link isolation ON (link in text, empty firstReply)",
        {
            "text": "Mira mi guía https://ejemplo.com/x",
            "cluster": "webdev",
            "hasThread": False,
            "firstReply": ""
        },
        {
            "status_code": 200,
            "hasExternalLink": True,
            "recommendMoveToReply": True,
            "links_contains": "https://ejemplo.com/x",
            "response_time_max": 2.0
        }
    ))
    
    # TEST 3: Link already moved (link in firstReply)
    results.append(test_bookmark_score(
        "TEST 3: Link already moved (link in firstReply)",
        {
            "text": "Mira mi guía",
            "cluster": "webdev",
            "hasThread": False,
            "firstReply": "https://ejemplo.com/x"
        },
        {
            "status_code": 200,
            "hasExternalLink": False,  # No link in main text
            "recommendMoveToReply": False,  # firstReply is not empty
            "response_time_max": 2.0
        }
    ))
    
    # TEST 4: Weak short post
    results.append(test_bookmark_score(
        "TEST 4: Weak short post",
        {
            "text": "hola",
            "cluster": "finance"
        },
        {
            "status_code": 200,
            "missing_elements_non_empty": True,
            "grade_in": ["low", "medium"],
            "cta_suggestion_non_empty": True,
            "response_time_max": 2.0
        }
    ))
    
    # TEST 5a: Empty body
    results.append(test_bookmark_score(
        "TEST 5a: Empty body (edge case)",
        {},
        {
            "status_code": 200,  # Should NOT return 500
            "score_range": (0, 40),  # Low score expected
            "response_time_max": 2.0
        }
    ))
    
    # TEST 5b: Empty text
    results.append(test_bookmark_score(
        "TEST 5b: Empty text (edge case)",
        {"text": ""},
        {
            "status_code": 200,  # Should NOT return 500
            "score_range": (0, 40),  # Low score expected
            "response_time_max": 2.0
        }
    ))
    
    # TEST 6: Cluster variation (same text, different clusters)
    print(f"\n{'='*80}")
    print(f"TEST 6: Cluster variation (cluster-aware CTA suggestions)")
    print(f"{'='*80}")
    
    test_text = "Cómo mejorar tu estrategia:\n1. Analiza datos\n2. Optimiza procesos\n3. Mide resultados"
    
    # Test with finance cluster
    print(f"\n--- Testing with cluster='finance' ---")
    start_time = time.time()
    response_finance = requests.post(
        f"{API_URL}/bookmark-score",
        json={"text": test_text, "cluster": "finance"},
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    elapsed_finance = time.time() - start_time
    
    if response_finance.status_code != 200:
        print(f"❌ FAIL: Finance cluster returned {response_finance.status_code}")
        results.append(False)
    else:
        data_finance = response_finance.json()
        cta_finance = data_finance['cta']['suggestion']
        print(f"Finance CTA suggestion: {cta_finance}")
        print(f"Response time: {elapsed_finance:.2f}s")
        
        # Test with entertainment cluster
        print(f"\n--- Testing with cluster='entertainment' ---")
        start_time = time.time()
        response_entertainment = requests.post(
            f"{API_URL}/bookmark-score",
            json={"text": test_text, "cluster": "entertainment"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_entertainment = time.time() - start_time
        
        if response_entertainment.status_code != 200:
            print(f"❌ FAIL: Entertainment cluster returned {response_entertainment.status_code}")
            results.append(False)
        else:
            data_entertainment = response_entertainment.json()
            cta_entertainment = data_entertainment['cta']['suggestion']
            print(f"Entertainment CTA suggestion: {cta_entertainment}")
            print(f"Response time: {elapsed_entertainment:.2f}s")
            
            # Verify CTA suggestions are different
            if cta_finance == cta_entertainment:
                print(f"❌ FAIL: CTA suggestions should differ between clusters, both are: '{cta_finance}'")
                results.append(False)
            else:
                print(f"✅ PASS: CTA suggestions differ between clusters (cluster-aware)")
                results.append(True)
    
    # TEST 7: Response time verification (already checked in each test, but let's do one more explicit check)
    print(f"\n{'='*80}")
    print(f"TEST 7: Response time verification (deterministic, should be fast)")
    print(f"{'='*80}")
    
    start_time = time.time()
    response = requests.post(
        f"{API_URL}/bookmark-score",
        json={
            "text": "Cómo automatizar tu trabajo con IA:\n1. Usa GPT\n2. Crea agentes\n3. Ahorra 40% de tiempo",
            "cluster": "tech_ai"
        },
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    elapsed = time.time() - start_time
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Time: {elapsed:.2f}s")
    
    if response.status_code != 200:
        print(f"❌ FAIL: Expected 200, got {response.status_code}")
        results.append(False)
    elif elapsed >= 2.0:
        print(f"❌ FAIL: Response time should be < 2s for deterministic endpoint, got {elapsed:.2f}s")
        results.append(False)
    else:
        print(f"✅ PASS: Response time {elapsed:.2f}s < 2s (deterministic)")
        results.append(True)
    
    # Summary
    print(f"\n{'#'*80}")
    print(f"# TEST SUMMARY")
    print(f"{'#'*80}")
    
    passed = sum(1 for r in results if r)
    total = len(results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    
    if passed == total:
        print(f"\n✅ ALL TESTS PASSED ({passed}/{total})")
        return 0
    else:
        print(f"\n❌ SOME TESTS FAILED ({passed}/{total})")
        return 1


if __name__ == "__main__":
    exit(main())
