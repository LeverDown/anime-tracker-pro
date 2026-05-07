"""
Auth Utility Module
DEPRECATED: SHA-256 algorithm.
This module replaces SHA-256 with bcrypt (primary) and argon2 (fallback).
"""
import sentry_sdk
import bcrypt

def hash_password(plain: str) -> str:
    """
    Hashes a plaintext password using bcrypt.
    """
    try:
        # Encode string to bytes, hash, then decode back to string for DB storage
        pwd_bytes = plain.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pwd_bytes, salt)
        return hashed.decode('utf-8')
    except Exception as e:
        sentry_sdk.capture_exception(e)
        raise

def verify_password(plain: str, hashed: str) -> tuple[bool, bool]:
    """Returns (is_correct, needs_rehash)"""
    try:
        # SEC-004: Handle Legacy SHA-256 (unsalted)
        # Note: In a production environment, this should be followed by an immediate
        # upgrade to bcrypt upon successful login.
        if len(hashed) == 64:
            import hashlib
            if hashlib.sha256(plain.encode('utf-8')).hexdigest() == hashed:
                return True, True  # Correct, but needs rehash
            return False, False

        # Modern Bcrypt check
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8')), False
    except Exception:
        return False, False

import os
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "access"})
    if not SECRET_KEY:
        raise ValueError("JWT_SECRET environment variable is not set")
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "type": "refresh"})
    if not SECRET_KEY:
        raise ValueError("JWT_SECRET environment variable is not set")
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from fastapi import Request

def get_current_user(request: Request):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Try to get token from cookie
    token = request.cookies.get("access_token")
    
    # 2. Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        if username is None or token_type != "access":
            raise credentials_exception
        return username
    except jwt.ExpiredSignatureError:
        raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
