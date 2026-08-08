#!/usr/bin/env python3
"""
Backend test for ZMETA-AI / ViralForge
Tests: Custom free niche, CTA word-boundary fix, Schedule management
All deterministic tests (NO LLM cost)
"""

import requests
import json
import time
import os
from typing import Dict, Any, Optional

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://viral-insights-forge.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

def log_test_header(test_name: str):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def log_request(method: str, endpoint: str, body: Optional[Dict] = None, params: Optional[Dict] = None):
    """Log request details"""
    print(f"Request: {method} {endpoint}")
    if params:
        print(f"Params: {json.dumps(params, ensure_ascii=False)}")
    if body:
        print(f"Body: {json.dumps(body, ensure_ascii=False)}")

def log_response(status_code: int, elapsed_time: float, data: Any):
    """Log response details"""
    print(f"Status: {status_code} | Time: {elapsed_time:.2f}s")
    if isinstance(data, dict) or isinstance(data, list):
        print(f"Response: {json.dumps(data, ensure_ascii=False, indent=2)}")
    else:
        print(f"Response: {data}")

def test_custom_niche_1():
    """
    TEST 1: Custom free niche "Fotografía de bodas"
    Expect: HTTP 200, response.cluster === "Fotografía de bodas" (echoes the free-text niche)
    """
    log_test_header("TEST 1: Custom free niche 'Fotografía de bodas'")
    
    body = {
        "text": "3 claves para novios:\n1. Luz lateral\n2. Manos relajadas\n3. Mirada fuera",
        "cluster": "Fotografía de bodas",
        "hasThread": False
    }
    
    log_request("POST", "/api/bookmark-score", body)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-score",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        if data.get('cluster') != "Fotografía de bodas":
            print(f"❌ FAIL: Expected cluster='Fotografía de bodas', got '{data.get('cluster')}'")
            return False
        
        # Verify cta.suggestion references the niche (when no CTA present)
        cta = data.get('cta', {})
        if not cta.get('present'):
            suggestion = cta.get('suggestion', '')
            if 'Fotografía de bodas' not in suggestion and 'fotografía' not in suggestion.lower():
                print(f"⚠️  WARNING: CTA suggestion doesn't reference the niche: '{suggestion}'")
                # Not a critical failure, just a warning
        
        # Verify missing_elements is an array
        if not isinstance(data.get('missing_elements'), list):
            print(f"❌ FAIL: missing_elements must be array, got {type(data.get('missing_elements'))}")
            return False
        
        print(f"✅ PASS: Custom niche 'Fotografía de bodas' echoed correctly")
        print(f"   - cluster: {data.get('cluster')}")
        print(f"   - score: {data.get('score')}")
        print(f"   - cta.suggestion: {cta.get('suggestion')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_custom_niche_2():
    """
    TEST 2: Custom free niche "Cocina vegana keto"
    Expect: HTTP 200, response.cluster === "Cocina vegana keto" (arbitrary niche string)
    """
    log_test_header("TEST 2: Custom free niche 'Cocina vegana keto'")
    
    body = {
        "text": "Receta keto vegana:\n1. Aguacate\n2. Nueces\n3. Aceite de coco",
        "cluster": "Cocina vegana keto",
        "hasThread": False
    }
    
    log_request("POST", "/api/bookmark-score", body)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-score",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        if data.get('cluster') != "Cocina vegana keto":
            print(f"❌ FAIL: Expected cluster='Cocina vegana keto', got '{data.get('cluster')}'")
            return False
        
        print(f"✅ PASS: Custom niche 'Cocina vegana keto' echoed correctly")
        print(f"   - cluster: {data.get('cluster')}")
        print(f"   - score: {data.get('score')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cta_word_boundary_false_positive():
    """
    TEST 3a: CTA word-boundary fix - "muerto" contains "rt" but should NOT trigger CTA
    Text: "3 ejercicios de fuerza:\n1. Sentadilla\n2. Peso muerto\n3. Press banca"
    Expect: cta.present === false (no "?" and "rt" inside "muerto" should not match)
    """
    log_test_header("TEST 3a: CTA word-boundary fix - 'muerto' contains 'rt' (false positive)")
    
    body = {
        "text": "3 ejercicios de fuerza:\n1. Sentadilla\n2. Peso muerto\n3. Press banca",
        "cluster": "Fitness"
    }
    
    log_request("POST", "/api/bookmark-score", body)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-score",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        cta = data.get('cta', {})
        if cta.get('present') != False:
            print(f"❌ FAIL: Expected cta.present=false (no CTA in text), got {cta.get('present')}")
            print(f"   Text contains 'muerto' (with 'rt' substring) but NO actual CTA")
            print(f"   This is the word-boundary bug - 'rt' inside 'muerto' should NOT match")
            return False
        
        print(f"✅ PASS: CTA word-boundary fix working - 'muerto' does NOT trigger false positive")
        print(f"   - cta.present: {cta.get('present')}")
        print(f"   - cta.type: {cta.get('type')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cta_question():
    """
    TEST 3b: CTA detection with question mark
    Text: "3 tips rápidos. ¿Cuál usarías tú?"
    Expect: cta.present === true, cta.type === "question"
    """
    log_test_header("TEST 3b: CTA detection with question mark")
    
    body = {
        "text": "3 tips rápidos. ¿Cuál usarías tú?",
        "cluster": "Fitness"
    }
    
    log_request("POST", "/api/bookmark-score", body)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-score",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        cta = data.get('cta', {})
        if cta.get('present') != True:
            print(f"❌ FAIL: Expected cta.present=true (text has '?'), got {cta.get('present')}")
            return False
        
        if cta.get('type') != 'question':
            print(f"❌ FAIL: Expected cta.type='question', got '{cta.get('type')}'")
            return False
        
        print(f"✅ PASS: CTA question detection working")
        print(f"   - cta.present: {cta.get('present')}")
        print(f"   - cta.type: {cta.get('type')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cta_incentive():
    """
    TEST 3c: CTA detection with incentive phrase
    Text: "Guarda esto para después"
    Expect: cta.present === true, cta.type === "incentive"
    """
    log_test_header("TEST 3c: CTA detection with incentive phrase 'Guarda esto'")
    
    body = {
        "text": "Guarda esto para después",
        "cluster": "Tech & IA"
    }
    
    log_request("POST", "/api/bookmark-score", body)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/bookmark-score",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        cta = data.get('cta', {})
        if cta.get('present') != True:
            print(f"❌ FAIL: Expected cta.present=true (text has 'guarda'), got {cta.get('present')}")
            return False
        
        if cta.get('type') != 'incentive':
            print(f"❌ FAIL: Expected cta.type='incentive', got '{cta.get('type')}'")
            return False
        
        print(f"✅ PASS: CTA incentive detection working")
        print(f"   - cta.present: {cta.get('present')}")
        print(f"   - cta.type: {cta.get('type')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_schedule_post():
    """
    TEST 4a: POST /api/schedule - Create draft
    Expect: HTTP 200 with draft.id and count
    Returns: draft_id for use in subsequent tests
    """
    log_test_header("TEST 4a: POST /api/schedule - Create draft")
    
    body = {
        "text": "Tweet de prueba DELETE",
        "style": "Directo"
    }
    
    log_request("POST", "/api/schedule", body)
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_URL}/schedule",
            json=body,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False, None
        
        draft = data.get('draft')
        if not draft:
            print(f"❌ FAIL: Missing 'draft' in response")
            return False, None
        
        draft_id = draft.get('id')
        if not draft_id:
            print(f"❌ FAIL: Missing 'draft.id' in response")
            return False, None
        
        if 'count' not in data:
            print(f"❌ FAIL: Missing 'count' in response")
            return False, None
        
        print(f"✅ PASS: Draft created successfully")
        print(f"   - draft.id: {draft_id}")
        print(f"   - draft.text: {draft.get('text')}")
        print(f"   - count: {data.get('count')}")
        return True, draft_id
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_schedule_get(expected_id: Optional[str] = None):
    """
    TEST 4b: GET /api/schedule - List drafts
    Expect: HTTP 200 with items (array) and count
    If expected_id provided, verify it's in the list
    """
    log_test_header("TEST 4b: GET /api/schedule - List drafts")
    
    log_request("GET", "/api/schedule")
    
    try:
        start_time = time.time()
        response = requests.get(
            f"{API_URL}/schedule",
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        if 'items' not in data:
            print(f"❌ FAIL: Missing 'items' in response")
            return False
        
        if not isinstance(data['items'], list):
            print(f"❌ FAIL: 'items' must be array, got {type(data['items'])}")
            return False
        
        if 'count' not in data:
            print(f"❌ FAIL: Missing 'count' in response")
            return False
        
        # If expected_id provided, verify it's in the list
        if expected_id:
            found = any(item.get('id') == expected_id for item in data['items'])
            if not found:
                print(f"❌ FAIL: Expected draft id '{expected_id}' not found in items")
                print(f"   Items: {[item.get('id') for item in data['items']]}")
                return False
            print(f"✅ PASS: Draft id '{expected_id}' found in list")
        
        print(f"✅ PASS: GET /api/schedule working")
        print(f"   - items count: {len(data['items'])}")
        print(f"   - count: {data.get('count')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_schedule_delete(draft_id: str):
    """
    TEST 4c: DELETE /api/schedule?id=<id> - Delete draft
    Expect: HTTP 200 with {ok:true, count}
    """
    log_test_header(f"TEST 4c: DELETE /api/schedule?id={draft_id}")
    
    log_request("DELETE", "/api/schedule", params={"id": draft_id})
    
    try:
        start_time = time.time()
        response = requests.delete(
            f"{API_URL}/schedule?id={draft_id}",
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        if data.get('ok') != True:
            print(f"❌ FAIL: Expected ok=true, got {data.get('ok')}")
            return False
        
        if 'count' not in data:
            print(f"❌ FAIL: Missing 'count' in response")
            return False
        
        print(f"✅ PASS: Draft deleted successfully")
        print(f"   - ok: {data.get('ok')}")
        print(f"   - count: {data.get('count')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_schedule_get_verify_deleted(deleted_id: str):
    """
    TEST 4d: GET /api/schedule - Verify deleted draft is NO LONGER present
    """
    log_test_header(f"TEST 4d: GET /api/schedule - Verify id '{deleted_id}' is deleted")
    
    log_request("GET", "/api/schedule")
    
    try:
        start_time = time.time()
        response = requests.get(
            f"{API_URL}/schedule",
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 200:
            print(f"❌ FAIL: Expected HTTP 200, got {response.status_code}")
            return False
        
        # Verify deleted_id is NOT in the list
        found = any(item.get('id') == deleted_id for item in data.get('items', []))
        if found:
            print(f"❌ FAIL: Deleted draft id '{deleted_id}' still present in items")
            return False
        
        print(f"✅ PASS: Deleted draft id '{deleted_id}' is NO LONGER present")
        print(f"   - items count: {len(data.get('items', []))}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_schedule_delete_no_id():
    """
    TEST 4e: DELETE /api/schedule with NO id param
    Expect: HTTP 400
    """
    log_test_header("TEST 4e: DELETE /api/schedule with NO id param (validation)")
    
    log_request("DELETE", "/api/schedule", params={})
    
    try:
        start_time = time.time()
        response = requests.delete(
            f"{API_URL}/schedule",
            timeout=10
        )
        elapsed_time = time.time() - start_time
        
        data = response.json()
        log_response(response.status_code, elapsed_time, data)
        
        # Validations
        if response.status_code != 400:
            print(f"❌ FAIL: Expected HTTP 400, got {response.status_code}")
            return False
        
        if 'error' not in data:
            print(f"⚠️  WARNING: Expected 'error' field in 400 response")
        
        print(f"✅ PASS: DELETE without id returns HTTP 400")
        print(f"   - error: {data.get('error')}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print(f"\n{'#'*80}")
    print(f"# ZMETA-AI / ViralForge Backend Testing")
    print(f"# Tests: Custom Niche + CTA Word-Boundary Fix + Schedule Management")
    print(f"# Base URL: {API_URL}")
    print(f"{'#'*80}")
    
    results = []
    
    # TEST 1: Custom free niche "Fotografía de bodas"
    results.append(("Custom niche 'Fotografía de bodas'", test_custom_niche_1()))
    
    # TEST 2: Custom free niche "Cocina vegana keto"
    results.append(("Custom niche 'Cocina vegana keto'", test_custom_niche_2()))
    
    # TEST 3a: CTA word-boundary fix - false positive
    results.append(("CTA word-boundary fix (false positive)", test_cta_word_boundary_false_positive()))
    
    # TEST 3b: CTA question detection
    results.append(("CTA question detection", test_cta_question()))
    
    # TEST 3c: CTA incentive detection
    results.append(("CTA incentive detection", test_cta_incentive()))
    
    # TEST 4: Schedule management flow
    # 4a: POST to create draft
    post_result, draft_id = test_schedule_post()
    results.append(("POST /api/schedule (create draft)", post_result))
    
    if post_result and draft_id:
        # 4b: GET to list drafts (verify created draft is present)
        results.append(("GET /api/schedule (verify created)", test_schedule_get(draft_id)))
        
        # 4c: DELETE with id
        delete_result = test_schedule_delete(draft_id)
        results.append(("DELETE /api/schedule with id", delete_result))
        
        if delete_result:
            # 4d: GET again to verify deleted draft is gone
            results.append(("GET /api/schedule (verify deleted)", test_schedule_get_verify_deleted(draft_id)))
    else:
        print(f"\n⚠️  Skipping subsequent schedule tests due to POST failure")
        results.append(("GET /api/schedule (verify created)", False))
        results.append(("DELETE /api/schedule with id", False))
        results.append(("GET /api/schedule (verify deleted)", False))
    
    # 4e: DELETE without id (validation)
    results.append(("DELETE /api/schedule without id (400)", test_schedule_delete_no_id()))
    
    # Summary
    print(f"\n{'#'*80}")
    print(f"# TEST SUMMARY")
    print(f"{'#'*80}")
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    
    print(f"\nDetailed Results:")
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    if passed == total:
        print(f"\n✅ ALL TESTS PASSED ({passed}/{total})")
        return 0
    else:
        print(f"\n❌ SOME TESTS FAILED ({passed}/{total})")
        return 1


if __name__ == "__main__":
    exit(main())
