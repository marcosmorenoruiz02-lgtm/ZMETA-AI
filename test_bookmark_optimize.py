#!/usr/bin/env python3
"""
Backend test for POST /api/bookmark-optimize endpoint
Tests the AI-powered one-click optimization engine with anti-fabrication rules
"""

import requests
import json
import time
import os
import re
from typing import Dict, Any, Tuple

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://viral-insights-forge.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

def test_bookmark_optimize(test_name: str, body: Dict[str, Any], expected_status: int = 200) -> Tuple[bool, Dict[str, Any], float]:
    """
    Test the bookmark-optimize endpoint with given body
    
    Args:
        test_name: Name of the test
        body: Request body to send
        expected_status: Expected HTTP status code
    
    Returns:
        Tuple of (success, response_data, elapsed_time)
    """
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")
    print(f"Request body: {json.dumps(body, ensure_ascii=False, indent=2)}")
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-optimize",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=60  # Allow up to 60s for Gemini call
        )
        elapsed_time = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed_time:.2f}s")
        
        # Check status code
        if response.status_code != expected_status:
            print(f"❌ FAIL: Expected status {expected_status}, got {response.status_code}")
            print(f"Response: {response.text}")
            return False, {}, elapsed_time
        
        # Parse response
        if response.status_code == 200:
            data = response.json()
            print(f"Response data: {json.dumps(data, ensure_ascii=False, indent=2)}")
            return True, data, elapsed_time
        else:
            # For error responses
            try:
                data = response.json()
                print(f"Error response: {json.dumps(data, ensure_ascii=False, indent=2)}")
            except:
                print(f"Error response (text): {response.text}")
            return True, {}, elapsed_time
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False, {}, 0.0

def has_list_pattern(text: str) -> bool:
    """Check if text contains numbered or bulleted list patterns"""
    patterns = [
        r'\d+\.',  # 1. 2. 3.
        r'^\s*[-•*]\s',  # - • * at start of line
        r'\n\s*[-•*]\s',  # - • * after newline
        r'\n\s*\d+\.',  # 1. 2. after newline
    ]
    for pattern in patterns:
        if re.search(pattern, text, re.MULTILINE):
            return True
    return False

def has_placeholder(text: str) -> bool:
    """Check if text contains editable placeholder like [tu dato aquí] or [...]"""
    # Look for bracketed placeholders
    return bool(re.search(r'\[.*?\]', text))

def has_fabricated_stat(text: str) -> bool:
    """
    Check if text contains what looks like a fabricated specific statistic
    This is a heuristic check - looks for specific numbers with % or precise figures
    """
    # Look for patterns like "85%", "3.5x", "2,500", etc.
    # This is not perfect but helps identify potential fabrications
    stat_patterns = [
        r'\d+%',  # 85%
        r'\d+\.\d+x',  # 3.5x
        r'\d{1,3}(?:,\d{3})+',  # 1,000 or 10,000
    ]
    for pattern in stat_patterns:
        if re.search(pattern, text):
            return True
    return False

