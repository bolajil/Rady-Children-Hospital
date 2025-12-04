from pathlib import Path
import json
from typing import Dict, Optional
from hashlib import sha256
from app.models.user import User, Role

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "users.json"


def _hash_password(password: str, salt: str) -> str:
    return sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def _seed_users() -> Dict[str, User]:
    # Demo users with simple salted hashes (DO NOT use in production)
    owner = User(
        id="UOWNER",
        email="owner@example.com",
        full_name="System Owner",
        role=Role.owner,
        password_hash=_hash_password("ownerpass", "owner"),
    )
    doctor = User(
        id="UDOCTOR",
        email="doctor@example.com",
        full_name="Dr. Demo",
        role=Role.doctor,
        password_hash=_hash_password("doctorpass", "doctor"),
    )
    patient1 = User(
        id="UP001",
        email="emma.parent@example.com",
        full_name="Emma Johnson Parent",
        role=Role.patient,
        patient_id="P001",
        password_hash=_hash_password("patient1", "P001"),
    )
    patient2 = User(
        id="UP002",
        email="liam.parent@example.com",
        full_name="Liam Martinez Parent",
        role=Role.patient,
        patient_id="P002",
        password_hash=_hash_password("patient2", "P002"),
    )
    return {u.id: u for u in [owner, doctor, patient1, patient2]}


def _save_db(mapping: Dict[str, User]) -> None:
    payload = {uid: user.model_dump() for uid, user in mapping.items()}
    with DB_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def _load_db() -> Dict[str, User]:
    if DB_PATH.exists():
        try:
            with DB_PATH.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            return {k: User(**v) for k, v in raw.items()}
        except Exception:
            pass
    seeded = _seed_users()
    _save_db(seeded)
    return seeded


users_db: Dict[str, User] = _load_db()


def find_user_by_email(email: str) -> Optional[User]:
    for u in users_db.values():
        if u.email.lower() == email.lower():
            return u
    return None


def verify_password(user: User, password: str) -> bool:
    # Use patient_id/email local part as salt surrogate where available
    salt = user.patient_id or user.email.split("@")[0]
    return user.password_hash == _hash_password(password, salt)
