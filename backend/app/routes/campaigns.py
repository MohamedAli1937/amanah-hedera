
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

from ..auth import require_roles

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def financial_summary(db: Session, campaign_id: int):
    collected = (
        db.query(func.coalesce(func.sum(models.Donation.amount), 0))
        .filter(models.Donation.campaign_id == campaign_id, models.Donation.status == "confirmed",)
        .scalar()
    )

    expenses = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(models.Expense.campaign_id == campaign_id)
        .scalar()
    )

    donors = (
        db.query(func.count(models.Donation.id))
        .filter(models.Donation.campaign_id == campaign_id, models.Donation.status == "confirmed",)
        .scalar()
    )

    collected = Decimal(str(collected or 0))
    expenses = Decimal(str(expenses or 0))

    return {
        "collected_amount": collected,
        "number_of_donors": donors or 0,
        "recorded_expenses": expenses,
        "recorded_balance": collected - expenses,
    }


@router.get("/stats")
def get_campaigns_stats(db: Session = Depends(get_db)):
    total_campaigns = db.query(func.count(models.Campaign.id)).scalar() or 0
    active_campaigns = (
        db.query(func.count(models.Campaign.id))
        .filter(models.Campaign.status == "active")
        .scalar()
        or 0
    )
    total_collected = (
        db.query(func.coalesce(func.sum(models.Donation.amount), 0))
        .filter(models.Donation.status == "confirmed")
        .scalar()
        or Decimal("0")
    )
    total_donors = (
        db.query(func.count(models.Donation.id))
        .filter(models.Donation.status == "confirmed")
        .scalar()
        or 0
    )
    total_expenses = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0)).scalar()
        or Decimal("0")
    )
    total_events = db.query(func.count(models.AidEvent.id)).scalar() or 0
    hedera_confirmed_events = (
        db.query(func.count(models.AidEvent.id))
        .filter(models.AidEvent.hedera_status == "confirmed")
        .scalar()
        or 0
    )
    verified_ngos = (
        db.query(func.count(models.NGO.id))
        .filter(models.NGO.verification_status == "verified")
        .scalar()
        or 0
    )

    return {
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "total_collected": Decimal(str(total_collected)),
        "total_donors": total_donors,
        "total_expenses": Decimal(str(total_expenses)),
        "total_events": total_events,
        "hedera_confirmed_events": hedera_confirmed_events,
        "verified_ngos": verified_ngos,
    }


@router.get("/mine")
def list_my_campaigns(
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    query = db.query(models.Campaign)
    if moderator.role == "ngo_admin":
        query = query.filter(models.Campaign.ngo_id == moderator.ngo_id)

    campaigns = query.order_by(models.Campaign.created_at.desc()).all()

    return [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "goal": c.goal,
            "status": c.status,
            "ngo_id": c.ngo_id,
            "donation_link": c.donation_link,
            "created_at": c.created_at,
            **financial_summary(db, c.id),
        }
        for c in campaigns
    ]


@router.get("/")
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = (
        db.query(models.Campaign)
        .filter(models.Campaign.status.in_(["active", "goal_reached", "completed"]))
        .order_by(models.Campaign.created_at.desc())
        .all()
    )

    return [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "goal": c.goal,
            "status": c.status,
            "ngo_id": c.ngo_id,
            "donation_link": c.donation_link,
            "location_name": c.location_name,
            "region": c.region,
            "urgency": c.urgency,
            "lat": float(c.lat) if c.lat is not None else None,
            "lng": float(c.lng) if c.lng is not None else None,
            "image_url": c.image_url,
            "created_at": c.created_at,
            **financial_summary(db, c.id),
        }
        for c in campaigns
    ]


@router.get("/{campaign_id}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {
        "id": campaign.id,
        "title": campaign.title,
        "description": campaign.description,
        "goal": campaign.goal,
        "status": campaign.status,
        "ngo_id": campaign.ngo_id,
        "donation_link": campaign.donation_link,
        "location_name": campaign.location_name,
        "region": campaign.region,
        "urgency": campaign.urgency,
        "lat": float(campaign.lat) if campaign.lat is not None else None,
        "lng": float(campaign.lng) if campaign.lng is not None else None,
        "image_url": campaign.image_url,
        "created_at": campaign.created_at,
        **financial_summary(db, campaign.id),
    }

@router.post("/", response_model=schemas.CampaignRead, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: schemas.CampaignCreate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    ngo = db.query(models.NGO).filter(models.NGO.id == payload.ngo_id).first()

    if ngo is None:
        raise HTTPException(status_code=404, detail="NGO not found")

    if ngo.verification_status != "verified":
        raise HTTPException(status_code=403, detail="Only verified NGOs can create campaigns")

    if moderator.role == "ngo_admin" and moderator.ngo_id != ngo.id:
        raise HTTPException(status_code=403, detail="You can only manage your own NGO")

    campaign = models.Campaign(
        title=payload.title,
        description=payload.description,
        goal=payload.goal,
        ngo_id=ngo.id,
        donation_link=str(payload.donation_link) if payload.donation_link else None,
        status="active",
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return campaign


@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    payload: schemas.CampaignUpdate,
    db: Session = Depends(get_db),
    moderator: models.Moderator = Depends(require_roles("platform_admin", "ngo_admin")),
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if moderator.role == "ngo_admin" and moderator.ngo_id != campaign.ngo_id:
        raise HTTPException(status_code=403, detail="You can only manage your own NGO's campaigns")

    if payload.title is not None:
        campaign.title = payload.title
    if payload.description is not None:
        campaign.description = payload.description
    if payload.goal is not None:
        campaign.goal = payload.goal
    if payload.status is not None:
        campaign.status = payload.status
    if payload.donation_link is not None:
        campaign.donation_link = str(payload.donation_link)

    db.commit()
    db.refresh(campaign)

    return {
        "id": campaign.id,
        "title": campaign.title,
        "description": campaign.description,
        "goal": campaign.goal,
        "status": campaign.status,
        "ngo_id": campaign.ngo_id,
        "donation_link": campaign.donation_link,
        "created_at": campaign.created_at,
        **financial_summary(db, campaign.id),
    }
