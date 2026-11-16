import json
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .events import build_receipt

router = APIRouter(prefix="/pairing", tags=["pairing"])

PAIRING_TTL = timedelta(minutes=3)


def load_session(db: Session, code: str) -> models.PairingSession:
    session = db.query(models.PairingSession).filter(models.PairingSession.code == code).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Pairing session not found")
    if session.status == "waiting" and session.expires_at < datetime.utcnow():
        session.status = "expired"
        db.commit()
        db.refresh(session)
    return session


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_pairing_session(db: Session = Depends(get_db)):
    """Public: start a short-lived PC ↔ phone pairing session (anonymous donors)."""
    now = datetime.utcnow()
    session = models.PairingSession(
        code=secrets.token_urlsafe(18),
        poll_secret=secrets.token_urlsafe(18),
        status="waiting",
        created_at=now,
        expires_at=now + PAIRING_TTL,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "code": session.code,
        "poll_secret": session.poll_secret,
        "expires_at": session.expires_at,
        "scan_path": f"/#/scan/{session.code}",
    }


@router.get("/sessions/{code}")
def poll_pairing_session(code: str, secret: str, db: Session = Depends(get_db)):
    session = load_session(db, code)
    if not secrets.compare_digest(session.poll_secret, secret):
        raise HTTPException(status_code=403, detail="Invalid pairing secret")

    if session.status == "ready" and session.result_json:
        result = json.loads(session.result_json)
        session.status = "consumed"
        db.commit()
        return {"status": "ready", "result": result}

    return {"status": session.status, "expires_at": session.expires_at}


@router.post("/sessions/{code}/submit")
def submit_pairing_scan(
    code: str,
    payload: schemas.PairingSubmit,
    db: Session = Depends(get_db),
):
    """Public: the phone sends the scanned paper-receipt token to the waiting session."""
    session = load_session(db, code)
    if session.status == "expired":
        raise HTTPException(status_code=410, detail="Pairing session expired")
    if session.status != "waiting":
        raise HTTPException(status_code=409, detail="Pairing session already used")

    token = payload.receipt_token.strip()
    donation = db.query(models.Donation).filter(models.Donation.receipt_token == token).first()
    if donation is None:
        raise HTTPException(status_code=404, detail="Donation receipt not found")

    receipt = build_receipt(db, donation)
    session.status = "ready"
    session.receipt_token = token
    session.result_json = json.dumps(receipt, default=str)
    session.used_at = datetime.utcnow()
    db.commit()
    return {"status": "ready"}
