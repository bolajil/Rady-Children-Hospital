from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
import time
from app.utils.jwt_simple import jwt_decode
from app.models.user import Role


bearer_scheme = HTTPBearer(auto_error=True)


class CurrentUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    patient_id: str | None = None


def get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        # Demo default provided by owner for local/dev
        secret = "radychildrenhospital"
    return secret


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> CurrentUser:
    token = creds.credentials
    try:
        payload = jwt_decode(token, get_jwt_secret())
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    # Basic exp/iat sanity if present
    now = int(time.time())
    if "nbf" in payload and int(payload["nbf"]) > now:
        raise HTTPException(status_code=401, detail="Token not yet valid")

    try:
        return CurrentUser(
            id=payload.get("sub", ""),
            email=payload.get("email", ""),
            full_name=payload.get("full_name", ""),
            role=payload.get("role", Role.patient),
            patient_id=payload.get("patient_id"),
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")


def require_roles(*allowed: Role):
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return _checker
