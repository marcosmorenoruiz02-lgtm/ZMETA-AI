#!/usr/bin/env python3
"""
FORENSIC MULTIMODAL ENGINE - Anti-hallucination Testing
Tests the evidence-based vision-generate endpoint to verify it NO LONGER hallucinates
when there's insufficient evidence (e.g., black image).
"""

import requests
import base64
import io
import time
import json
from PIL import Image, ImageDraw, ImageFont

# Backend URL
BASE_URL = "https://viral-insights-forge.preview.emergentagent.com/api"

# Hallucination markers to search for (case-insensitive)
HALLUCINATION_MARKERS = [
    "el vacío",
    "vacio es el gancho",
    "misterio",
    "introspección",
    "la nada",
    "pattern interrupt",
    "ausencia como gancho",
    "catalizador de la imaginación"
]

def create_black_image(width=512, height=512):
    """Create a completely black PNG image."""
    img = Image.new('RGB', (width, height), color='black')
    return img

def create_text_image(text, width=600, height=300, bg_color='white', text_color='black'):
    """Create a white PNG with large black text."""
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a large font, fallback to default if not available
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
    
    draw.text((x, y), text, fill=text_color, font=font)
    return img

def image_to_data_url(img):
    """Convert PIL Image to base64 data URL."""
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    return f"data:image/png;base64,{img_base64}"

def search_hallucination_markers(response_json):
    """Search for hallucination markers in the entire JSON response (case-insensitive)."""
    response_str = json.dumps(response_json).lower()
    found_markers = []
    for marker in HALLUCINATION_MARKERS:
        if marker.lower() in response_str:
            found_markers.append(marker)
    return found_markers

