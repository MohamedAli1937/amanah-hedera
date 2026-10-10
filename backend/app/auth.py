
import os
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from . import models
from .database import get_db

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters")

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(moderator: models.Moderator) -> str:
    now = datetime.now(timezone.utc)

    payload = {"sub": str(moderator.id),"iat": now,"exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),}

    return jwt.encode(payload,JWT_SECRET_KEY,algorithm=JWT_ALGORITHM,)


def get_current_moderator(token: str = Depends(oauth2_scheme),db: Session = Depends(get_db),) -> models.Moderator:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Invalid or expired token",headers={"WWW-Authenticate": "Bearer"})

    try:
        payload = jwt.decode(token,JWT_SECRET_KEY,algorithms=[JWT_ALGORITHM],)
        subject = payload.get("sub")

        if not subject:
            raise unauthorized

        moderator_id = int(subject)
    except (InvalidTokenError, ValueError, TypeError):
        raise unauthorized

    moderator = db.query(models.Moderator).filter(models.Moderator.id == moderator_id).first()

    if moderator is None or not moderator.is_active:
        raise unauthorized

    return moderator


def require_roles(*roles: str):
    def role_checker(moderator: models.Moderator = Depends(get_current_moderator),db: Session = Depends(get_db),) -> models.Moderator:
        if moderator.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

        if moderator.role == "ngo_admin":
            ngo = db.query(models.NGO).filter(models.NGO.id == moderator.ngo_id).first()

            if ngo is None:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="NGO account not found")

            if ngo.verification_status == "pending":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Your NGO application is pending moderator approval")

            if ngo.verification_status == "rejected":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Your NGO application has been rejected")

            if ngo.verification_status != "verified":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Your NGO is not authorized to manage campaigns")

        return moderator

    return role_checker