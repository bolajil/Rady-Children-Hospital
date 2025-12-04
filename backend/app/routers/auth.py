from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import time
import os
from app.data.users import find_user_by_email, verify_password
from app.models.user import LoginRequest, LoginResponse, User, Role
from app.utils.jwt_simple import jwt_encode


router = APIRouter(prefix="/auth", tags=["Auth"])


class MeResponse(BaseModel):
    user: User


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        # Match the default in security.py for local/dev
        secret = "radychildrenhospital"
    return secret


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = find_user_by_email(payload.email)
    if not user or not verify_password(user, payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    now = int(time.time())
    exp = now + 60 * 60 * 8  # 8 hours
    token = jwt_encode(
        {
            "sub": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "patient_id": user.patient_id,
            "iat": now,
            "exp": exp,
        },
        _jwt_secret(),
    )

    return LoginResponse(access_token=token, user=user)


@router.get("/me", response_model=MeResponse)
async def me(token: Optional[str] = None):
    # This endpoint is mainly for debugging via query; in practice, frontend should call backend via Authorization header
    from app.utils.jwt_simple import jwt_decode
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt_decode(token, _jwt_secret())
        user = User(
            id=payload.get("sub"),
            email=payload.get("email"),
            full_name=payload.get("full_name"),
            role=payload.get("role", Role.patient),
            patient_id=payload.get("patient_id"),
            password_hash="",
        )
        return MeResponse(user=user)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