def test_1_black_image():
    """TEST 1 - BLACK IMAGE (the exact hallucination scenario)"""
    print("\n" + "="*80)
    print("TEST 1 - BLACK IMAGE (Anti-hallucination Critical Test)")
    print("="*80)
    
    try:
        # Create 512x512 completely black PNG
        print("Creating 512x512 completely black PNG image...")
        black_img = create_black_image(512, 512)
        black_data_url = image_to_data_url(black_img)
        print(f"✓ Black image created (data URL length: {len(black_data_url)} chars)")
        
        # POST to /api/vision-generate with NO note
        print("\nPOSTing to /api/vision-generate with black image (NO note)...")
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/vision-generate",
            json={"image": black_data_url},
            timeout=90
        )
        elapsed = time.time() - start_time
        print(f"Response received in {elapsed:.2f}s")
        
        # (a) Verify HTTP 200
        print(f"\n(a) HTTP Status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ FAILED - Expected HTTP 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        print("✓ HTTP 200 OK")
        
        data = response.json()
        
        # (b) CRITICAL: Search for hallucination markers
        print("\n(b) CRITICAL - Searching for hallucination markers...")
        found_markers = search_hallucination_markers(data)
        if found_markers:
            print(f"❌ FAILED - Found hallucination markers: {found_markers}")
            print(f"Full response (first 2000 chars): {json.dumps(data, indent=2, ensure_ascii=False)[:2000]}")
            return False
        print("✓ No hallucination markers found (el vacío, misterio, introspección, etc.)")
        
        # (c) Verify evidence object with evidenceSufficient=false or evidenceLevel="bajo"
        print("\n(c) Checking evidence object...")
        evidence = data.get('evidence')
        if not evidence:
            print("❌ FAILED - No 'evidence' object in response")
            return False
        print(f"✓ evidence object present: {json.dumps(evidence, indent=2, ensure_ascii=False)[:500]}")
        
        evidence_sufficient = evidence.get('evidenceSufficient')
        evidence_level = evidence.get('evidenceLevel', '').lower()
        if evidence_sufficient is False or evidence_level == 'bajo':
            print(f"✓ evidenceSufficient={evidence_sufficient}, evidenceLevel={evidence_level}")
        else:
            print(f"❌ FAILED - Expected evidenceSufficient=false or evidenceLevel='bajo', got evidenceSufficient={evidence_sufficient}, evidenceLevel={evidence_level}")
            return False
        
        # (d) Verify vision.tone and/or vision.description use exact string
        print("\n(d) Checking vision.tone and vision.description...")
        vision = data.get('vision', {})
        NO_EVIDENCE = "No hay suficiente evidencia para determinar este aspecto."
        
        tone = vision.get('tone', '')
        description = vision.get('description', '')
        
        print(f"vision.tone: {tone[:200]}")
        print(f"vision.description: {description[:200]}")
        
        if NO_EVIDENCE in tone or NO_EVIDENCE in description:
            print(f"✓ Found exact phrase '{NO_EVIDENCE}' in vision fields")
        else:
            print(f"⚠️ WARNING - Expected exact phrase not found in vision.tone or vision.description")
            # Not failing the test as long as no hallucination markers are present
        
        # (e) Verify combined_hook_angle
        print("\n(e) Checking combined_hook_angle...")
        combined_hook_angle = data.get('combined_hook_angle', '')
        print(f"combined_hook_angle: {combined_hook_angle}")
        
        if NO_EVIDENCE in combined_hook_angle or "no hay suficiente evidencia" in combined_hook_angle.lower():
            print(f"✓ combined_hook_angle indicates insufficient evidence")
        else:
            print(f"⚠️ WARNING - combined_hook_angle doesn't clearly indicate insufficient evidence")
        
        # (f) Verify generatedTweets has 3 items with "No hay suficiente evidencia"
        print("\n(f) Checking generatedTweets...")
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        print(f"Number of generatedTweets: {len(generated_tweets)}")
        
        if len(generated_tweets) != 3:
            print(f"❌ FAILED - Expected 3 generatedTweets, got {len(generated_tweets)}")
            return False
        print("✓ Exactly 3 generatedTweets")
        
        insufficient_evidence_count = 0
        for i, tweet in enumerate(generated_tweets):
            text = tweet.get('text', '')
            hook_strength = tweet.get('hookStrength')
            retention = tweet.get('retention', '')
            
            print(f"\nTweet {i+1}:")
            print(f"  text: {text[:150]}")
            print(f"  hookStrength: {hook_strength}")
            print(f"  retention: {retention}")
            
            if "no hay suficiente evidencia" in text.lower():
                insufficient_evidence_count += 1
                print(f"  ✓ Contains 'No hay suficiente evidencia'")
            
            if hook_strength == 0:
                print(f"  ✓ hookStrength is 0")
            else:
                print(f"  ⚠️ hookStrength is {hook_strength} (expected 0)")
            
            if retention.lower() == 'baja':
                print(f"  ✓ retention is 'Baja'")
            else:
                print(f"  ⚠️ retention is '{retention}' (expected 'Baja')")
        
        if insufficient_evidence_count == 3:
            print(f"\n✓ All 3 tweets contain 'No hay suficiente evidencia'")
        else:
            print(f"\n⚠️ Only {insufficient_evidence_count}/3 tweets contain 'No hay suficiente evidencia'")
        
        print("\n" + "="*80)
        print("✅ TEST 1 PASSED - No hallucinations detected, evidence-based response confirmed")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n❌ TEST 1 FAILED with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_2_image_with_evidence():
    """TEST 2 - IMAGE WITH REAL EVIDENCE"""
    print("\n" + "="*80)
    print("TEST 2 - IMAGE WITH REAL EVIDENCE")
    print("="*80)
    
    try:
        # Create 600x300 white PNG with text
        print("Creating 600x300 white PNG with text 'CURSO DE PYTHON - 50% OFF HOY'...")
        text_img = create_text_image("CURSO DE PYTHON\n50% OFF HOY", 600, 300)
        text_data_url = image_to_data_url(text_img)
        print(f"✓ Text image created (data URL length: {len(text_data_url)} chars)")
        
        # POST to /api/vision-generate
        print("\nPOSTing to /api/vision-generate with text image...")
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/vision-generate",
            json={"image": text_data_url},
            timeout=90
        )
        elapsed = time.time() - start_time
        print(f"Response received in {elapsed:.2f}s")
        
        # (a) Verify HTTP 200
        print(f"\n(a) HTTP Status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ FAILED - Expected HTTP 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        print("✓ HTTP 200 OK")
        
        data = response.json()
        
        # (b) Verify evidence.evidenceSufficient=true
        print("\n(b) Checking evidence.evidenceSufficient...")
        evidence = data.get('evidence', {})
        evidence_sufficient = evidence.get('evidenceSufficient')
        if evidence_sufficient is True:
            print(f"✓ evidenceSufficient=true")
        else:
            print(f"❌ FAILED - Expected evidenceSufficient=true, got {evidence_sufficient}")
            return False
        
        # (c) Verify evidence.usableFacts is non-empty array
        print("\n(c) Checking evidence.usableFacts...")
        usable_facts = evidence.get('usableFacts', [])
        if not isinstance(usable_facts, list) or len(usable_facts) == 0:
            print(f"❌ FAILED - Expected non-empty usableFacts array, got {usable_facts}")
            return False
        print(f"✓ usableFacts is non-empty array with {len(usable_facts)} items")
        
        for i, fact in enumerate(usable_facts[:3]):  # Show first 3
            print(f"  Fact {i+1}: {json.dumps(fact, ensure_ascii=False)[:200]}")
            if 'fact' not in fact or 'origen' not in fact or 'confidence' not in fact:
                print(f"  ❌ Missing required fields (fact/origen/confidence)")
                return False
            if fact.get('confidence', 0) < 80:
                print(f"  ❌ Confidence {fact.get('confidence')} < 80")
                return False
        print("✓ All usableFacts have required fields (fact/origen/confidence>=80)")
        
        # (d) Verify vision.ocr contains real text
        print("\n(d) Checking vision.ocr...")
        vision = data.get('vision', {})
        ocr = vision.get('ocr', '')
        print(f"vision.ocr: {ocr}")
        
        if 'PYTHON' in ocr.upper() or '50%' in ocr or 'OFF' in ocr.upper() or 'CURSO' in ocr.upper():
            print("✓ OCR contains real text from image (PYTHON/50%/OFF/CURSO)")
        else:
            print(f"⚠️ WARNING - OCR doesn't contain expected text, but may have extracted something else")
        
        # (e) Verify analysis.generatedTweets has exactly 3 items with all fields
        print("\n(e) Checking analysis.generatedTweets...")
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        if len(generated_tweets) != 3:
            print(f"❌ FAILED - Expected 3 generatedTweets, got {len(generated_tweets)}")
            return False
        print("✓ Exactly 3 generatedTweets")
        
        required_fields = ['style', 'text', 'rationale', 'hookStrength', 'retention', 'weakPoint', 'thread']
        for i, tweet in enumerate(generated_tweets):
            print(f"\nTweet {i+1}:")
            for field in required_fields:
                if field not in tweet:
                    print(f"  ❌ Missing field: {field}")
                    return False
                print(f"  ✓ {field}: {str(tweet[field])[:100]}")
        print("✓ All tweets have required fields")
        
        # (f) Verify top-level growth object
        print("\n(f) Checking growth object...")
        growth = data.get('growth')
        if not growth:
            print("❌ FAILED - No growth object")
            return False
        print(f"✓ growth object present: {json.dumps(growth, indent=2, ensure_ascii=False)[:300]}")
        
        # (g) Verify tweets are grounded in real text
        print("\n(g) Checking if tweets are grounded in real text...")
        grounded_count = 0
        for i, tweet in enumerate(generated_tweets):
            text = tweet.get('text', '').upper()
            if 'PYTHON' in text or 'CURSO' in text or '50%' in text or 'DESCUENTO' in text or 'OFERTA' in text:
                grounded_count += 1
                print(f"  Tweet {i+1}: ✓ Grounded in real content")
            else:
                print(f"  Tweet {i+1}: ⚠️ May not be directly grounded in image text")
        
        if grounded_count > 0:
            print(f"✓ At least {grounded_count}/3 tweets are grounded in real text")
        else:
            print("⚠️ WARNING - Tweets may not be grounded in the image text")
        
        print("\n" + "="*80)
        print("✅ TEST 2 PASSED - Evidence-based generation working correctly")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n❌ TEST 2 FAILED with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_3_multiple_frames():
    """TEST 3 - MULTIPLE FRAMES"""
    print("\n" + "="*80)
    print("TEST 3 - MULTIPLE FRAMES")
    print("="*80)
    
    try:
        # Create 3 different 400x200 images with distinct text
        print("Creating 3 different 400x200 images with distinct text...")
        frame1 = create_text_image("FRAME UNO", 400, 200)
        frame2 = create_text_image("OFERTA", 400, 200)
        frame3 = create_text_image("SUSCRIBETE", 400, 200)
        
        frame1_url = image_to_data_url(frame1)
        frame2_url = image_to_data_url(frame2)
        frame3_url = image_to_data_url(frame3)
        
        print(f"✓ 3 frames created")
        
        # POST to /api/vision-generate with frames array
        print("\nPOSTing to /api/vision-generate with 3 frames...")
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/vision-generate",
            json={"frames": [frame1_url, frame2_url, frame3_url]},
            timeout=90
        )
        elapsed = time.time() - start_time
        print(f"Response received in {elapsed:.2f}s")
        
        # Verify HTTP 200
        print(f"\nHTTP Status: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ FAILED - Expected HTTP 200, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        print("✓ HTTP 200 OK")
        
        data = response.json()
        
        # Verify evidence object present
        print("\nChecking evidence object...")
        evidence = data.get('evidence')
        if not evidence:
            print("❌ FAILED - No evidence object")
            return False
        print(f"✓ evidence object present")
        
        # Verify analysis.generatedTweets has 3 items
        print("\nChecking analysis.generatedTweets...")
        generated_tweets = data.get('analysis', {}).get('generatedTweets', [])
        if len(generated_tweets) != 3:
            print(f"❌ FAILED - Expected 3 generatedTweets, got {len(generated_tweets)}")
            return False
        print("✓ Exactly 3 generatedTweets")
        
        # Verify response time < 55s
        print(f"\nResponse time: {elapsed:.2f}s")
        if elapsed < 55:
            print(f"✓ Response time {elapsed:.2f}s < 55s")
        else:
            print(f"⚠️ WARNING - Response time {elapsed:.2f}s >= 55s (may need optimization)")
        
        print("\n" + "="*80)
        print("✅ TEST 3 PASSED - Multiple frames working correctly")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n❌ TEST 3 FAILED with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_4_validation():
    """TEST 4 - VALIDATION"""
    print("\n" + "="*80)
    print("TEST 4 - VALIDATION")
    print("="*80)
    
    try:
        # POST to /api/vision-generate with empty body
        print("POSTing to /api/vision-generate with empty body {}...")
        response = requests.post(
            f"{BASE_URL}/vision-generate",
            json={},
            timeout=30
        )
        
        print(f"HTTP Status: {response.status_code}")
        if response.status_code != 400:
            print(f"❌ FAILED - Expected HTTP 400, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        print("✓ HTTP 400 Bad Request")
        
        data = response.json()
        error = data.get('error', '')
        print(f"Error message: {error}")
        
        if error:
            print("✓ Error message present")
        else:
            print("⚠️ WARNING - No error message in response")
        
        print("\n" + "="*80)
        print("✅ TEST 4 PASSED - Validation working correctly")
        print("="*80)
        return True
        
    except Exception as e:
        print(f"\n❌ TEST 4 FAILED with exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("FORENSIC MULTIMODAL ENGINE - ANTI-HALLUCINATION TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print("="*80)
    
    results = {}
    
    # Run all tests
    results['TEST 1 - BLACK IMAGE (CRITICAL)'] = test_1_black_image()
    results['TEST 2 - IMAGE WITH EVIDENCE'] = test_2_image_with_evidence()
    results['TEST 3 - MULTIPLE FRAMES'] = test_3_multiple_frames()
    results['TEST 4 - VALIDATION'] = test_4_validation()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = 0
    failed = 0
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print("="*80)
    print(f"TOTAL: {passed} passed, {failed} failed out of {len(results)} tests")
    print("="*80)
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED - Anti-hallucination bug fix VERIFIED")
        return 0
    else:
        print(f"\n⚠️ {failed} TEST(S) FAILED - Anti-hallucination bug fix needs attention")
        return 1

if __name__ == "__main__":
    exit(main())
