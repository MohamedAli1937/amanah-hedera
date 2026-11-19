
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session


from ..database import get_db
from .. import models, schemas

from ..auth import require_roles

import logging

from ..services.hedera_service import (
    hash_donation,
    hash_event,
    hashscan_topic_url,
    hashscan_transaction_url,
    submit_donation_hash,
    submit_event_hash,
    verify_topic_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["campaign updates and finance"])


def get_campaign_or_404(db: Session, campaign_id: int):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


def serialize_expense(expense: models.Expense) -> dict:
    anchored = expense.hedera_status == "confirmed" and bool(expense.hedera_transaction_id)
    return {
        "id": expense.id,
        "campaign_id": expense.campaign_id,
        "amount": expense.amount,
        "description": expense.description,
        "proof_url": expense.proof_url,
        "created_at": expense.created_at,
        "event_hash": expense.event_hash,
        "hedera_topic_id": expense.hedera_topic_id,
        "hedera_transaction_id": expense.hedera_transaction_id,
        "hedera_sequence_number": expense.hedera_sequence_number,
        "hedera_status": expense.hedera_status,
        "hashscan_tx_url": hashscan_transaction_url(expense.hedera_transaction_id) if anchored else None,
        "hashscan_topic_url": hashscan_topic_url(expense.hedera_topic_id) if anchored else None,
    }


