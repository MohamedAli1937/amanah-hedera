
from decimal import Decimal

from app.database import Base, SessionLocal, engine
from app.models import NGO, Campaign, Donation, Expense, AidEvent


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(NGO).filter_by(email="contact@espoir.example").first()

        if existing:
            print("Seed data already exists. No changes made.")
            return

        espoir = NGO(name="Association Espoir", email="contact@espoir.example",phone_number="+216 70 000 001",registration_document="https://example.com/docs/espoir-registration.pdf",verification_status="verified",)
        solidarity = NGO(name="Solidarity Tunisia", email="contact@solidarity.example",phone_number="+216 70 000 002",registration_document="https://example.com/docs/solidarity-registration.pdf",verification_status="pending",)
        future_hands = NGO(name="Future Hands", email="contact@futurehands.example",phone_number="+216 70 000 003",registration_document="https://example.com/docs/future-hands-registration.pdf",verification_status="rejected")

        db.add_all([espoir, solidarity, future_hands])
        db.flush()

        medical = Campaign(title="Medical Supplies for Rural Clinics",description=("Purchase first-aid kits and distribute them to rural clinics in Tunisia."),goal=Decimal("10000.000"),status="active",donation_link="https://example.com/donate/medical",ngo_id=espoir.id,)
        winter = Campaign(title="Winter Support for Families",description=("Provide blankets and winter essentials to families in need."),goal=Decimal("6000.000"),status="active",donation_link="https://example.com/donate/winter",ngo_id=espoir.id,)
        school = Campaign(title="School Supplies for Children",description=("Provide school bags, notebooks, and stationery to children."),goal=Decimal("3000.000"),status="completed",donation_link=None,ngo_id=espoir.id,)
        draft = Campaign(title="Community Kitchen",description="A draft campaign for preparing community meals.",goal=Decimal("4500.000"),status="draft",ngo_id=espoir.id,)

        db.add_all([medical, winter, school, draft])
        db.flush()

        db.add_all([
            Donation(campaign_id=medical.id,amount=Decimal("500.000"),status="confirmed",receipt_token="TEST-RECEIPT-MED-001",),
            Donation(campaign_id=medical.id,amount=Decimal("250.000"),status="confirmed",receipt_token="TEST-RECEIPT-MED-002",),
            Donation(campaign_id=medical.id,amount=Decimal("1000.000"),status="pending",),
            Donation(campaign_id=medical.id,amount=Decimal("75.000"),status="rejected",),
            Donation(campaign_id=winter.id,amount=Decimal("300.000"),status="confirmed",receipt_token="TEST-RECEIPT-WIN-001",),
            Donation(campaign_id=school.id,amount=Decimal("3000.000"),status="confirmed",receipt_token="TEST-RECEIPT-SCH-001",),
        ])

        db.add_all([
            Expense(campaign_id=medical.id,amount=Decimal("400.000"),description="Purchase of first-aid kits",proof_url="https://example.com/proofs/medical-invoice-001.pdf",),
            Expense(campaign_id=medical.id,amount=Decimal("100.000"),description="Transport to rural clinics",proof_url="https://example.com/proofs/medical-transport-001.pdf",),
            Expense(campaign_id=winter.id,amount=Decimal("150.000"),description="Purchase of winter blankets",),
            Expense(campaign_id=school.id,amount=Decimal("2200.000"),description="School bags and stationery",proof_url="https://example.com/proofs/school-invoice-001.pdf",),
        ])

        db.add_all([
            AidEvent(campaign_id=medical.id,event_type="purchase",description="First-aid kits purchased from a supplier.",proof_url="https://example.com/proofs/medical-purchase.pdf",),
            AidEvent(campaign_id=medical.id,event_type="shipment",description="Supplies dispatched to the regional depot.",),
            AidEvent(campaign_id=medical.id,event_type="arrival",description="The regional depot confirmed receipt.",),
            AidEvent(campaign_id=winter.id,event_type="purchase",description="Winter blankets purchased.",),
            AidEvent(campaign_id=school.id,event_type="purchase",description="School supplies purchased.",),
            AidEvent(campaign_id=school.id,event_type="distribution",description="School supplies distributed to beneficiaries.",),
            AidEvent(campaign_id=school.id,event_type="completed",description="The campaign activities were completed.",),
        ])

        db.commit()
        print("Amanah seed data created successfully.")
        print("NGOs: 3 | Campaigns: 4 | Donations: 6")
        print("Expenses: 4 | Aid events: 7")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
