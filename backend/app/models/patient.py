from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict

class Patient(BaseModel):
    id: str = ""
    mrn: str = ""  # Medical Record Number
    first_name: str
    last_name: str
    date_of_birth: date
    age: int
    gender: str
    phone: str
    email: str
    address: str
    emergency_contact: Dict[str, str]


class PatientCreate(BaseModel):
    """Request model for creating a new patient"""
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    parent_name: str
    parent_email: str
    parent_phone: str
    address: str = ""
    insurance_provider: str = ""
    insurance_id: str = ""
    allergies: str = ""
    medical_history: str = ""
    primary_care_physician: str = ""
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""

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
