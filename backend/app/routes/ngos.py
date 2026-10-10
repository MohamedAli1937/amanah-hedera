from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_moderator,hash_password,require_roles
from ..database import get_db

from typing import Literal

router = APIRouter(prefix="/ngos", tags=["NGOs"])


@router.post("/",response_model=schemas.NGORead,status_code=status.HTTP_201_CREATED)
def register_ngo(ngo_data: schemas.NGOCreate,db: Session = Depends(get_db),):
    email = str(ngo_data.email).strip().lower()

    existing_ngo = db.query(models.NGO).filter(models.NGO.email == email).first()
    existing_moderator = db.query(models.Moderator).filter(models.Moderator.email == email).first()

    if existing_ngo or existing_moderator:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,detail="An account with this email already exists",)

    ngo = models.NGO(
        name=ngo_data.name.strip(),
        email=email,
        phone_number=ngo_data.phone_number,
        registration_document=ngo_data.registration_document,
        verification_status="pending",
    )

    try:
        db.add(ngo)
        db.flush()

        moderator = models.Moderator(
            email=email,
            password_hash=hash_password(ngo_data.password),
            role="ngo_admin",
            ngo_id=ngo.id,
            is_active=True,
        )

        db.add(moderator)
        db.commit()
        db.refresh(ngo)

    except Exception:
        db.rollback()
        raise

    return ngo


@router.get("/me/status",response_model=schemas.NGOStatusRead,)
def get_my_ngo_status(moderator: models.Moderator = Depends(get_current_moderator),db: Session = Depends(get_db),):
    if moderator.role != "ngo_admin" or moderator.ngo_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="This endpoint is for NGO administrators only",)

    ngo = db.query(models.NGO).filter(models.NGO.id == moderator.ngo_id).first()

    if ngo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="NGO not found",)

    return {
        "ngo_id": ngo.id,
        "ngo_name": ngo.name,
        "email": ngo.email,
        "phone_number": ngo.phone_number,
        "registration_document": ngo.registration_document,
        "verification_status": ngo.verification_status,
        "account_active": moderator.is_active,
    }


@router.get("/",response_model=list[schemas.NGORead],)
def list_ngos(db: Session = Depends(get_db),moderator: models.Moderator = Depends(require_roles("platform_admin")),):
    return db.query(models.NGO).order_by(models.NGO.id.desc()).all()


@router.patch("/{ngo_id}/verification")
def update_ngo_verification(
    ngo_id: int,
    verification_status: Literal["verified", "rejected"],
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin")),
):
    ngo = db.query(models.NGO).filter(models.NGO.id == ngo_id).first()

    if ngo is None:
        raise HTTPException(status_code=404,detail="NGO not found")

    ngo.verification_status = verification_status
    db.commit()
    db.refresh(ngo)
    return ngo