@router.get("/events/recent")
def list_recent_events(limit: int = 50, db: Session = Depends(get_db)):
    results = (
        db.query(models.AidEvent, models.Campaign.title.label("campaign_title"))
        .join(models.Campaign, models.AidEvent.campaign_id == models.Campaign.id)
        .filter(models.AidEvent.review_status == "approved")
        .order_by(models.AidEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    events_out = []
    for event, campaign_title in results:
        events_out.append({
            "id": event.id,
            "campaign_id": event.campaign_id,
            "campaign_title": campaign_title,
            "event_type": event.event_type,
            "description": event.description,
            "proof_url": event.proof_url,
            "created_at": event.created_at.isoformat() if event.created_at else None,
            "event_hash": event.event_hash,
            "hedera_topic_id": event.hedera_topic_id,
            "hedera_transaction_id": event.hedera_transaction_id,
            "hedera_sequence_number": event.hedera_sequence_number,
            "hedera_status": event.hedera_status,
            "hashscan_tx_url": (
                f"https://hashscan.io/testnet/transaction/{event.hedera_transaction_id}"
                if event.hedera_transaction_id
                else None
            ),
            "hashscan_topic_url": (
                f"https://hashscan.io/testnet/topic/{event.hedera_topic_id}"
                if event.hedera_topic_id
                else None
            ),
            "is_real_onchain": bool(event.hedera_transaction_id and event.hedera_status == "confirmed"),
        })
    donations = (
        db.query(models.Donation, models.Campaign.title.label("campaign_title"))
        .join(models.Campaign, models.Donation.campaign_id == models.Campaign.id)
        .filter(models.Donation.status == "confirmed")
        .order_by(models.Donation.created_at.desc())
        .limit(limit)
        .all()
    )
    for donation, campaign_title in donations:
        events_out.append({
            "id": f"donation-{donation.id}",
            "campaign_id": donation.campaign_id,
            "campaign_title": campaign_title,
            "event_type": "donation",
            "description": f"Donation recorded for {campaign_title}",
            "proof_url": None,
            "created_at": donation.created_at.isoformat() if donation.created_at else None,
            "event_hash": donation.donation_hash,
            "hedera_topic_id": donation.hedera_topic_id,
            "hedera_transaction_id": donation.hedera_transaction_id,
            "hedera_sequence_number": donation.hedera_sequence_number,
            "hedera_status": donation.hedera_status,
            "receipt_token": donation.receipt_token,
            "amount": float(donation.amount),
            "hashscan_tx_url": (
                f"https://hashscan.io/testnet/transaction/{donation.hedera_transaction_id}"
                if donation.hedera_transaction_id else None
            ),
            "is_real_onchain": bool(donation.hedera_transaction_id and donation.hedera_status == "confirmed"),
        })

    expenses = (
        db.query(models.Expense, models.Campaign.title.label("campaign_title"))
        .join(models.Campaign, models.Expense.campaign_id == models.Campaign.id)
        .order_by(models.Expense.created_at.desc())
        .limit(limit)
        .all()
    )
    for expense, campaign_title in expenses:
        events_out.append({
            "id": f"expense-{expense.id}",
            "campaign_id": expense.campaign_id,
            "campaign_title": campaign_title,
            "event_type": "expense",
            "description": expense.description,
            "proof_url": expense.proof_url,
            "created_at": expense.created_at.isoformat() if expense.created_at else None,
            "event_hash": expense.event_hash,
            "hedera_topic_id": expense.hedera_topic_id,
            "hedera_transaction_id": expense.hedera_transaction_id,
            "hedera_sequence_number": expense.hedera_sequence_number,
            "hedera_status": expense.hedera_status,
            "amount": float(expense.amount),
            "hashscan_tx_url": hashscan_transaction_url(expense.hedera_transaction_id),
            "hashscan_topic_url": hashscan_topic_url(expense.hedera_topic_id),
            "is_real_onchain": bool(expense.hedera_transaction_id and expense.hedera_status == "confirmed"),
        })

    updates = (
        db.query(models.CampaignUpdate, models.Campaign.title.label("campaign_title"))
        .join(models.Campaign, models.CampaignUpdate.campaign_id == models.Campaign.id)
        .order_by(models.CampaignUpdate.created_at.desc())
        .limit(limit)
        .all()
    )
    for update, campaign_title in updates:
        events_out.append({
            "id": f"update-{update.id}",
            "campaign_id": update.campaign_id,
            "campaign_title": campaign_title,
            "event_type": "update",
            "description": update.message,
            "proof_url": update.media_url,
            "created_at": update.created_at.isoformat() if update.created_at else None,
            "event_hash": update.event_hash,
            "hedera_topic_id": update.hedera_topic_id,
            "hedera_transaction_id": update.hedera_transaction_id,
            "hedera_sequence_number": update.hedera_sequence_number,
            "hedera_status": update.hedera_status,
            "hashscan_tx_url": hashscan_transaction_url(update.hedera_transaction_id),
            "hashscan_topic_url": hashscan_topic_url(update.hedera_topic_id),
            "is_real_onchain": bool(update.hedera_transaction_id and update.hedera_status == "confirmed"),
        })

    events_out.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return events_out[:limit]


@router.get("/campaigns/{campaign_id}/events", response_model=list[schemas.AidEventRead],)
def list_events(campaign_id: int, db: Session = Depends(get_db)):
    """Public milestone timeline – only moderator-approved aid events."""
    get_campaign_or_404(db, campaign_id)
    return (
        db.query(models.AidEvent)
        .filter(
            models.AidEvent.campaign_id == campaign_id,
            models.AidEvent.review_status == "approved",
        )
        .order_by(models.AidEvent.created_at.desc())
        .all()
    )


@router.get("/campaigns/{campaign_id}/events/all", response_model=list[schemas.AidEventRead])
def list_all_campaign_events(
    campaign_id: int,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    """NGO/admin view – includes pending and rejected milestones."""
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)
    return (
        db.query(models.AidEvent)
        .filter(models.AidEvent.campaign_id == campaign_id)
        .order_by(models.AidEvent.created_at.desc())
        .all()
    )


@router.post("/campaigns/{campaign_id}/events",response_model=schemas.AidEventRead,status_code=status.HTTP_201_CREATED,)
def create_event(
    campaign_id: int,
    payload: schemas.AidEventCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400,detail="Campaign ID mismatch")

    event = models.AidEvent(
        campaign_id=campaign_id,
        event_type=payload.event_type,
        description=payload.description,
        proof_url=str(payload.proof_url) if payload.proof_url else None,
        hedera_status="pending",
        review_status="pending",
    )

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/moderation/events")
def list_pending_events(
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin")),
):
    """Moderator queue of aid milestones waiting for review."""
    rows = (
        db.query(
            models.AidEvent,
            models.Campaign.title.label("campaign_title"),
            models.NGO.name.label("ngo_name"),
        )
        .join(models.Campaign, models.AidEvent.campaign_id == models.Campaign.id)
        .outerjoin(models.NGO, models.Campaign.ngo_id == models.NGO.id)
        .filter(models.AidEvent.review_status == "pending")
        .order_by(models.AidEvent.created_at.asc())
        .all()
    )
    return [
        {
            "id": event.id,
            "campaign_id": event.campaign_id,
            "campaign_title": campaign_title,
            "ngo_name": ngo_name or "Verified NGO",
            "event_type": event.event_type,
            "description": event.description,
            "proof_url": event.proof_url,
            "created_at": event.created_at,
            "review_status": event.review_status,
            "review_note": event.review_note,
            "reviewed_at": event.reviewed_at,
            "hedera_status": event.hedera_status,
        }
        for event, campaign_title, ngo_name in rows
    ]


@router.post("/events/{event_id}/review", response_model=schemas.AidEventRead)
def review_event(
    event_id: int,
    payload: schemas.AidEventReview,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin")),
):
    """Approve or reject a milestone. Only approvals are hashed and anchored on HCS."""
    event = db.query(models.AidEvent).filter(models.AidEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Aid event not found")
    if event.review_status != "pending":
        raise HTTPException(status_code=400, detail="Milestone has already been reviewed")

    event.review_status = "approved" if payload.decision == "approve" else "rejected"
    event.review_note = payload.note.strip() if payload.note else None
    event.reviewed_at = datetime.utcnow()

    if event.review_status == "rejected":
        db.commit()
        db.refresh(event)
        return event

    canonical_payload = {
        "id": event.id,
        "campaign_id": event.campaign_id,
        "event_type": event.event_type,
        "description": event.description,
        "proof_url": event.proof_url,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }
    event.event_hash = hash_event(canonical_payload)

    try:
        result = submit_event_hash(event.event_hash)
        event.hedera_topic_id = result["topic_id"]
        event.hedera_transaction_id = result["transaction_id"]
        event.hedera_sequence_number = result["sequence_number"]
        event.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera HCS submission failed while approving aid event %s", event.id)
        event.hedera_status = "failed"

    db.commit()
    db.refresh(event)
    return event


@router.get("/campaigns/{campaign_id}/expenses",response_model=list[schemas.ExpenseRead],)
def list_expenses(campaign_id: int, db: Session = Depends(get_db)):
    get_campaign_or_404(db, campaign_id)
    rows = (
        db.query(models.Expense)
        .filter(models.Expense.campaign_id == campaign_id)
        .order_by(models.Expense.created_at.desc())
        .all()
    )
    return [serialize_expense(row) for row in rows]


@router.post("/campaigns/{campaign_id}/expenses",response_model=schemas.ExpenseRead,status_code=status.HTTP_201_CREATED,)
def create_expense(campaign_id: int,
    payload: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)

    ensure_campaign_access(campaign, moderator)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")

    expense = models.Expense(
        campaign_id=campaign_id,
        amount=payload.amount,
        description=payload.description,
        proof_url=str(payload.proof_url) if payload.proof_url else None,
        hedera_status="not_anchored",
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    canonical = {
        "id": expense.id,
        "campaign_id": expense.campaign_id,
        "amount": str(expense.amount),
        "description": expense.description,
        "proof_url": expense.proof_url,
        "created_at": expense.created_at.isoformat() if expense.created_at else None,
    }
    expense.event_hash = hash_event(canonical)
    expense.hedera_status = "pending"
    try:
        result = submit_event_hash(expense.event_hash)
        expense.hedera_topic_id = result["topic_id"]
        expense.hedera_transaction_id = result["transaction_id"]
        expense.hedera_sequence_number = result["sequence_number"]
        expense.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera HCS submission failed for expense %s", expense.id)
        expense.hedera_status = "failed"

    db.commit()
    db.refresh(expense)
    return serialize_expense(expense)


@router.get("/campaigns/{campaign_id}/donations", response_model=list[schemas.DonationRead])
def list_campaign_donations(campaign_id: int,db: Session = Depends(get_db),moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)
    return (db.query(models.Donation).filter(models.Donation.campaign_id == campaign_id).order_by(models.Donation.created_at.desc()).all())


@router.post("/campaigns/{campaign_id}/donations", response_model=schemas.DonationRead, status_code=status.HTTP_201_CREATED)
def record_donation(campaign_id: int, payload: schemas.DonationCreate, db: Session = Depends(get_db)):
    campaign = get_campaign_or_404(db, campaign_id)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")

    if campaign.status not in ("active", "goal_reached"):
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")

    donation = models.Donation(
        campaign_id=campaign_id,
        amount=payload.amount,
        donor_name=payload.donor_name,
        status="pending",
        hedera_status="pending",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


@router.post("/campaigns/{campaign_id}/donations/record", response_model=schemas.DonationRead, status_code=status.HTTP_201_CREATED)
def record_confirmed_donation(
    campaign_id: int,
    payload: schemas.DonationCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = get_campaign_or_404(db, campaign_id)
    ensure_campaign_access(campaign, moderator)

    if payload.campaign_id != campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")
    if campaign.status not in ("active", "goal_reached"):
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")

    receipt_token = f"AMN-{secrets.token_hex(4).upper()}-PROOF"
    donation = models.Donation(
        campaign_id=campaign_id,
        amount=payload.amount,
        donor_name=payload.donor_name,
        status="confirmed",
        receipt_token=receipt_token,
        hedera_status="pending",
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)

    donation_data = {
        "receipt_token": donation.receipt_token,
        "campaign_id": donation.campaign_id,
        "amount": str(donation.amount),
        "donor_name": donation.donor_name,
        "created_at": donation.created_at.isoformat() if donation.created_at else None,
    }
    donation.donation_hash = hash_donation(donation_data)

    try:
        result = submit_donation_hash(
            receipt_token=donation.receipt_token,
            campaign_id=donation.campaign_id,
            amount=float(donation.amount),
            donation_hash=donation.donation_hash,
        )
        donation.hedera_topic_id = result["topic_id"]
        donation.hedera_transaction_id = result["transaction_id"]
        donation.hedera_sequence_number = result["sequence_number"]
        donation.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera HCS submission failed for donation %s", donation.id)
        donation.hedera_status = "pending"

    db.commit()
    db.refresh(donation)
    return donation


@router.post("/donations/{donation_id}/confirm", response_model=schemas.DonationRead)
def confirm_donation(donation_id: int, db: Session = Depends(get_db), moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin"))):
    donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()

    if donation is None:
        raise HTTPException(status_code=404, detail="Donation not found")

    campaign = get_campaign_or_404(db, donation.campaign_id)
    ensure_campaign_access(campaign, moderator)

    if donation.status != "pending":
        raise HTTPException(status_code=400, detail="Donation is not pending")

    donation.status = "confirmed"
    donation.receipt_token = secrets.token_urlsafe(32)

    donation_data = {
        "receipt_token": donation.receipt_token,
        "campaign_id": donation.campaign_id,
        "amount": str(donation.amount),
        "created_at": donation.created_at.isoformat() if donation.created_at else None,
    }
    donation.donation_hash = hash_donation(donation_data)

    try:
        result = submit_donation_hash(
            receipt_token=donation.receipt_token,
            campaign_id=donation.campaign_id,
            amount=float(donation.amount),
            donation_hash=donation.donation_hash,
        )
        donation.hedera_topic_id = result["topic_id"]
        donation.hedera_transaction_id = result["transaction_id"]
        donation.hedera_sequence_number = result["sequence_number"]
        donation.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera HCS submission failed for donation %s", donation.id)
        donation.hedera_status = "pending"

    db.commit()
    db.refresh(donation)

    return donation


def build_receipt(db: Session, donation: models.Donation) -> dict:
    """Shared receipt payload used by the lookup endpoint and phone pairing."""
    campaign = db.query(models.Campaign).filter(models.Campaign.id == donation.campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    ngo = db.query(models.NGO).filter(models.NGO.id == campaign.ngo_id).first()
    events_count = (
        db.query(func.count(models.AidEvent.id))
        .filter(
            models.AidEvent.campaign_id == campaign.id,
            models.AidEvent.review_status == "approved",
        )
        .scalar()
        or 0
    )

    is_verified_onchain = False
    consensus_timestamp = None
    if donation.hedera_topic_id and donation.hedera_sequence_number and donation.donation_hash:
        mirror_check = verify_topic_message(
            topic_id=donation.hedera_topic_id,
            sequence_number=donation.hedera_sequence_number,
            expected_hash=donation.donation_hash,
        )
        is_verified_onchain = bool(mirror_check.get("is_valid", False))
        consensus_timestamp = mirror_check.get("consensus_timestamp")

    return {
        "receipt_token": donation.receipt_token,
        "donation_id": donation.id,
        "campaign_id": campaign.id,
        "campaign_title": campaign.title,
        "amount": donation.amount,
        "donor_name": donation.donor_name,
        "donation_status": donation.status,
        "confirmed_at": donation.created_at,
        "ngo_name": ngo.name if ngo else "Unknown NGO",
        "ngo_verification_status": ngo.verification_status if ngo else "pending",
        "events_count": events_count,
        "donation_hash": donation.donation_hash,
        "hedera_topic_id": donation.hedera_topic_id,
        "hedera_sequence_number": donation.hedera_sequence_number,
        "hedera_transaction_id": donation.hedera_transaction_id,
        "is_verified_onchain": is_verified_onchain,
        "consensus_timestamp": consensus_timestamp,
        "hashscan_tx_url": (
            f"https://hashscan.io/testnet/transaction/{donation.hedera_transaction_id}"
            if donation.hedera_transaction_id
            else None
        ),
        "hashscan_topic_url": (
            f"https://hashscan.io/testnet/topic/{donation.hedera_topic_id}"
            if donation.hedera_topic_id
            else None
        ),
    }


@router.get("/donations/receipt/{receipt_token}", response_model=schemas.ReceiptVerification)
def get_donation_receipt(receipt_token: str, db: Session = Depends(get_db)):
    donation = db.query(models.Donation).filter(models.Donation.receipt_token == receipt_token).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Donation receipt not found")
    return build_receipt(db, donation)


@router.get("/events/{event_id}/verify", response_model=schemas.AidEventVerification)
def verify_event(event_id: str, db: Session = Depends(get_db)):
    str_id = str(event_id)
    if str_id.startswith("donation-"):
        try:
            donation_id = int(str_id.replace("donation-", ""))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid donation id")

        donation = db.query(models.Donation).filter(models.Donation.id == donation_id).first()
        if not donation:
            raise HTTPException(status_code=404, detail="Donation not found")

        canonical_payload = {
            "id": f"donation-{donation.id}",
            "campaign_id": donation.campaign_id,
            "event_type": "donation",
            "amount": float(donation.amount),
            "donor_name": donation.donor_name,
            "created_at": donation.created_at.isoformat() if donation.created_at else None,
        }
        calculated_hash = donation.donation_hash or hash_event(canonical_payload)

        mirror_check = {}
        if donation.hedera_topic_id and donation.hedera_sequence_number and donation.donation_hash:
            mirror_check = verify_topic_message(
                topic_id=donation.hedera_topic_id,
                sequence_number=donation.hedera_sequence_number,
                expected_hash=donation.donation_hash,
            )

        is_valid = bool(
            donation.donation_hash is not None
            and donation.hedera_status == "confirmed"
            and mirror_check.get("is_valid", False)
        )

        hashscan_tx_url = (
            f"https://hashscan.io/testnet/transaction/{donation.hedera_transaction_id}"
            if donation.hedera_transaction_id
            else None
        )
        hashscan_topic_url = (
            f"https://hashscan.io/testnet/topic/{donation.hedera_topic_id}"
            if donation.hedera_topic_id
            else None
        )

        return {
            "event_id": f"donation-{donation.id}",
            "canonical_payload": canonical_payload,
            "calculated_hash": calculated_hash,
            "stored_hash": donation.donation_hash,
            "is_valid": is_valid,
            "verified_at_mirror_node": mirror_check.get("verified_at_mirror_node", bool(donation.hedera_sequence_number)),
            "consensus_timestamp": mirror_check.get("consensus_timestamp"),
            "running_hash": mirror_check.get("running_hash"),
            "hedera_topic_id": donation.hedera_topic_id,
            "hedera_sequence_number": donation.hedera_sequence_number,
            "hedera_transaction_id": donation.hedera_transaction_id,
            "hedera_status": donation.hedera_status or "confirmed",
            "hashscan_tx_url": hashscan_tx_url,
            "hashscan_topic_url": hashscan_topic_url,
            "verification_message": (
                "Cryptographically verified on Hedera Testnet Consensus Topic"
                if is_valid
                else mirror_check.get("error") or "Donation recorded on Hedera"
            ),
        }

    try:
        numeric_id = int(str_id.replace("real-", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event id")

    event = db.query(models.AidEvent).filter(models.AidEvent.id == numeric_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Aid event not found")

    canonical_payload = {
        "id": event.id,
        "campaign_id": event.campaign_id,
        "event_type": event.event_type,
        "description": event.description,
        "proof_url": event.proof_url,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }

    calculated_hash = hash_event(canonical_payload)

    mirror_check = verify_topic_message(
        topic_id=event.hedera_topic_id,
        sequence_number=event.hedera_sequence_number,
        expected_hash=calculated_hash,
    )

    is_valid = bool(
        event.event_hash is not None
        and event.event_hash == calculated_hash
        and event.review_status == "approved"
        and event.hedera_status == "confirmed"
        and mirror_check.get("is_valid", False)
    )

    hashscan_tx_url = (
        f"https://hashscan.io/testnet/transaction/{event.hedera_transaction_id}"
        if event.hedera_transaction_id
        else None
    )
    hashscan_topic_url = (
        f"https://hashscan.io/testnet/topic/{event.hedera_topic_id}"
        if event.hedera_topic_id
        else None
    )

    return {
        "event_id": event.id,
        "canonical_payload": canonical_payload,
        "calculated_hash": calculated_hash,
        "stored_hash": event.event_hash,
        "is_valid": is_valid,
        "verified_at_mirror_node": mirror_check.get("verified_at_mirror_node", False),
        "consensus_timestamp": mirror_check.get("consensus_timestamp"),
        "running_hash": mirror_check.get("running_hash"),
        "hedera_topic_id": event.hedera_topic_id,
        "hedera_sequence_number": event.hedera_sequence_number,
        "hedera_transaction_id": event.hedera_transaction_id,
        "hedera_status": event.hedera_status,
        "hashscan_tx_url": hashscan_tx_url,
        "hashscan_topic_url": hashscan_topic_url,
        "verification_message": (
            "Cryptographically verified on Hedera Testnet Consensus Topic"
            if is_valid
            else mirror_check.get("error") or "Verification failed"
        ),
    }


@router.post("/events/{event_id}/anchor", response_model=schemas.AidEventRead)
def anchor_event_to_hedera(
    event_id: str,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    try:
        numeric_id = int(str(event_id).replace("real-", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event id")

    event = db.query(models.AidEvent).filter(models.AidEvent.id == numeric_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Aid event not found")
    if event.review_status != "approved":
        raise HTTPException(status_code=409, detail="Only approved milestones can be anchored on Hedera")

    campaign = get_campaign_or_404(db, event.campaign_id)
    ensure_campaign_access(campaign, moderator)

    canonical_payload = {
        "id": event.id,
        "campaign_id": event.campaign_id,
        "event_type": event.event_type,
        "description": event.description,
        "proof_url": event.proof_url,
        "created_at": event.created_at.isoformat(),
    }

    event.event_hash = hash_event(canonical_payload)

    try:
        result = submit_event_hash(event.event_hash)
        event.hedera_topic_id = result["topic_id"]
        event.hedera_transaction_id = result["transaction_id"]
        event.hedera_sequence_number = result["sequence_number"]
        event.hedera_status = "confirmed"
    except Exception:
        logger.exception("Hedera re-submission failed for aid event %s", event.id)
        event.hedera_status = "failed"
        db.commit()
        db.refresh(event)
        raise HTTPException(status_code=502, detail="Failed to anchor message on Hedera HCS")

    db.commit()
    db.refresh(event)
    return event


def ensure_campaign_access(campaign: models.Campaign, moderator: models.Moderator):
    if moderator.role == "ngo_admin" and moderator.ngo_id != campaign.ngo_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="You can only manage your own NGO's campaigns",)
