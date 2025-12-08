"""
HIPAA Compliance API Routes

Provides endpoints for viewing audit logs and HIPAA violations.
Only accessible by owners (admins).
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime

from app.security import require_roles, CurrentUser
from app.models.user import Role
from app.audit import (
    get_audit_logger,
    AuditEventType,
    ViolationSeverity,
    log_phi_access
)

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/audit-log")
async def get_audit_log(
    limit: int = 100,
    user: CurrentUser = Depends(require_roles(Role.owner))
):
    """
    Get the full audit log. Only accessible by owners/admins.
    """
    audit_logger = get_audit_logger()
    events = audit_logger.get_all_events(limit=limit)
    
    return {
        "events": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type.value,
                "user_email": e.user_email,
                "user_role": e.user_role,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "patient_id": e.patient_id,
                "is_violation": e.is_violation,
                "violation_severity": e.violation_severity.value if e.violation_severity else None,
                "violation_reason": e.violation_reason,
                "details": e.details,
            }
            for e in events
        ],
        "total": len(events)
    }


@router.get("/violations")
async def get_violations(
    severity: Optional[str] = None,
    limit: int = 50,
    user: CurrentUser = Depends(require_roles(Role.owner))
):
    """
    Get HIPAA violations. Only accessible by owners/admins.
    """
    audit_logger = get_audit_logger()
    
    if severity:
        try:
            sev = ViolationSeverity(severity.lower())
            violations = audit_logger.get_violations_by_severity(sev)[:limit]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid severity: {severity}")
    else:
        violations = audit_logger.get_violations(limit=limit)
    
    return {
        "violations": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type.value,
                "user_email": e.user_email,
                "user_role": e.user_role,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "patient_id": e.patient_id,
                "severity": e.violation_severity.value if e.violation_severity else None,
                "reason": e.violation_reason,
            }
            for e in violations
        ],
        "total": len(violations)
    }


@router.get("/summary")
async def get_compliance_summary(
    user: CurrentUser = Depends(require_roles(Role.owner))
):
    """
    Get compliance summary statistics. Only accessible by owners/admins.
    """
    audit_logger = get_audit_logger()
    stats = audit_logger.get_summary_stats()
    
    return {
        "summary": stats,
        "compliance_status": "compliant" if stats["total_violations"] == 0 else "violations_detected",
        "last_updated": datetime.now().isoformat()
    }


@router.get("/patient/{patient_id}/access-log")
async def get_patient_access_log(
    patient_id: str,
    limit: int = 50,
    user: CurrentUser = Depends(require_roles(Role.owner))
):
    """
    Get all access events for a specific patient's PHI.
    Useful for auditing who accessed a patient's data.
    """
    audit_logger = get_audit_logger()
    events = audit_logger.get_patient_access_log(patient_id, limit=limit)
    
    return {
        "patient_id": patient_id,
        "access_events": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type.value,
                "user_email": e.user_email,
                "user_role": e.user_role,
                "is_violation": e.is_violation,
                "violation_reason": e.violation_reason,
            }
            for e in events
        ],
        "total": len(events)
    }


@router.get("/user/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    limit: int = 50,
    user: CurrentUser = Depends(require_roles(Role.owner))
):
    """
    Get all activity for a specific user.
    Useful for investigating suspicious behavior.
    """
    audit_logger = get_audit_logger()
    events = audit_logger.get_user_activity(user_id, limit=limit)
    
    return {
        "user_id": user_id,
        "activity": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "event_type": e.event_type.value,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "patient_id": e.patient_id,
                "is_violation": e.is_violation,
            }
            for e in events
        ],
        "total": len(events)
    }


# Helper function to simulate some violations for demo purposes
@router.post("/demo/generate-sample-events")
async def generate_sample_events(
    user: CurrentUser = Depends(require_roles(Role.owner))
):
    """
    Generate sample audit events for demo purposes.
    Only accessible by owners/admins.
    """
    audit_logger = get_audit_logger()
    
    # Sample normal events
    log_phi_access(
        event_type=AuditEventType.VIEW_PATIENT,
        user_id="doctor-1",
        user_email="doctor@example.com",
        user_role="doctor",
        resource_type="patient",
        resource_id="P001",
        patient_id="P001",
    )
    
    log_phi_access(
        event_type=AuditEventType.VIEW_HEALTH_RECORD,
        user_id="doctor-1",
        user_email="doctor@example.com",
        user_role="doctor",
        resource_type="health_record",
        resource_id="HR001",
        patient_id="P001",
    )
    
    # Sample after-hours access (if current time is during business hours, this will be logged as normal)
    log_phi_access(
        event_type=AuditEventType.VIEW_PATIENT,
        user_id="doctor-1",
        user_email="doctor@example.com",
        user_role="doctor",
        resource_type="patient",
        resource_id="P002",
        patient_id="P002",
    )
    
    # Sample unauthorized access attempt
    log_phi_access(
        event_type=AuditEventType.UNAUTHORIZED_ACCESS,
        user_id="unknown",
        user_email="hacker@malicious.com",
        user_role="unknown",
        resource_type="patient",
        resource_id="P001",
        patient_id="P001",
        details={"reason": "Invalid authentication token"}
    )
    
    # Sample patient trying to access another patient's data
    log_phi_access(
        event_type=AuditEventType.VIEW_PATIENT,
        user_id="patient-2",
        user_email="other.patient@example.com",
        user_role="patient",
        resource_type="patient",
        resource_id="P001",
        patient_id="P001",
        details={"user_patient_id": "P002"}  # This patient is P002, trying to access P001
    )
    
    return {
        "message": "Sample events generated",
        "stats": audit_logger.get_summary_stats()
    }
