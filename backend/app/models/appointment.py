from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Appointment(BaseModel):
    model_config = {
        "extra": "allow",
        "json_schema_extra": {
            "example": {
                "id": "A001",
                "patient_id": "P001",
                "patient_name": "Emma Johnson",
                "provider": "Dr. Sarah Smith",
                "appointment_type": "Follow-up",
                "date": "2024-12-05T10:00:00",
                "duration": 30,
                "status": "scheduled",
                "reason": "Ear infection follow-up",
                "notes": "Check healing progress"
            }
        }
    }
    
    id: str
    patient_id: str
    patient_name: str
    provider: str
    appointment_type: str  # checkup, follow-up, urgent, consultation
    date: datetime
    duration: int  # minutes
    status: str  # scheduled, confirmed, completed, cancelled, no-show
    reason: str
    notes: Optional[str] = None

class AppointmentCreate(BaseModel):
    patient_id: str
    patient_name: str
    provider: str
    appointment_type: str
    date: datetime
    duration: int = 30
    reason: str
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    provider: Optional[str] = None
    appointment_type: Optional[str] = None
    date: Optional[datetime] = None
    duration: Optional[int] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
