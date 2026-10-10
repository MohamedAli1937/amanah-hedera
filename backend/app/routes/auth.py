
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models
from ..auth import create_access_token, get_current_moderator, verify_password
from ..database import get_db
from ..schemas import ModeratorRead, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(),db: Session = Depends(get_db),):
    email = form.username.strip().lower()
    moderator = db.query(models.Moderator).filter(models.Moderator.email == email).first()

    if (moderator is None or not moderator.is_active or not verify_password(form.password,moderator.password_hash,)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Incorrect email or password",headers={"WWW-Authenticate": "Bearer"},)

    return Token(access_token=create_access_token(moderator))


@router.get("/me", response_model=ModeratorRead)
def get_me(moderator: models.Moderator = Depends(get_current_moderator),):
    return moderator
