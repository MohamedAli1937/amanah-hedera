
from getpass import getpass

from app import models
from app.auth import hash_password
from app.database import SessionLocal


def main():
    email = input("Admin email: ").strip().lower()
    password = getpass("Password (minimum 12 characters): ")

    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return

    confirmation = getpass("Confirm password: ")

    if password != confirmation:
        print("Passwords do not match.")
        return

    with SessionLocal() as db:
        existing = db.query(models.Moderator).filter(models.Moderator.email == email).first()

        if existing:
            print("An account with this email already exists.")
            return

        moderator = models.Moderator(email=email,password_hash=hash_password(password),role="platform_admin",ngo_id=None,is_active=True,)

        db.add(moderator)
        db.commit()

    print("Platform admin created successfully.")


if __name__ == "__main__":
    main()
