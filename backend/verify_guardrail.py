"""
PHI Guardrail Verification Script

Run this script to verify that the PHI guardrail is working correctly.
It tests PHI detection, redaction, and policy enforcement.

Usage:
    cd backend
    python verify_guardrail.py
"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.phi_guardrail import (
    PHIDetector,
    PHIGuardrail,
    TokenMapper,
    PHIType,
    PolicyAction,
    process_for_llm,
    restore_from_llm,
    PHIBlockedError
)


def test_phi_detection():
    """Test that PHI patterns are correctly detected"""
    print("\n=== Testing PHI Detection ===")
    detector = PHIDetector()
    
    test_cases = [
        ("My SSN is 123-45-6789", PHIType.SSN),
        ("Patient MRN: AB123456", PHIType.MRN),
        ("Call me at 858-576-1700", PHIType.PHONE),
        ("Email: patient@example.com", PHIType.EMAIL),
        ("Lives at 123 Main Street", PHIType.ADDRESS),
        ("DOB: 01/15/2018", PHIType.DOB),
        ("Zip code 92123", PHIType.ZIP_CODE),
    ]
    
    passed = 0
    failed = 0
    
    for text, expected_type in test_cases:
        matches = detector.detect(text)
        found_types = [m.phi_type for m in matches]
        
        if expected_type in found_types:
            print(f"  ✓ Detected {expected_type.value} in: '{text}'")
            passed += 1
        else:
            print(f"  ✗ FAILED to detect {expected_type.value} in: '{text}'")
            print(f"    Found: {[t.value for t in found_types]}")
            failed += 1
    
    print(f"\nDetection: {passed}/{passed+failed} tests passed")
    return failed == 0


def test_token_mapping():
    """Test token creation and retrieval"""
    print("\n=== Testing Token Mapping ===")
    mapper = TokenMapper(ttl_seconds=3600)
    
    session_id = "test-session"
    
    # Create tokens
    token1 = mapper.create_token(session_id, PHIType.SSN, "123-45-6789")
    token2 = mapper.create_token(session_id, PHIType.PHONE, "858-576-1700")
    
    # Same value should return same token
    token1_again = mapper.create_token(session_id, PHIType.SSN, "123-45-6789")
    
    passed = 0
    failed = 0
    
    # Test token format
    if token1 == "[SSN_1]":
        print(f"  ✓ Token format correct: {token1}")
        passed += 1
    else:
        print(f"  ✗ Token format wrong: {token1}, expected [SSN_1]")
        failed += 1
    
    # Test token reuse
    if token1 == token1_again:
        print(f"  ✓ Same value returns same token")
        passed += 1
    else:
        print(f"  ✗ Same value returned different token")
        failed += 1
    
    # Test value retrieval
    value = mapper.get_value(session_id, token1)
    if value == "123-45-6789":
        print(f"  ✓ Value retrieval correct")
        passed += 1
    else:
        print(f"  ✗ Value retrieval failed: got {value}")
        failed += 1
    
    print(f"\nToken Mapping: {passed}/{passed+failed} tests passed")
    return failed == 0


def test_guardrail_redaction():
    """Test that the guardrail redacts PHI correctly"""
    print("\n=== Testing Guardrail Redaction ===")
    
    test_input = "Patient John Smith (SSN: 123-45-6789) called from 858-576-1700 about their child."
    
    safe_text, token_map = process_for_llm(
        text=test_input,
        model_name="gpt-4o-mini",
        session_id="test-redaction"
    )
    
    passed = 0
    failed = 0
    
    # Check SSN is redacted
    if "123-45-6789" not in safe_text:
        print(f"  ✓ SSN redacted from output")
        passed += 1
    else:
        print(f"  ✗ SSN still present in output")
        failed += 1
    
    # Check phone is redacted
    if "858-576-1700" not in safe_text:
        print(f"  ✓ Phone redacted from output")
        passed += 1
    else:
        print(f"  ✗ Phone still present in output")
        failed += 1
    
    # Check tokens are in output
    if "[SSN_" in safe_text or "[PHONE_" in safe_text:
        print(f"  ✓ Tokens present in redacted output")
        passed += 1
    else:
        print(f"  ✗ No tokens found in output")
        failed += 1
    
    # Check token map is populated
    if len(token_map) > 0:
        print(f"  ✓ Token map has {len(token_map)} entries")
        passed += 1
    else:
        print(f"  ✗ Token map is empty")
        failed += 1
    
    print(f"\n  Original: {test_input}")
    print(f"  Redacted: {safe_text}")
    print(f"  Token Map: {token_map}")
    
    print(f"\nRedaction: {passed}/{passed+failed} tests passed")
    return failed == 0


def test_output_restoration():
    """Test that tokens can be restored in output"""
    print("\n=== Testing Output Restoration ===")
    
    test_input = "My phone is 858-576-1700"
    session_id = "test-restore"
    
    # Process input
    safe_text, token_map = process_for_llm(
        text=test_input,
        model_name="gpt-4o-mini",
        session_id=session_id
    )
    
    # Simulate LLM response that includes the token
    llm_response = f"I see your phone number is {list(token_map.keys())[0] if token_map else 'unknown'}. I'll help you with that."
    
    # Restore tokens
    restored = restore_from_llm(llm_response, token_map, restore=True)
    
    passed = 0
    failed = 0
    
    if "858-576-1700" in restored:
        print(f"  ✓ Phone number restored in output")
        passed += 1
    else:
        print(f"  ✗ Phone number not restored")
        failed += 1
    
    print(f"\n  LLM Response: {llm_response}")
    print(f"  Restored: {restored}")
    
    print(f"\nRestoration: {passed}/{passed+failed} tests passed")
    return failed == 0


def test_clean_input():
    """Test that clean input passes through unchanged"""
    print("\n=== Testing Clean Input ===")
    
    test_input = "What is the recommended dosage of acetaminophen for a toddler?"
    
    safe_text, token_map = process_for_llm(
        text=test_input,
        model_name="gpt-4o-mini",
        session_id="test-clean"
    )
    
    passed = 0
    failed = 0
    
    if safe_text == test_input:
        print(f"  ✓ Clean input unchanged")
        passed += 1
    else:
        print(f"  ✗ Clean input was modified")
        failed += 1
    
    if len(token_map) == 0:
        print(f"  ✓ No tokens created for clean input")
        passed += 1
    else:
        print(f"  ✗ Tokens created for clean input: {token_map}")
        failed += 1
    
    print(f"\nClean Input: {passed}/{passed+failed} tests passed")
    return failed == 0


def test_guardrail_stats():
    """Test that guardrail statistics are tracked"""
    print("\n=== Testing Guardrail Statistics ===")
    
    from app.phi_guardrail import get_guardrail
    guardrail = get_guardrail()
    
    stats = guardrail.get_stats()
    
    passed = 0
    failed = 0
    
    if "total_calls" in stats:
        print(f"  ✓ Stats tracking total calls: {stats['total_calls']}")
        passed += 1
    else:
        print(f"  ✗ Stats missing total_calls")
        failed += 1
    
    if stats.get("total_calls", 0) > 0:
        print(f"  ✓ Calls were recorded from previous tests")
        passed += 1
    else:
        print(f"  ✗ No calls recorded")
        failed += 1
    
    print(f"\n  Full stats: {stats}")
    
    print(f"\nStatistics: {passed}/{passed+failed} tests passed")
    return failed == 0


def main():
    """Run all verification tests"""
    print("=" * 60)
    print("PHI GUARDRAIL VERIFICATION")
    print("=" * 60)
    
    results = []
    
    results.append(("PHI Detection", test_phi_detection()))
    results.append(("Token Mapping", test_token_mapping()))
    results.append(("Guardrail Redaction", test_guardrail_redaction()))
    results.append(("Output Restoration", test_output_restoration()))
    results.append(("Clean Input", test_clean_input()))
    results.append(("Guardrail Stats", test_guardrail_stats()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED - PHI Guardrail is working correctly!")
    else:
        print("SOME TESTS FAILED - Review the output above")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
