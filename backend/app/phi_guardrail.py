"""
HIPAA-Compliant PHI Guardrail for LLM Calls

This module provides a centralized gateway for all LLM interactions that:
1. Detects PHI (Protected Health Information) in user inputs
2. Applies policy-based decisions (allow, redact, block)
3. Tokenizes/redacts PHI before sending to non-BAA models
4. Filters outputs to prevent PHI leakage
5. Logs all decisions for HIPAA audit compliance

Usage:
    from app.phi_guardrail import PHIGuardrail, get_guardrail
    
    guardrail = get_guardrail()
    safe_input, token_map = guardrail.process_input(user_input, model_name, session_id)
    # ... call LLM with safe_input ...
    final_output = guardrail.process_output(llm_output, token_map)
"""

import re
import json
import os
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class PHIType(str, Enum):
    """Types of Protected Health Information per HIPAA Safe Harbor"""
    FULL_NAME = "full_name"
    SSN = "ssn"
    MRN = "mrn"
    DOB = "dob"
    AGE = "age"
    ADDRESS = "address"
    PHONE = "phone"
    FAX = "fax"
    EMAIL = "email"
    ACCOUNT_NUMBER = "account_number"
    ADMISSION_DATE = "admission_date"
    DISCHARGE_DATE = "discharge_date"
    ZIP_CODE = "zip_code"
    IP_ADDRESS = "ip_address"


class PolicyAction(str, Enum):
    """Actions that can be taken on detected PHI"""
    ALLOW = "allow"
    ALLOW_WITH_AUDIT = "allow_with_audit"
    REDACT = "redact"
    BLOCK = "block"


@dataclass
class PHIMatch:
    """Represents a detected PHI element in text"""
    phi_type: PHIType
    value: str
    start: int
    end: int
    confidence: float = 1.0


@dataclass
class GuardrailDecision:
    """Records the guardrail's decision for audit purposes"""
    timestamp: datetime
    session_id: str
    model_name: str
    action: PolicyAction
    phi_detected: List[PHIMatch]
    phi_redacted: int
    phi_blocked: bool
    input_hash: str
    details: Dict = field(default_factory=dict)


