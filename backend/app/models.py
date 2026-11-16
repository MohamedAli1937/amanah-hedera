
from datetime import datetime
from sqlalchemy import (CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, Text,Boolean)
from sqlalchemy.orm import relationship

from .database import Base


class NGO(Base):
    __tablename__ = "ngos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(320), unique=True, nullable=False, index=True)
    phone_number = Column(String(40), nullable=True)
    registration_document = Column(String(500), nullable=True)
    verification_status = Column(String(20), nullable=False, default="pending")

    campaigns = relationship("Campaign", back_populates="ngo")

    __table_args__ = (CheckConstraint("verification_status IN ('pending', 'verified', 'rejected')"),)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    goal = Column(Numeric(12, 3), nullable=False)
    status = Column(String(20), default="draft", nullable=False)
    donation_link = Column(String(1000), nullable=True)
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=False, index=True)
    location_name = Column(String(255), nullable=True)
    region = Column(String(100), nullable=True)
    urgency = Column(String(50), nullable=True)
    lat = Column(Numeric(9, 6), nullable=True)
    lng = Column(Numeric(9, 6), nullable=True)
    image_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ngo = relationship("NGO", back_populates="campaigns")
    donations = relationship("Donation", back_populates="campaign")
    expenses = relationship("Expense", back_populates="campaign")
    aid_events = relationship("AidEvent", back_populates="campaign", order_by="AidEvent.created_at")

    __table_args__ = (
        CheckConstraint("goal > 0"),
        CheckConstraint("status IN ('draft', 'active', 'goal_reached', 'completed', 'suspended')"),
    )


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    amount = Column(Numeric(12, 3), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    receipt_token = Column(String(128), unique=True, nullable=True, index=True)
    donor_name = Column(String(255), nullable=True)
    donation_hash = Column(String(64), nullable=True)
    hedera_topic_id = Column(String(100), nullable=True)
    hedera_transaction_id = Column(String(100), nullable=True)
    hedera_sequence_number = Column(Integer, nullable=True)
    hedera_status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="donations")

    __table_args__ = (
        CheckConstraint("amount > 0"),
        CheckConstraint("status IN ('pending', 'confirmed', 'rejected')"),
    )


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    amount = Column(Numeric(12, 3), nullable=False)
    description = Column(Text, nullable=False)
    proof_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    event_hash = Column(String(64), nullable=True)
    hedera_topic_id = Column(String(100), nullable=True)
    hedera_transaction_id = Column(String(100), nullable=True)
    hedera_sequence_number = Column(Integer, nullable=True)
    hedera_status = Column(String(20), nullable=False, default="not_anchored")

    campaign = relationship("Campaign", back_populates="expenses")

    __table_args__ = (CheckConstraint("amount > 0"),)


class AidEvent(Base):
    __tablename__ = "aid_events"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    event_type = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)
    proof_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    event_hash = Column(String(64), nullable=True)
    hedera_topic_id = Column(String(100), nullable=True)
    hedera_transaction_id = Column(String(100), nullable=True)
    hedera_sequence_number = Column(Integer, nullable=True)
    hedera_status = Column(String(20), nullable=False, default="pending")
    review_status = Column(String(20), nullable=False, default="pending")
    review_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    campaign = relationship("Campaign", back_populates="aid_events")

    __table_args__ = (
        CheckConstraint("event_type IN ('purchase', 'shipment', 'arrival', 'distribution', 'completed')"),
        CheckConstraint("review_status IN ('pending', 'approved', 'rejected')"),
    )


class Moderator(Base):
    __tablename__ = "moderators"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(320), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="ngo_admin")
    ngo_id = Column(Integer, ForeignKey("ngos.id"), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("role IN ('platform_admin', 'ngo_admin')"),
        CheckConstraint("(role = 'platform_admin' AND ngo_id IS NULL) OR (role = 'ngo_admin' AND ngo_id IS NOT NULL)"),
    )


class PairingSession(Base):
    __tablename__ = "pairing_sessions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    poll_secret = Column(String(64), nullable=False)
    status = Column(String(20), nullable=False, default="waiting")
    receipt_token = Column(String(128), nullable=True)
    result_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)

    __table_args__ = (CheckConstraint("status IN ('waiting', 'ready', 'consumed', 'expired')"),)


class CampaignUpdate(Base):
    __tablename__ = "campaign_updates"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    kind = Column(String(30), nullable=False)
    message = Column(Text, nullable=False)
    media_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    event_hash = Column(String(64), nullable=True)
    hedera_topic_id = Column(String(100), nullable=True)
    hedera_transaction_id = Column(String(100), nullable=True)
    hedera_sequence_number = Column(Integer, nullable=True)
    hedera_status = Column(String(20), nullable=False, default="not_anchored")

    campaign = relationship("Campaign")

    __table_args__ = (
        CheckConstraint("kind IN ('update', 'photo', 'thanks', 'purchase', 'shipment', 'distribution')"),
    )
