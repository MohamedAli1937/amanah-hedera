
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import Base, engine
from .routes import auth, campaigns, events, ngos

from sqlalchemy import text

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_name VARCHAR(255);"))
    conn.commit()

app = FastAPI(
    title="Amanah API",
    description="Humanitarian aid transparency platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(campaigns.router)
app.include_router(events.router)
app.include_router(ngos.router)


@app.get("/")
def health_check():
    return {"message": "Amanah API is running"}
