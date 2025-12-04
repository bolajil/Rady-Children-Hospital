from pydantic import BaseModel, EmailStr
from enum import Enum
from typing import Optional


class Role(str, Enum):
    patient = "patient"
    doctor = "doctor"
    owner = "owner"


class User(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: Role
    # For patients, link to patient_id to scope data
    patient_id: Optional[str] = None
    # Passwords are stored hashed in real systems. For demo we will store bcrypt hash.
    password_hash: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
