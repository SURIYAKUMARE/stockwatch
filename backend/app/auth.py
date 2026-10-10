import os
import hmac
import hashlib
import json
import base64
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, status, Header
from sqlmodel import Session, select

from backend import models
from backend.app.database import get_session

SECRET_KEY = os.getenv("STOCKWATCH_SECRET_KEY", "stockwatch-phc-defense-grade-token-key-2026")
TOKEN_EXPIRY_SECONDS = 86400  # 24 hours

# ─── Password Hashing & Verification ─────────────────────────────
def hash_password(password: str) -> str:
    """Hash password using salted PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}${key.hex()}"

def verify_password(password: str, hashed_value: str) -> bool:
    """Verify password against salt$hash representation (or legacy pbkdf2 format)."""
    if not hashed_value:
        return False
    if '$' not in hashed_value:
        return False
    try:
        parts = hashed_value.split('$')
        if len(parts) == 2:
            salt_hex, key_hex = parts
            salt = bytes.fromhex(salt_hex)
            expected_key = bytes.fromhex(key_hex)
            test_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
            return hmac.compare_digest(expected_key, test_key)
        elif len(parts) == 4 and parts[0] == 'pbkdf2':
            # pbkdf2$algo$salt$digest
            _, algo, salt_str, stored_hex = parts
            digest = hashlib.pbkdf2_hmac(algo, password.encode(), salt_str.encode(), 260000)
            return digest.hex() == stored_hex
    except Exception:
        return False
    return False

# ─── JWT Token Management ─────────────────────────────────────────
def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s.encode('utf-8'))

def create_access_token(user_id: str, role: str, username: str = "", scopes: Optional[Dict[str, Any]] = None) -> str:
    """Generate signed JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role,
        "username": username or user_id,
        "scopes": scopes or {},
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS
    }
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    message = f"{header_b64}.{payload_b64}"
    sig = hmac.new(SECRET_KEY.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).digest()
    return f"{message}.{base64url_encode(sig)}"

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and verify JWT signature."""
    parts = token.split('.')
    if len(parts) != 3:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")
    header_b64, payload_b64, sig_b64 = parts
    message = f"{header_b64}.{payload_b64}"
    expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).digest()
    actual_sig = base64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
    try:
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Corrupted token payload")
    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return payload

# ─── FastAPI Dependencies & RBAC ─────────────────────────────────
def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> models.User:
    """Dependency extracting the authenticated user with server-side RBAC."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive or suspended")
    return user

def get_optional_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> Optional[models.User]:
    """Optional user dependency for public routes."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split("Bearer ", 1)[1].strip()
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        return session.get(models.User, user_id)
    except Exception:
        return None

def require_role(allowed_roles: List[str]):
    """Role-based Access Control guard."""
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of {allowed_roles}. Current role is '{current_user.role}'."
            )
        return current_user
    return role_checker

def verify_jurisdiction(user: models.User, district_id: Optional[str], session: Session) -> bool:
    """Verify that a user is authorized for the given district."""
    if user.role in ("national_officer", "state_officer"):
        return True
    scope = session.exec(select(models.UserScope).where(models.UserScope.user_id == user.id)).first()
    if not scope:
        return True
    if district_id and scope.district_id and scope.district_id != district_id:
        return False
    return True

# ─── Audit Logging Helper ─────────────────────────────────────────
def record_audit(
    session: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str,
    user_role: str,
    details: str = ""
):
    """Write an immutable audit log entry."""
    audit = models.AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        user_role=user_role,
        details=details
    )
    session.add(audit)
    session.commit()
