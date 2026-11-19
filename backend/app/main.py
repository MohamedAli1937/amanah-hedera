
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import models
from .database import Base, engine
from .routes import auth, campaigns, events, ngos, pairing, updates

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engplace)
    with engine.begin() as conn:
        try:
            if "sqlite" in str(engine.url):
                donation_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(donations);")).fetchall()]
                if "donor_name" not in donation_cols:
                    conn.execute(text("ALTER TABLE donations ADD COLUMN donor_name VARCHAR(255);"))

                event_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(aid_events);")).fetchall()]
                if "review_status" not in event_cols:
                    conn.execute(text("ALTER TABLE aid_events ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'pending';"))
                if "review_note" not in event_cols:
                    conn.execute(text("ALTER TABLE aid_events ADD COLUMN review_note TEXT;"))
                if "reviewed_at" not in event_cols:
                    conn.execute(text("ALTER TABLE aid_events ADD COLUMN reviewed_at DATETIME;"))

                expense_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(expenses);")).fetchall()]
                for col, definition in {
                    "event_hash": "VARCHAR(64)",
                    "hedera_topic_id": "VARCHAR(100)",
                    "hedera_transaction_id": "VARCHAR(100)",
                    "hedera_sequence_number": "INTEGER",
                    "hedera_status": "VARCHAR(20) NOT NULL DEFAULT 'not_anchored'",
                }.items():
                    if col not in expense_cols:
                        conn.execute(text(f"ALTER TABLE expenses ADD COLUMN {col} {definition};"))
            else:
                conn.execute(text("ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_name VARCHAR(255);"))
                conn.execute(text("ALTER TABLE aid_events ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'pending';"))
                conn.execute(text("ALTER TABLE aid_events ADD COLUMN IF NOT EXISTS review_note TEXT;"))
                conn.execute(text("ALTER TABLE aid_events ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS event_hash VARCHAR(64);"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS hedera_topic_id VARCHAR(100);"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS hedera_transaction_id VARCHAR(100);"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS hedera_sequence_number INTEGER;"))
                conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS hedera_status VARCHAR(20) NOT NULL DEFAULT 'not_anchored';"))

            conn.execute(text("""
                UPDATE aid_events
                SET review_status = 'approved',
                    reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP)
                WHERE review_status = 'pending' AND hedera_status = 'confirmed'
            """))
        except Exception:
            logger.exception("Database compatibility update failed")

    yield


app = FastAPI(
    title="Amanah API",
    description="Humanitarian aid transparency platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ] + [origin.strip() for origin in os.getenv("FRONTEND_URLS", "").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(campaigns.router)
app.include_router(events.router)
app.include_router(ngos.router)
app.include_router(pairing.router)
app.include_router(updates.router)


@app.get("/")
def health_check():
    return {"message": "Amanah API is running"}


@app.get("/network")
def hedera_network_config():
    """Public network metadata used for HashScan links and QR/display fallbacks."""
    network = os.getenv("HEDERA_NETWORK", "testnet")
    return {
        "network": network,
        "account_id": os.getenv("HEDERA_ACCOUNT_ID"),
        "topic_id": os.getenv("HEDERA_TOPIC_ID"),
        "hashscan_base": f"https://hashscan.io/{network}",
    }
