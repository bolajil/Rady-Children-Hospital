"""
HIPAA Audit Logging and Violation Detection System

Tracks all access to Protected Health Information (PHI) and detects potential violations.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict
from enum import Enum
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    # Access events
    VIEW_PATIENT = "view_patient"
    VIEW_HEALTH_RECORD = "view_health_record"
    VIEW_CHAT_HISTORY = "view_chat_history"
    VIEW_APPOINTMENTS = "view_appointments"
    
    # Modification events
    CREATE_APPOINTMENT = "create_appointment"
    UPDATE_APPOINTMENT = "update_appointment"
    UPDATE_PATIENT = "update_patient"
    
    # Authentication events
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    
    # Potential violation events
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    BULK_DATA_ACCESS = "bulk_data_access"
    AFTER_HOURS_ACCESS = "after_hours_access"
    EXCESSIVE_QUERIES = "excessive_queries"


class ViolationSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AuditEvent:
    """Represents a single audit log entry."""
    id: str
    timestamp: datetime
    event_type: AuditEventType
    user_id: str
    user_email: str
    user_role: str
    resource_type: str  # e.g., "patient", "health_record", "appointment"
    resource_id: Optional[str] = None
    patient_id: Optional[str] = None  # For tracking PHI access
    ip_address: Optional[str] = None
    details: Dict = field(default_factory=dict)
    is_violation: bool = False
    violation_severity: Optional[ViolationSeverity] = None
    violation_reason: Optional[str] = None


class HIPAAAuditLogger:
    """
    HIPAA-compliant audit logging system.
    
    Tracks all access to PHI and detects potential violations based on:
    - Unauthorized access attempts
    - After-hours access patterns
    - Bulk data access
    - Excessive queries to patient records
    """
    
    def __init__(self):
        self._events: List[AuditEvent] = []
        self._event_counter = 0
        self._user_access_counts: Dict[str, Dict[str, int]] = {}  # user_id -> {date -> count}
        
        # Configuration
        self.business_hours_start = 7  # 7 AM
        self.business_hours_end = 19   # 7 PM
        self.max_patient_access_per_hour = 20
        self.max_bulk_access_threshold = 10  # Accessing 10+ patients in short time
        
        logger.info("HIPAA Audit Logger initialized")
    
    def log_event(
        self,
        event_type: AuditEventType,
        user_id: str,
        user_email: str,
        user_role: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> AuditEvent:
        """Log an audit event and check for potential violations."""
        
        self._event_counter += 1
        event_id = f"AUD-{self._event_counter:06d}"
        
        event = AuditEvent(
            id=event_id,
            timestamp=datetime.now(),
            event_type=event_type,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            resource_type=resource_type,
            resource_id=resource_id,
            patient_id=patient_id,
            ip_address=ip_address,
            details=details or {}
        )
        
        # Check for violations
        self._check_for_violations(event)
        
        # Store event
        self._events.append(event)
        
        # Track access counts
        self._track_access(user_id, patient_id)
        
        # Log to system logger
        if event.is_violation:
            logger.warning(f"HIPAA VIOLATION DETECTED: {event.violation_reason} - User: {user_email}")
        else:
            logger.info(f"Audit: {event_type.value} by {user_email} on {resource_type}/{resource_id}")
        
        return event
    
    def _check_for_violations(self, event: AuditEvent):
        """Check if an event represents a potential HIPAA violation."""
        
        # Check 1: Unauthorized access (already failed at auth level, but log it)
        if event.event_type == AuditEventType.UNAUTHORIZED_ACCESS:
            event.is_violation = True
            event.violation_severity = ViolationSeverity.HIGH
            event.violation_reason = "Attempted unauthorized access to PHI"
            return
        
        # Check 2: After-hours access (potential concern for review)
        current_hour = event.timestamp.hour
        if current_hour < self.business_hours_start or current_hour >= self.business_hours_end:
            if event.event_type in [AuditEventType.VIEW_PATIENT, AuditEventType.VIEW_HEALTH_RECORD]:
                event.is_violation = True
                event.violation_severity = ViolationSeverity.LOW
                event.violation_reason = f"After-hours PHI access at {event.timestamp.strftime('%H:%M')}"
                event.event_type = AuditEventType.AFTER_HOURS_ACCESS
        
        # Check 3: Patient accessing another patient's data
        if event.user_role == "patient" and event.patient_id:
            # Get user's own patient_id from details
            user_patient_id = event.details.get("user_patient_id")
            if user_patient_id and event.patient_id != user_patient_id:
                event.is_violation = True
                event.violation_severity = ViolationSeverity.CRITICAL
                event.violation_reason = f"Patient attempted to access another patient's records"
        
        # Check 4: Excessive queries (more than threshold in last hour)
        recent_access = self._count_recent_access(event.user_id, minutes=60)
        if recent_access > self.max_patient_access_per_hour:
            event.is_violation = True
            event.violation_severity = ViolationSeverity.MEDIUM
            event.violation_reason = f"Excessive PHI queries: {recent_access} accesses in last hour"
            event.event_type = AuditEventType.EXCESSIVE_QUERIES
        
        # Check 5: Bulk data access (many different patients in short time)
        unique_patients = self._count_unique_patients_accessed(event.user_id, minutes=10)
        if unique_patients >= self.max_bulk_access_threshold:
            event.is_violation = True
            event.violation_severity = ViolationSeverity.HIGH
            event.violation_reason = f"Bulk PHI access: {unique_patients} different patients in 10 minutes"
            event.event_type = AuditEventType.BULK_DATA_ACCESS
    
    def _track_access(self, user_id: str, patient_id: Optional[str]):
        """Track access counts for violation detection."""
        if not patient_id:
            return
        
        today = datetime.now().strftime("%Y-%m-%d")
        if user_id not in self._user_access_counts:
            self._user_access_counts[user_id] = {}
        if today not in self._user_access_counts[user_id]:
            self._user_access_counts[user_id][today] = 0
        self._user_access_counts[user_id][today] += 1
    
    def _count_recent_access(self, user_id: str, minutes: int = 60) -> int:
        """Count how many PHI accesses a user has made in the last N minutes."""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        return sum(
            1 for e in self._events
            if e.user_id == user_id and e.timestamp > cutoff and e.patient_id
        )
    
    def _count_unique_patients_accessed(self, user_id: str, minutes: int = 10) -> int:
        """Count unique patients accessed by a user in the last N minutes."""
        cutoff = datetime.now() - timedelta(minutes=minutes)
        patients = set(
            e.patient_id for e in self._events
            if e.user_id == user_id and e.timestamp > cutoff and e.patient_id
        )
        return len(patients)
    
    def get_all_events(self, limit: int = 100) -> List[AuditEvent]:
        """Get all audit events, most recent first."""
        return sorted(self._events, key=lambda e: e.timestamp, reverse=True)[:limit]
    
    def get_violations(self, limit: int = 50) -> List[AuditEvent]:
        """Get only violation events."""
        violations = [e for e in self._events if e.is_violation]
        return sorted(violations, key=lambda e: e.timestamp, reverse=True)[:limit]
    
    def get_violations_by_severity(self, severity: ViolationSeverity) -> List[AuditEvent]:
        """Get violations filtered by severity."""
        return [e for e in self._events if e.is_violation and e.violation_severity == severity]
    
    def get_user_activity(self, user_id: str, limit: int = 50) -> List[AuditEvent]:
        """Get activity for a specific user."""
        user_events = [e for e in self._events if e.user_id == user_id]
        return sorted(user_events, key=lambda e: e.timestamp, reverse=True)[:limit]
    
    def get_patient_access_log(self, patient_id: str, limit: int = 50) -> List[AuditEvent]:
        """Get all access events for a specific patient's data."""
        patient_events = [e for e in self._events if e.patient_id == patient_id]
        return sorted(patient_events, key=lambda e: e.timestamp, reverse=True)[:limit]
    
    def get_summary_stats(self) -> Dict:
        """Get summary statistics for the audit log."""
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        total_events = len(self._events)
        today_events = sum(1 for e in self._events if e.timestamp >= today_start)
        total_violations = sum(1 for e in self._events if e.is_violation)
        today_violations = sum(1 for e in self._events if e.is_violation and e.timestamp >= today_start)
        
        violations_by_severity = {
            "critical": len(self.get_violations_by_severity(ViolationSeverity.CRITICAL)),
            "high": len(self.get_violations_by_severity(ViolationSeverity.HIGH)),
            "medium": len(self.get_violations_by_severity(ViolationSeverity.MEDIUM)),
            "low": len(self.get_violations_by_severity(ViolationSeverity.LOW)),
        }
        
        return {
            "total_events": total_events,
            "today_events": today_events,
            "total_violations": total_violations,
            "today_violations": today_violations,
            "violations_by_severity": violations_by_severity,
            "unique_users_today": len(set(e.user_id for e in self._events if e.timestamp >= today_start)),
        }


# Global audit logger instance
_audit_logger: Optional[HIPAAAuditLogger] = None


def get_audit_logger() -> HIPAAAuditLogger:
    """Get or create the global audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = HIPAAAuditLogger()
    return _audit_logger


def log_phi_access(
    event_type: AuditEventType,
    user_id: str,
    user_email: str,
    user_role: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict] = None
) -> AuditEvent:
    """Convenience function to log PHI access events."""
    return get_audit_logger().log_event(
        event_type=event_type,
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        resource_type=resource_type,
        resource_id=resource_id,
        patient_id=patient_id,
        ip_address=ip_address,
        details=details
    )