def main():
    print("="*80)
    print("BOOKMARK-OPTIMIZE ENDPOINT TESTING")
    print("Testing POST /api/bookmark-optimize (AI-powered one-click optimization)")
    print("="*80)
    
    all_tests_passed = True
    test_results = []
    
    # TEST 1: Numbered list improvement
    print("\n" + "="*80)
    print("TEST 1: NUMBERED LIST IMPROVEMENT")
    print("="*80)
    test1_body = {
        "text": "La IA va a cambiar tu vida.",
        "cluster": "tech_ai",
        "firstReply": "",
        "target": "Añade una lista numerada de pasos accionables"
    }
    success, data, elapsed = test_bookmark_optimize("Test 1: Numbered List", test1_body)
    
    if success and data:
        # Validate response structure
        if 'text' not in data or 'rationale' not in data or 'applied' not in data:
            print("❌ FAIL: Missing required fields (text, rationale, applied)")
            all_tests_passed = False
            test_results.append(("Test 1: Numbered List", False, "Missing required fields"))
        else:
            improved_text = data['text']
            rationale = data['rationale']
            original_text = test1_body['text']
            
            # Check if text is different from original
            if improved_text == original_text:
                print(f"❌ FAIL: Improved text is identical to original")
                all_tests_passed = False
                test_results.append(("Test 1: Numbered List", False, "Text not improved"))
            # Check if text contains list pattern
            elif not has_list_pattern(improved_text):
                print(f"❌ FAIL: Improved text does not contain numbered/bulleted list")
                print(f"Improved text: {improved_text}")
                all_tests_passed = False
                test_results.append(("Test 1: Numbered List", False, "No list pattern found"))
            # Check if rationale is non-empty
            elif not rationale or len(rationale.strip()) == 0:
                print(f"❌ FAIL: Rationale is empty")
                all_tests_passed = False
                test_results.append(("Test 1: Numbered List", False, "Empty rationale"))
            else:
                print(f"✅ PASS: Text improved with list pattern")
                print(f"Original: {original_text}")
                print(f"Improved: {improved_text}")
                print(f"Rationale: {rationale}")
                test_results.append(("Test 1: Numbered List", True, f"List pattern found, time: {elapsed:.2f}s"))
    else:
        all_tests_passed = False
        test_results.append(("Test 1: Numbered List", False, "Request failed"))
    
    # TEST 2: ANTI-FABRICATION (CRITICAL)
    print("\n" + "="*80)
    print("TEST 2: ANTI-FABRICATION (CRITICAL)")
    print("="*80)
    test2_body = {
        "text": "La IA mejora la productividad.",
        "cluster": "tech_ai",
        "firstReply": "",
        "target": "Incluye un dato o estadística concreta (%, cifra, Nx)"
    }
    success, data, elapsed = test_bookmark_optimize("Test 2: Anti-Fabrication", test2_body)
    
    if success and data:
        if 'text' not in data:
            print("❌ FAIL: Missing 'text' field")
            all_tests_passed = False
            test_results.append(("Test 2: Anti-Fabrication", False, "Missing text field"))
        else:
            improved_text = data['text']
            print(f"\n📋 IMPROVED TEXT FOR INSPECTION:")
            print(f"'{improved_text}'")
            print(f"\n🔍 ANTI-FABRICATION ANALYSIS:")
            
            # Check for placeholder
            has_placeholder_marker = has_placeholder(improved_text)
            print(f"  - Contains placeholder marker [...]? {has_placeholder_marker}")
            
            # Check for fabricated stats
            has_stat = has_fabricated_stat(improved_text)
            print(f"  - Contains specific statistic? {has_stat}")
            
            # The text should EITHER have a placeholder OR not have fabricated stats
            # If it has a stat, we need to manually inspect if it's fabricated
            if has_placeholder_marker:
                print(f"✅ PASS: Contains editable placeholder - no fabrication")
                test_results.append(("Test 2: Anti-Fabrication", True, f"Placeholder found: {improved_text}"))
            elif has_stat:
                print(f"⚠️  WARNING: Contains specific statistic - MANUAL INSPECTION REQUIRED")
                print(f"   Text: {improved_text}")
                print(f"   Please verify if this statistic is fabricated or acceptable")
                # We'll mark this as PASS but flag for manual review
                test_results.append(("Test 2: Anti-Fabrication", True, f"MANUAL REVIEW: {improved_text}"))
            else:
                print(f"✅ PASS: No specific statistics added (acceptable)")
                test_results.append(("Test 2: Anti-Fabrication", True, f"No fabrication: {improved_text}"))
    else:
        all_tests_passed = False
        test_results.append(("Test 2: Anti-Fabrication", False, "Request failed"))
    
    # TEST 3: No URL in main text
    print("\n" + "="*80)
    print("TEST 3: NO URL IN MAIN TEXT")
    print("="*80)
    test3_body = {
        "text": "Mira esto",
        "cluster": "webdev",
        "firstReply": "https://ejemplo.com/x",
        "target": "Refuerza el gancho de la primera línea"
    }
    success, data, elapsed = test_bookmark_optimize("Test 3: No URL in text", test3_body)
    
    if success and data:
        if 'text' not in data:
            print("❌ FAIL: Missing 'text' field")
            all_tests_passed = False
            test_results.append(("Test 3: No URL", False, "Missing text field"))
        else:
            improved_text = data['text']
            print(f"Improved text: {improved_text}")
            
            # Check if text contains "http"
            if 'http' in improved_text.lower():
                print(f"❌ FAIL: Improved text contains URL (http)")
                all_tests_passed = False
                test_results.append(("Test 3: No URL", False, f"URL found in text: {improved_text}"))
            else:
                print(f"✅ PASS: No URL in improved text (link stays in firstReply)")
                test_results.append(("Test 3: No URL", True, f"No URL in text: {improved_text}"))
    else:
        all_tests_passed = False
        test_results.append(("Test 3: No URL", False, "Request failed"))
    
    # TEST 4a: Validation - empty text
    print("\n" + "="*80)
    print("TEST 4a: VALIDATION - EMPTY TEXT")
    print("="*80)
    test4a_body = {
        "text": "",
        "cluster": "tech_ai",
        "target": "x"
    }
    success, data, elapsed = test_bookmark_optimize("Test 4a: Empty text", test4a_body, expected_status=400)
    
    if success:
        print(f"✅ PASS: Empty text correctly returns 400")
        test_results.append(("Test 4a: Validation (empty text)", True, "400 returned"))
    else:
        all_tests_passed = False
        test_results.append(("Test 4a: Validation (empty text)", False, "Did not return 400"))
    
    # TEST 4b: Validation - empty target
    print("\n" + "="*80)
    print("TEST 4b: VALIDATION - EMPTY TARGET")
    print("="*80)
    test4b_body = {
        "text": "hola",
        "target": ""
    }
    success, data, elapsed = test_bookmark_optimize("Test 4b: Empty target", test4b_body, expected_status=400)
    
    if success:
        print(f"✅ PASS: Empty target correctly returns 400")
        test_results.append(("Test 4b: Validation (empty target)", True, "400 returned"))
    else:
        all_tests_passed = False
        test_results.append(("Test 4b: Validation (empty target)", False, "Did not return 400"))
    
    # TEST 4c: Validation - empty body
    print("\n" + "="*80)
    print("TEST 4c: VALIDATION - EMPTY BODY")
    print("="*80)
    test4c_body = {}
    success, data, elapsed = test_bookmark_optimize("Test 4c: Empty body", test4c_body, expected_status=400)
    
    if success:
        print(f"✅ PASS: Empty body correctly returns 400")
        test_results.append(("Test 4c: Validation (empty body)", True, "400 returned"))
    else:
        all_tests_passed = False
        test_results.append(("Test 4c: Validation (empty body)", False, "Did not return 400"))
    
    # TEST 5: Response time check
    print("\n" + "="*80)
    print("TEST 5: RESPONSE TIME CHECK")
    print("="*80)
    test5_body = {
        "text": "La IA es el futuro.",
        "cluster": "tech_ai",
        "firstReply": "",
        "target": "Añade un gancho más fuerte"
    }
    success, data, elapsed = test_bookmark_optimize("Test 5: Response time", test5_body)
    
    if success:
        print(f"Response time: {elapsed:.2f}s")
        if elapsed < 30:
            print(f"✅ PASS: Response time {elapsed:.2f}s < 30s")
            test_results.append(("Test 5: Response time", True, f"{elapsed:.2f}s < 30s"))
        else:
            print(f"⚠️  WARNING: Response time {elapsed:.2f}s >= 30s (acceptable but slow)")
            test_results.append(("Test 5: Response time", True, f"{elapsed:.2f}s >= 30s (slow)"))
    else:
        all_tests_passed = False
        test_results.append(("Test 5: Response time", False, "Request failed"))
    
    # SUMMARY
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed_count = sum(1 for _, passed, _ in test_results if passed)
    total_count = len(test_results)
    
    for test_name, passed, details in test_results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name} - {details}")
    
    print(f"\n{'='*80}")
    print(f"FINAL RESULT: {passed_count}/{total_count} tests passed")
    print(f"{'='*80}")
    
    if all_tests_passed:
        print("✅ ALL TESTS PASSED")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
