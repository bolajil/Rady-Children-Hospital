from fastapi import APIRouter, HTTPException, Query, Depends
import logging
from typing import List, Optional
from datetime import datetime, timezone
from app.models.appointment import Appointment, AppointmentCreate, AppointmentUpdate
from app.data.sample_appointments import (
    get_all_appointments,
    get_appointment_by_id,
    get_appointments_by_date,
    get_appointments_by_patient,
    create_appointment,
    update_appointment,
    delete_appointment
)
import uuid
from app.security import get_current_user
from app.models.user import Role
from app.security import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.get("/", response_model=List[Appointment])
async def list_appointments(
    date: Optional[str] = None,
    patient_id: Optional[str] = None,
    status: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Get list of appointments with optional filters
    - date: Filter by date (YYYY-MM-DD)
    - patient_id: Filter by patient ID
    - status: Filter by status (scheduled, confirmed, completed, cancelled)
    """
    try:
        appointments = get_all_appointments()

        # Apply filters
        if date:
            try:
                filter_date = datetime.fromisoformat(date)
                appointments = [apt for apt in appointments if apt.date.date() == filter_date.date()]
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        # RBAC: patients can only see their own appointments regardless of query
        if user.role == Role.patient:
            effective_patient_id = user.patient_id
            appointments = [apt for apt in appointments if apt.patient_id == effective_patient_id]
        elif patient_id:
            appointments = [apt for apt in appointments if apt.patient_id == patient_id]

        if status:
            appointments = [apt for apt in appointments if apt.status == status]

        # Normalize datetimes first to ensure consistent, serializable values
        normalized: list[Appointment] = []
        for apt in appointments:
            dt = apt.date
            # Convert any string-like accidents defensively
            if isinstance(dt, str):
                # Support trailing Z
                try:
                    s = dt.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(s)
                except Exception:
                    logger.warning("Could not parse appointment date string: %s (id=%s)", dt, getattr(apt, 'id', 'unknown'))
            # Make timezone-aware (UTC)
            if isinstance(dt, datetime):
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                else:
                    dt = dt.astimezone(timezone.utc)
            # Rebuild the model with normalized date
            try:
                apt_norm = Appointment(**{**apt.model_dump(), "date": dt})
            except Exception as e:
                logger.exception("Failed to normalize appointment id=%s: %s", getattr(apt, 'id', 'unknown'), e)
                raise
            normalized.append(apt_norm)

        appointments = normalized

        # Sort by date
        # Normalize datetimes to a common, comparable form to avoid mixing
        # naive (no tz) and aware (UTC/Z) datetimes which raises TypeError
        def _to_epoch_seconds(dt: datetime) -> float:
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc).timestamp()
            return dt.astimezone(timezone.utc).timestamp()

        appointments.sort(key=lambda x: _to_epoch_seconds(x.date))

        # Return JSON-serializable dicts to avoid any serialization edge cases
        # (e.g., timezone-aware datetimes) during FastAPI's response encoding.
        return [apt.model_dump(mode="json") for apt in appointments]
    except Exception as e:
        # Log the full stack trace for diagnosis and return the message upstream
        logger.exception("Failed to list appointments")
        raise HTTPException(status_code=500, detail=f"List appointments failed: {e}")

@router.get("/{appointment_id}", response_model=Appointment)
async def get_appointment(appointment_id: str):
    """Get appointment details by ID"""
    appointment = get_appointment_by_id(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.post("/", response_model=Appointment, status_code=201)
async def create_new_appointment(appointment_data: AppointmentCreate, user: CurrentUser = Depends(get_current_user)):
    """Create a new appointment"""
    # Generate new appointment ID
    new_id = f"A{str(uuid.uuid4())[:8].upper()}"
    
    # Create appointment object
    # RBAC: patients may only create for their own patient_id
    if user.role == Role.patient:
        if user.patient_id is None:
            raise HTTPException(status_code=400, detail="Patient account not linked to a patient_id")
        if appointment_data.patient_id and appointment_data.patient_id != user.patient_id:
            raise HTTPException(status_code=403, detail="Patients can only create appointments for themselves")
        enforced_patient_id = user.patient_id
        enforced_patient_name = appointment_data.patient_name
    else:
        enforced_patient_id = appointment_data.patient_id
        enforced_patient_name = appointment_data.patient_name

    new_appointment = Appointment(
        id=new_id,
        patient_id=enforced_patient_id,
        patient_name=enforced_patient_name,
        provider=appointment_data.provider,
        appointment_type=appointment_data.appointment_type,
        date=appointment_data.date,
        duration=appointment_data.duration,
        status="scheduled",
        reason=appointment_data.reason,
        notes=appointment_data.notes
    )
    
    # Save appointment
    created = create_appointment(new_appointment)
    return created

@router.put("/{appointment_id}", response_model=Appointment)
async def update_appointment_endpoint(appointment_id: str, updates: AppointmentUpdate, user: CurrentUser = Depends(get_current_user)):
    """Update an existing appointment"""
    # RBAC: patients can only update their own future appointments
    current = get_appointment_by_id(appointment_id)
    if not current:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user.role == Role.patient:
        if current.patient_id != user.patient_id:
            raise HTTPException(status_code=403, detail="Cannot update another patient's appointment")
        now_utc = datetime.now(timezone.utc)
        # Normalize dt
        dt = current.date
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if dt <= now_utc or current.status in {"completed", "cancelled"}:
            raise HTTPException(status_code=400, detail="Cannot update past or finalized appointments")
        # Prevent changing patient ownership
        if updates and updates.dict(exclude_unset=True).get("patient_id") not in (None, user.patient_id):
            raise HTTPException(status_code=400, detail="Cannot change patient on appointment")
    # Convert updates to dict, excluding None values
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    updated = update_appointment(appointment_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return updated

@router.delete("/{appointment_id}", status_code=204)
async def cancel_appointment(appointment_id: str, user: CurrentUser = Depends(get_current_user)):
    """Cancel an appointment (soft delete by setting status to cancelled)"""
    current = get_appointment_by_id(appointment_id)
    if not current:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user.role == Role.patient:
        if current.patient_id != user.patient_id:
            raise HTTPException(status_code=403, detail="Cannot cancel another patient's appointment")
        now_utc = datetime.now(timezone.utc)
        dt = current.date
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if dt <= now_utc or current.status in {"completed", "cancelled"}:
            raise HTTPException(status_code=400, detail="Cannot cancel past or finalized appointments")
    # Update status to cancelled instead of deleting
    updated = update_appointment(appointment_id, {"status": "cancelled"})
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return None
