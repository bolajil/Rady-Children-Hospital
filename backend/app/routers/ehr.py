from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from app.models.patient import Patient, HealthRecord
from app.data.sample_patients import (
    get_all_patients,
    get_patient_by_id,
    get_health_record,
    search_patients
)
from app.security import require_roles, CurrentUser, get_current_user
from app.models.user import Role

router = APIRouter(prefix="/ehr", tags=["EHR"])

# Import memory manager for patient chat history (using shared instance to avoid circular imports)
from app.memory_instance import get_memory_manager, is_memory_available

# Import audit logging for HIPAA compliance
from app.audit import log_phi_access, AuditEventType

@router.get("/patients", response_model=List[Patient])
async def list_patients(user: CurrentUser = Depends(require_roles(Role.doctor, Role.owner))):
    """Get list of all patients"""
    # Log PHI access
    log_phi_access(
        event_type=AuditEventType.VIEW_PATIENT,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value,
        resource_type="patient_list",
        details={"action": "list_all_patients"}
    )
    return get_all_patients()

@router.get("/patients/search", response_model=List[Patient])
async def search_patients_endpoint(q: str = Query(..., min_length=1), _: None = Depends(require_roles(Role.doctor, Role.owner))):
    """Search patients by name or MRN"""
    results = search_patients(q)
    if not results:
        raise HTTPException(status_code=404, detail="No patients found")
    return results

@router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, user: CurrentUser = Depends(require_roles(Role.doctor, Role.owner))):
    """Get patient details by ID"""
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Log PHI access
    log_phi_access(
        event_type=AuditEventType.VIEW_PATIENT,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value,
        resource_type="patient",
        resource_id=patient_id,
        patient_id=patient_id,
    )
    return patient

@router.get("/patients/{patient_id}/records", response_model=HealthRecord)
async def get_patient_records(patient_id: str, user: CurrentUser = Depends(require_roles(Role.doctor, Role.owner))):
    """Get patient health records"""
    # First check if patient exists
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get health records
    records = get_health_record(patient_id)
    if not records:
        raise HTTPException(status_code=404, detail="Health records not found")
    
    # Log PHI access
    log_phi_access(
        event_type=AuditEventType.VIEW_HEALTH_RECORD,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value,
        resource_type="health_record",
        resource_id=patient_id,
        patient_id=patient_id,
    )
    return records


@router.get("/patients/{patient_id}/chat-history")
async def get_patient_chat_history(patient_id: str, user: CurrentUser = Depends(require_roles(Role.doctor, Role.owner))):
    """
    Get chat history for a specific patient.
    Only accessible by doctors and owners.
    This allows clinicians to see what questions patients have been asking the AI assistant.
    """
    # First check if patient exists
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Log PHI access - viewing chat history is sensitive
    log_phi_access(
        event_type=AuditEventType.VIEW_CHAT_HISTORY,
        user_id=user.id,
        user_email=user.email,
        user_role=user.role.value,
        resource_type="chat_history",
        resource_id=patient_id,
        patient_id=patient_id,
    )
    
    memory_manager = get_memory_manager()
    if not is_memory_available() or not memory_manager:
        return {
            "patient_id": patient_id,
            "messages": [],
            "total": 0,
            "note": "Chat history is not available - memory manager not configured"
        }
    
    try:
        # Patient chat sessions are stored with session_id = "patient_{patient_id}"
        session_id = f"patient_{patient_id}"
        history = memory_manager.get_conversation_history(session_id)
        
        messages = []
        for msg in history:
            messages.append({
                "type": msg.type if hasattr(msg, 'type') else "unknown",
                "content": msg.content if hasattr(msg, 'content') else str(msg),
                "timestamp": getattr(msg, 'additional_kwargs', {}).get('timestamp', None)
            })
        
        return {
            "patient_id": patient_id,
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "messages": messages,
            "total": len(messages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat history: {str(e)}")