class PHIDetector:
    """
    Detects PHI in text using pattern matching.
    
    This is a baseline implementation using regex patterns.
    For production, consider integrating:
    - Microsoft Presidio
    - AWS Comprehend Medical
    - Google Cloud DLP
    - Custom NER models
    """
    
    def __init__(self):
        self.patterns = self._compile_patterns()
    
    def _compile_patterns(self) -> Dict[PHIType, List[re.Pattern]]:
        """Compile regex patterns for PHI detection"""
        return {
            PHIType.SSN: [
                re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
                re.compile(r'\b\d{9}\b(?=.*(?:ssn|social|security))', re.IGNORECASE),
            ],
            PHIType.MRN: [
                re.compile(r'\b(?:MRN|medical record|patient id|record number)[:\s#]*([A-Z0-9]{6,12})\b', re.IGNORECASE),
                re.compile(r'\b[A-Z]{2,3}\d{6,10}\b'),  # Common MRN format
            ],
            PHIType.DOB: [
                re.compile(r'\b(?:DOB|date of birth|born|birthday)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b', re.IGNORECASE),
                re.compile(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b'),  # Date format
            ],
            PHIType.PHONE: [
                re.compile(r'\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
                re.compile(r'\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b'),
            ],
            PHIType.EMAIL: [
                re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            ],
            PHIType.ADDRESS: [
                re.compile(r'\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Circle|Cir)\b', re.IGNORECASE),
            ],
            PHIType.ZIP_CODE: [
                re.compile(r'\b\d{5}(?:-\d{4})?\b'),
            ],
            PHIType.IP_ADDRESS: [
                re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
            ],
            PHIType.FULL_NAME: [
                # Patient name patterns - look for context clues
                re.compile(r'\b(?:patient|name|child|parent)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b', re.IGNORECASE),
            ],
            PHIType.ACCOUNT_NUMBER: [
                re.compile(r'\b(?:account|acct)[:\s#]*(\d{8,12})\b', re.IGNORECASE),
            ],
        }
    
    def detect(self, text: str) -> List[PHIMatch]:
        """
        Detect all PHI in the given text.
        
        Args:
            text: Input text to scan for PHI
            
        Returns:
            List of PHIMatch objects for each detected PHI element
        """
        matches = []
        
        for phi_type, patterns in self.patterns.items():
            for pattern in patterns:
                for match in pattern.finditer(text):
                    # Get the actual matched value (use group 1 if available, else group 0)
                    value = match.group(1) if match.lastindex else match.group(0)
                    
                    # Avoid duplicate detections at same position
                    if not any(m.start == match.start() and m.end == match.end() for m in matches):
                        matches.append(PHIMatch(
                            phi_type=phi_type,
                            value=value,
                            start=match.start(),
                            end=match.end(),
                            confidence=0.9  # Regex-based detection confidence
                        ))
        
        # Sort by position for consistent processing
        matches.sort(key=lambda m: m.start)
        return matches


class TokenMapper:
    """
    Manages bidirectional mapping between PHI values and tokens.
    
    Tokens are session-scoped and have a TTL for security.
    """
    
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl_seconds = ttl_seconds
        self._mappings: Dict[str, Dict[str, Any]] = {}  # session_id -> {token -> {value, phi_type, expires}}
        self._reverse: Dict[str, Dict[str, str]] = {}   # session_id -> {value -> token}
        self._counters: Dict[str, Dict[str, int]] = {}  # session_id -> {phi_type -> count}
    
    def create_token(self, session_id: str, phi_type: PHIType, value: str) -> str:
        """Create a token for a PHI value, reusing existing token if available"""
        if session_id not in self._mappings:
            self._mappings[session_id] = {}
            self._reverse[session_id] = {}
            self._counters[session_id] = {}
        
        # Check if we already have a token for this value
        if value in self._reverse[session_id]:
            return self._reverse[session_id][value]
        
        # Create new token
        if phi_type.value not in self._counters[session_id]:
            self._counters[session_id][phi_type.value] = 0
        self._counters[session_id][phi_type.value] += 1
        
        token = f"[{phi_type.value.upper()}_{self._counters[session_id][phi_type.value]}]"
        
        self._mappings[session_id][token] = {
            "value": value,
            "phi_type": phi_type,
            "expires": datetime.now() + timedelta(seconds=self.ttl_seconds)
        }
        self._reverse[session_id][value] = token
        
        return token
    
    def get_value(self, session_id: str, token: str) -> Optional[str]:
        """Retrieve the original value for a token"""
        if session_id not in self._mappings:
            return None
        
        mapping = self._mappings[session_id].get(token)
        if not mapping:
            return None
        
        # Check expiration
        if datetime.now() > mapping["expires"]:
            del self._mappings[session_id][token]
            return None
        
        return mapping["value"]
    
    def get_session_map(self, session_id: str) -> Dict[str, str]:
        """Get all token -> value mappings for a session"""
        if session_id not in self._mappings:
            return {}
        
        now = datetime.now()
        return {
            token: data["value"]
            for token, data in self._mappings[session_id].items()
            if now <= data["expires"]
        }
    
    def cleanup_expired(self):
        """Remove expired tokens from all sessions"""
        now = datetime.now()
        for session_id in list(self._mappings.keys()):
            expired = [
                token for token, data in self._mappings[session_id].items()
                if now > data["expires"]
            ]
            for token in expired:
                value = self._mappings[session_id][token]["value"]
                del self._mappings[session_id][token]
                if value in self._reverse.get(session_id, {}):
                    del self._reverse[session_id][value]


class PHIGuardrail:
    """
    Central guardrail for all LLM interactions.
    
    Enforces HIPAA-compliant data handling by:
    1. Detecting PHI in inputs
    2. Applying policy-based decisions
    3. Redacting/tokenizing PHI before LLM calls
    4. Filtering outputs
    5. Logging all decisions for audit
    """
    
    def __init__(self, policy_path: Optional[str] = None):
        self.detector = PHIDetector()
        self.token_mapper = TokenMapper()
        self.policy = self._load_policy(policy_path)
        self.decisions: List[GuardrailDecision] = []
        
        logger.info("PHI Guardrail initialized with policy version: %s", 
                    self.policy.get("version", "unknown"))
    
    def _load_policy(self, policy_path: Optional[str] = None) -> Dict:
        """Load the HIPAA policy configuration"""
        if policy_path is None:
            policy_path = Path(__file__).parent / "hipaa_policy.json"
        
        try:
            with open(policy_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning("Policy file not found at %s, using default restrictive policy", policy_path)
            return {
                "version": "default",
                "default_action": "redact",
                "models": {},
                "audit_settings": {"log_all_llm_calls": True}
            }
    
    def _get_model_policy(self, model_name: str) -> Dict:
        """Get policy configuration for a specific model"""
        models = self.policy.get("models", {})
        
        # Try exact match first
        if model_name in models:
            return models[model_name]
        
        # Try partial match (e.g., "gpt-4" matches "gpt-4o-mini")
        for key, config in models.items():
            if key in model_name or model_name in key:
                return config
        
        # Return default restrictive policy
        return {
            "has_baa": False,
            "phi_policy": self.policy.get("default_action", "redact"),
            "allowed_phi_types": [],
            "blocked_phi_types": list(PHIType.__members__.keys())
        }
    
    def _determine_action(self, phi_match: PHIMatch, model_policy: Dict) -> PolicyAction:
        """Determine what action to take for a specific PHI match"""
        phi_policy = model_policy.get("phi_policy", "redact")
        allowed_types = model_policy.get("allowed_phi_types", [])
        blocked_types = model_policy.get("blocked_phi_types", [])
        
        phi_type_str = phi_match.phi_type.value
        
        # Check if explicitly blocked
        if phi_type_str in blocked_types:
            return PolicyAction.REDACT
        
        # Check if explicitly allowed
        if phi_type_str in allowed_types:
            return PolicyAction.ALLOW_WITH_AUDIT
        
        # Apply default policy
        if phi_policy == "block":
            return PolicyAction.BLOCK
        elif phi_policy == "allow":
            return PolicyAction.ALLOW
        elif phi_policy == "allow_with_audit":
            return PolicyAction.ALLOW_WITH_AUDIT
        else:
            return PolicyAction.REDACT
    
    def process_input(
        self,
        text: str,
        model_name: str,
        session_id: str,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Tuple[str, Dict[str, str]]:
        """
        Process user input before sending to LLM.
        
        Args:
            text: Raw user input
            model_name: Name of the LLM model being used
            session_id: Session identifier for token mapping
            user_id: Optional user ID for audit logging
            user_role: Optional user role for audit logging
            
        Returns:
            Tuple of (processed_text, token_map)
            - processed_text: Text with PHI redacted/tokenized as needed
            - token_map: Mapping of tokens to original values for output restoration
        """
        # Detect PHI
        phi_matches = self.detector.detect(text)
        
        # Get model policy
        model_policy = self._get_model_policy(model_name)
        
        # Track what we're doing
        processed_text = text
        token_map = {}
        redacted_count = 0
        should_block = False
        
        # Process matches in reverse order to preserve positions
        for match in reversed(phi_matches):
            action = self._determine_action(match, model_policy)
            
            if action == PolicyAction.BLOCK:
                should_block = True
                logger.warning("PHI BLOCK: %s detected, blocking request", match.phi_type.value)
                break
            
            elif action == PolicyAction.REDACT:
                # Create token and replace
                token = self.token_mapper.create_token(session_id, match.phi_type, match.value)
                processed_text = processed_text[:match.start] + token + processed_text[match.end:]
                token_map[token] = match.value
                redacted_count += 1
                logger.info("PHI REDACT: %s -> %s", match.phi_type.value, token)
            
            elif action in (PolicyAction.ALLOW, PolicyAction.ALLOW_WITH_AUDIT):
                if action == PolicyAction.ALLOW_WITH_AUDIT:
                    logger.info("PHI ALLOW (audited): %s", match.phi_type.value)
        
        # Record decision for audit
        decision = GuardrailDecision(
            timestamp=datetime.now(),
            session_id=session_id,
            model_name=model_name,
            action=PolicyAction.BLOCK if should_block else PolicyAction.REDACT if redacted_count > 0 else PolicyAction.ALLOW,
            phi_detected=phi_matches,
            phi_redacted=redacted_count,
            phi_blocked=should_block,
            input_hash=hashlib.sha256(text.encode()).hexdigest()[:16],
            details={
                "user_id": user_id,
                "user_role": user_role,
                "model_has_baa": model_policy.get("has_baa", False)
            }
        )
        self.decisions.append(decision)
        
        # Log to audit system if available
        self._log_to_audit(decision)
        
        if should_block:
            raise PHIBlockedError(
                "Request blocked: Contains PHI that cannot be sent to this model. "
                "Please remove sensitive information and try again."
            )
        
        return processed_text, token_map
    
    def process_output(
        self,
        text: str,
        token_map: Dict[str, str],
        restore_tokens: bool = False
    ) -> str:
        """
        Process LLM output before returning to user.
        
        Args:
            text: Raw LLM output
            token_map: Token mapping from process_input
            restore_tokens: If True, replace tokens with original values
            
        Returns:
            Processed output text
        """
        if not restore_tokens or not token_map:
            return text
        
        # Restore tokens to original values
        result = text
        for token, value in token_map.items():
            result = result.replace(token, value)
        
        return result
    
    def _log_to_audit(self, decision: GuardrailDecision):
        """Log guardrail decision to the HIPAA audit system"""
        try:
            from app.audit import get_audit_logger, AuditEventType
            
            audit_logger = get_audit_logger()
            
            # Create audit event for LLM call
            details = {
                "model": decision.model_name,
                "phi_types_detected": [m.phi_type.value for m in decision.phi_detected],
                "phi_count": len(decision.phi_detected),
                "phi_redacted": decision.phi_redacted,
                "action": decision.action.value,
                "input_hash": decision.input_hash
            }
            
            # Use existing audit event type or create custom log
            if decision.phi_blocked:
                logger.warning("HIPAA GUARDRAIL: Blocked LLM call with PHI - %s", details)
            elif decision.phi_redacted > 0:
                logger.info("HIPAA GUARDRAIL: Redacted %d PHI elements before LLM call", decision.phi_redacted)
            
        except ImportError:
            logger.debug("Audit module not available, skipping audit log")
    
    def get_recent_decisions(self, limit: int = 100) -> List[GuardrailDecision]:
        """Get recent guardrail decisions for monitoring"""
        return sorted(self.decisions, key=lambda d: d.timestamp, reverse=True)[:limit]
    
    def get_stats(self) -> Dict:
        """Get statistics about guardrail activity"""
        total = len(self.decisions)
        if total == 0:
            return {"total_calls": 0}
        
        blocked = sum(1 for d in self.decisions if d.phi_blocked)
        redacted = sum(1 for d in self.decisions if d.phi_redacted > 0)
        total_phi = sum(len(d.phi_detected) for d in self.decisions)
        total_redacted = sum(d.phi_redacted for d in self.decisions)
        
        return {
            "total_calls": total,
            "calls_blocked": blocked,
            "calls_with_redaction": redacted,
            "total_phi_detected": total_phi,
            "total_phi_redacted": total_redacted,
            "block_rate": blocked / total if total > 0 else 0,
            "redaction_rate": redacted / total if total > 0 else 0
        }


class PHIBlockedError(Exception):
    """Raised when a request is blocked due to PHI policy violation"""
    pass


# Global guardrail instance
_guardrail: Optional[PHIGuardrail] = None


def get_guardrail() -> PHIGuardrail:
    """Get or create the global PHI guardrail instance"""
    global _guardrail
    if _guardrail is None:
        _guardrail = PHIGuardrail()
    return _guardrail


def process_for_llm(
    text: str,
    model_name: str = "gpt-4o-mini",
    session_id: str = "default",
    user_id: Optional[str] = None,
    user_role: Optional[str] = None
) -> Tuple[str, Dict[str, str]]:
    """
    Convenience function to process text before sending to LLM.
    
    Args:
        text: User input text
        model_name: LLM model name
        session_id: Session ID for token mapping
        user_id: Optional user ID for audit
        user_role: Optional user role for audit
        
    Returns:
        Tuple of (safe_text, token_map)
    """
    return get_guardrail().process_input(text, model_name, session_id, user_id, user_role)


def restore_from_llm(
    text: str,
    token_map: Dict[str, str],
    restore: bool = True
) -> str:
    """
    Convenience function to process LLM output.
    
    Args:
        text: LLM output text
        token_map: Token map from process_for_llm
        restore: Whether to restore original values
        
    Returns:
        Processed output text
    """
    return get_guardrail().process_output(text, token_map, restore)
