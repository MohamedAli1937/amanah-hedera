from app.database import engine
from sqlalchemy import text

columns = {
    "event_hash": "VARCHAR(64)",
    "hedera_topic_id": "VARCHAR(100)",
    "hedera_transaction_id": "VARCHAR(100)",
    "hedera_sequence_number": "INTEGER",
    "hedera_status": "VARCHAR(20) NOT NULL DEFAULT 'pending'",
}

with engine.begin() as conn:
    existing = {
        row[0] for row in conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'aid_events'"))
    }

    for name, sql_type in columns.items():
        if name not in existing:
            conn.execute(text(f'ALTER TABLE aid_events ADD COLUMN "{name}" {sql_type}'))
            print(f"Added {name}")
        else:
            print(f"Already exists: {name}")

print("Migration complete.")
