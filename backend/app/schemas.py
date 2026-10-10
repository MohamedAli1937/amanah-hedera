
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, EmailStr, model_validator

class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class NGOCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    password_confirmation: str = Field(min_length=12, max_length=128)
    phone_number: str | None = None
    registration_document: str | None = None

    @model_validator(mode="after")
    def validate_password_confirmation(self):
        if self.password != self.password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class NGOStatusRead(BaseModel):
    ngo_id: int
    ngo_name: str
    email: str
    phone_number: str | None = None
    registration_document: str | None = None
    verification_status: str
    account_active: bool


class NGORead(ORMBase):
    id: int
    name: str
    email: str
    phone_number: str | None
    registration_document: str | None
    verification_status: str


class CampaignCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10)
    goal: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    ngo_id: int
    donation_link: HttpUrl | None = None


class CampaignUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = Field(None, min_length=10)
    goal: Decimal | None = Field(None, gt=0, max_digits=12, decimal_places=3)
    status: Literal["draft", "active", "goal_reached", "completed", "suspended"] | None = None
    donation_link: HttpUrl | None = None


class CampaignRead(ORMBase):
    id: int
    title: str
    description: str
    goal: Decimal
    status: str
    donation_link: str | None
    ngo_id: int
    created_at: datetime


class DonationCreate(BaseModel):
    campaign_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    donor_name: str | None = None


class DonationRead(ORMBase):
    id: int
    campaign_id: int
    amount: Decimal
    donor_name: str | None = None
    status: str
    receipt_token: str | None
    donation_hash: str | None = None
    hedera_topic_id: str | None = None
    hedera_transaction_id: str | None = None
    hedera_sequence_number: int | None = None
    hedera_status: str | None = None
    created_at: datetime


class ExpenseCreate(BaseModel):
    campaign_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    description: str = Field(min_length=3)
    proof_url: HttpUrl | None = None


class ExpenseRead(ORMBase):
    id: int
    campaign_id: int
    amount: Decimal
    description: str
    proof_url: str | None
    created_at: datetime


class AidEventCreate(BaseModel):
    campaign_id: int
    event_type: Literal["purchase", "shipment", "arrival", "distribution", "completed"]
    description: str = Field(min_length=3)
    proof_url: HttpUrl | None = None


class AidEventRead(ORMBase):
    id: int
    campaign_id: int
    event_type: str
    description: str
    proof_url: str | None
    created_at: datetime
    event_hash: str | None
    hedera_topic_id: str | None
    hedera_transaction_id: str | None
    hedera_sequence_number: int | None
    hedera_status: str


class AidEventVerification(BaseModel):
    event_id: int
    canonical_payload: dict
    calculated_hash: str
    stored_hash: str | None
    is_valid: bool
    verified_at_mirror_node: bool = False
    consensus_timestamp: str | None = None
    running_hash: str | None = None
    hedera_topic_id: str | None
    hedera_sequence_number: int | None
    hedera_transaction_id: str | None
    hedera_status: str
    hashscan_tx_url: str | None
    hashscan_topic_url: str | None
    verification_message: str | None = None


class ReceiptVerification(BaseModel):
    receipt_token: str
    donation_id: int
    campaign_id: int
    campaign_title: str
    amount: Decimal
    donor_name: str | None = None
    donation_status: str
    confirmed_at: datetime
    ngo_name: str
    ngo_verification_status: str
    events_count: int
    donation_hash: str | None = None
    hedera_topic_id: str | None = None
    hedera_sequence_number: int | None = None
    hedera_transaction_id: str | None = None
    is_verified_onchain: bool = False
    consensus_timestamp: str | None = None
    hashscan_tx_url: str | None = None
    hashscan_topic_url: str | None = None


class ModeratorRead(ORMBase):
    id: int
    email: str
    role: str
    ngo_id: int | None
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
