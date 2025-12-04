from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from app.models.patient import Patient, HealthRecord
from app.data.sample_patients import (
    get_all_patients,
    get_patient_by_id,
    get_health_record,
    search_patients
)
from app.security import require_roles
from app.models.user import Role

router = APIRouter(prefix="/ehr", tags=["EHR"])

@router.get("/patients", response_model=List[Patient])
async def list_patients(_: None = Depends(require_roles(Role.doctor, Role.owner))):
    """Get list of all patients"""
    return get_all_patients()

@router.get("/patients/search", response_model=List[Patient])
async def search_patients_endpoint(q: str = Query(..., min_length=1), _: None = Depends(require_roles(Role.doctor, Role.owner))):
    """Search patients by name or MRN"""
    results = search_patients(q)
    if not results:
        raise HTTPException(status_code=404, detail="No patients found")
    return results

@router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, _: None = Depends(require_roles(Role.doctor, Role.owner))):
    """Get patient details by ID"""
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/patients/{patient_id}/records", response_model=HealthRecord)
async def get_patient_records(patient_id: str, _: None = Depends(require_roles(Role.doctor, Role.owner))):
    """Get patient health records"""
    # First check if patient exists
    patient = get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get health records
    records = get_health_record(patient_id)
    if not records:
        raise HTTPException(status_code=404, detail="Health records not found")
    return records
