from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict

class Patient(BaseModel):
    id: str
    mrn: str  # Medical Record Number
    first_name: str
    last_name: str
    date_of_birth: date
    age: int
    gender: str
    phone: str
    email: str
    address: str
    emergency_contact: Dict[str, str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "P001",
                "mrn": "MRN-2024-001",
                "first_name": "Emma",
                "last_name": "Johnson",
                "date_of_birth": "2018-05-15",
                "age": 6,
                "gender": "Female",
                "phone": "(555) 123-4567",
                "email": "parent@example.com",
                "address": "123 Main St, San Diego, CA 92101",
                "emergency_contact": {
                    "name": "Sarah Johnson",
                    "relationship": "Mother",
                    "phone": "(555) 123-4567"
                }
            }
        }

class Vitals(BaseModel):
    height: str
    weight: str
    blood_pressure: str
    heart_rate: str
    temperature: str
    respiratory_rate: str
    oxygen_saturation: str
    last_updated: str

class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None
    prescriber: str
    status: str = "active"

class Diagnosis(BaseModel):
    condition: str
    date: str
    status: str
    icd_code: Optional[str] = None

class HealthRecord(BaseModel):
    patient_id: str
    vitals: Vitals
    medications: List[Medication]
    allergies: List[str]
    diagnoses: List[Diagnosis]
    immunizations: List[Dict[str, str]]
    lab_results: List[Dict[str, str]]
    visit_history: List[Dict[str, str]]
