from app.auth import hash_password
from app.database import SessionLocal
from app.models import Moderator


def setup():
    db = SessionLocal()
    try:
        pw_hash = hash_password("Amanah123456!")

        admin = db.query(Moderator).filter_by(email="moderator@amanah.com").first()
        if admin:
            admin.password_hash = pw_hash
            admin.is_active = True
            print("Updated admin moderator@amanah.com password to Amanah123456!")
        else:
            admin = Moderator(
                email="moderator@amanah.com",
                password_hash=pw_hash,
                role="platform_admin",
                ngo_id=None,
                is_active=True,
            )
            db.add(admin)
            print("Created admin moderator@amanah.com with password Amanah123456!")

        for email, ngo_id, label in (
            ("contact@espoir.example", 1, "NGO 1"),
            ("contact@solidarity.example", 2, "Pending NGO 2"),
        ):
            ngo_admin = db.query(Moderator).filter_by(email=email).first()
            if ngo_admin:
                ngo_admin.password_hash = pw_hash
                ngo_admin.ngo_id = ngo_id
                ngo_admin.is_active = True
                print(f"Updated {email} password to Amanah123456!")
            else:
                ngo_admin = Moderator(
                    email=email,
                    password_hash=pw_hash,
                    role="ngo_admin",
                    ngo_id=ngo_id,
                    is_active=True,
                )
                db.add(ngo_admin)
                print(f"Created {email} ({label}) with password Amanah123456!")

        db.commit()
        print("Demo accounts configured successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    setup()
