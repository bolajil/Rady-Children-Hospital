from datetime import datetime, timedelta, timezone
from app.models.appointment import Appointment
from pathlib import Path
import json
from typing import Dict, List

# Generate appointments for the next 2 weeks
today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

SAMPLE_APPOINTMENTS = [
    # Today's appointments
    Appointment(
        id="A001",
        patient_id="P001",
        patient_name="Emma Johnson",
        provider="Dr. Sarah Smith",
        appointment_type="Follow-up",
        date=today.replace(hour=10, minute=0),
        duration=30,
        status="confirmed",
        reason="Ear infection follow-up",
        notes="Check healing progress after antibiotic treatment"
    ),
    Appointment(
        id="A002",
        patient_id="P003",
        patient_name="Sophia Chen",
        provider="Dr. Emily Rodriguez",
        appointment_type="Checkup",
        date=today.replace(hour=14, minute=0),
        duration=45,
        status="confirmed",
        reason="Asthma management review",
        notes="Review spirometry results"
    ),
    Appointment(
        id="A003",
        patient_id="P004",
        patient_name="Noah Williams",
        provider="Dr. Sarah Smith",
        appointment_type="Urgent",
        date=today.replace(hour=16, minute=30),
        duration=20,
        status="scheduled",
        reason="Persistent cough",
        notes="URI follow-up"
    ),
    
    # Tomorrow
    Appointment(
        id="A004",
        patient_id="P002",
        patient_name="Liam Martinez",
        provider="Dr. James Lee",
        appointment_type="Checkup",
        date=(today + timedelta(days=1)).replace(hour=9, minute=0),
        duration=30,
        status="scheduled",
        reason="4-year wellness visit",
        notes="Vaccinations due"
    ),
    Appointment(
        id="A005",
        patient_id="P005",
        patient_name="Olivia Brown",
        provider="Dr. Emily Rodriguez",
        appointment_type="Follow-up",
        date=(today + timedelta(days=1)).replace(hour=11, minute=0),
        duration=30,
        status="scheduled",
        reason="Allergy consultation",
        notes="Discuss seasonal allergy management"
    ),
    
    # This week
    Appointment(
        id="A006",
        patient_id="P001",
        patient_name="Emma Johnson",
        provider="Dr. Sarah Smith",
        appointment_type="Checkup",
        date=(today + timedelta(days=3)).replace(hour=10, minute=30),
        duration=30,
        status="scheduled",
        reason="6-year wellness visit",
        notes="School physical"
    ),
    Appointment(
        id="A007",
        patient_id="P003",
        patient_name="Sophia Chen",
        provider="Dr. James Lee",
        appointment_type="Consultation",
        date=(today + timedelta(days=4)).replace(hour=13, minute=0),
        duration=45,
        status="scheduled",
        reason="Sports physical",
        notes="Clearance for soccer team"
    ),
    Appointment(
        id="A008",
        patient_id="P002",
        patient_name="Liam Martinez",
        provider="Dr. Sarah Smith",
        appointment_type="Follow-up",
        date=(today + timedelta(days=5)).replace(hour=15, minute=0),
        duration=20,
        status="scheduled",
        reason="Vaccination follow-up",
        notes="Check for any reactions"
    ),
    
    # Next week
    Appointment(
        id="A009",
        patient_id="P004",
        patient_name="Noah Williams",
        provider="Dr. Emily Rodriguez",
        appointment_type="Checkup",
        date=(today + timedelta(days=7)).replace(hour=9, minute=30),
        duration=30,
        status="scheduled",
        reason="2-year wellness visit",
        notes="Developmental screening"
    ),
    Appointment(
        id="A010",
        patient_id="P005",
        patient_name="Olivia Brown",
        provider="Dr. James Lee",
        appointment_type="Checkup",
        date=(today + timedelta(days=8)).replace(hour=11, minute=30),
        duration=30,
        status="scheduled",
        reason="Annual checkup",
        notes="Growth and development assessment"
    ),
    
    # Completed appointments (past)
    Appointment(
        id="A011",
        patient_id="P001",
        patient_name="Emma Johnson",
        provider="Dr. Sarah Smith",
        appointment_type="Urgent",
        date=(today - timedelta(days=10)).replace(hour=14, minute=0),
        duration=30,
        status="completed",
        reason="Ear pain",
        notes="Diagnosed with acute otitis media"
    ),
    Appointment(
        id="A012",
        patient_id="P002",
        patient_name="Liam Martinez",
        provider="Dr. James Lee",
        appointment_type="Checkup",
        date=(today - timedelta(days=6)).replace(hour=10, minute=0),
        duration=30,
        status="completed",
        reason="Annual checkup",
        notes="All vaccinations up to date"
    ),
]

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "appointments.json"


def _to_iso(dt: datetime) -> str:
    """Serialize datetime to ISO 8601 with Z (UTC)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    # Use timespec=seconds to avoid overly precise strings
    return dt.isoformat().replace("+00:00", "Z")


def _from_iso(s: str) -> datetime:
    """Deserialize datetime from ISO 8601, supporting Z suffix."""
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _serialize(apt: Appointment) -> Dict:
    data = apt.model_dump()
    data["date"] = _to_iso(apt.date)
    return data


def _deserialize(data: Dict) -> Appointment:
    d = dict(data)
    d["date"] = _from_iso(d["date"]) if isinstance(d.get("date"), str) else d.get("date")
    return Appointment(**d)


def _save_db(mapping: Dict[str, Appointment]) -> None:
    payload = {_id: _serialize(apt) for _id, apt in mapping.items()}
    with DB_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def _load_db() -> Dict[str, Appointment]:
    if DB_PATH.exists():
        try:
            with DB_PATH.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            return {k: _deserialize(v) for k, v in raw.items()}
        except Exception:
            # If file is corrupted, fall back to sample and overwrite
            pass
    # Seed from samples and persist
    seeded = {apt.id: apt for apt in SAMPLE_APPOINTMENTS}
    _save_db(seeded)
    return seeded


# In-memory mapping backed by JSON file on disk
appointments_db: Dict[str, Appointment] = _load_db()

def get_all_appointments() -> List[Appointment]:
    return list(appointments_db.values())

def get_appointment_by_id(appointment_id: str):
    return appointments_db.get(appointment_id)

def get_appointments_by_date(date: datetime):
    return [apt for apt in appointments_db.values() 
            if apt.date.date() == date.date()]

def get_appointments_by_patient(patient_id: str):
    return [apt for apt in appointments_db.values() 
            if apt.patient_id == patient_id]

def create_appointment(appointment: Appointment):
    appointments_db[appointment.id] = appointment
    _save_db(appointments_db)
    return appointment

def update_appointment(appointment_id: str, updates: dict):
    if appointment_id in appointments_db:
        apt = appointments_db[appointment_id]
        # Create updated appointment by merging existing data with updates
        apt_data = apt.model_dump()
        for key, value in updates.items():
            if value is not None and key in apt_data:
                apt_data[key] = value
        # Normalize date if passed as string
        if isinstance(apt_data.get("date"), str):
            apt_data["date"] = _from_iso(apt_data["date"])
        updated_apt = Appointment(**apt_data)
        appointments_db[appointment_id] = updated_apt
        _save_db(appointments_db)
        return updated_apt
    return None

def delete_appointment(appointment_id: str):
    if appointment_id in appointments_db:
        removed = appointments_db.pop(appointment_id)
        _save_db(appointments_db)
        return removed
    return None
