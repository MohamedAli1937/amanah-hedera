from app.database import SessionLocal
from app.models import Moderator, NGO
from app.auth import hash_password

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
            admin = Moderator(email="moderator@amanah.com",password_hash=pw_hash,role="platform_admin",ngo_id=None,is_active=True,)
            db.add(admin)
            print("Created admin moderator@amanah.com with password Amanah123456!")

        espoir_mod = db.query(Moderator).filter_by(email="contact@espoir.example").first()
        if espoir_mod:
            espoir_mod.password_hash = pw_hash
            espoir_mod.ngo_id = 1
            espoir_mod.is_active = True
            print("Updated contact@espoir.example password to Amanah123456!")
        else:
            espoir_mod = Moderator(email="contact@espoir.example",password_hash=pw_hash,role="ngo_admin",ngo_id=1,is_active=True,)
            db.add(espoir_mod)
            print("Created contact@espoir.example (NGO 1) with password Amanah123456!")

        solidarity_mod = db.query(Moderator).filter_by(email="contact@solidarity.example").first()
        if solidarity_mod:
            solidarity_mod.password_hash = pw_hash
            solidarity_mod.ngo_id = 2
            solidarity_mod.is_active = True
            print("Updated contact@solidarity.example password to Amanah123456!")
        else:
            solidarity_mod = Moderator(email="contact@solidarity.example",password_hash=pw_hash,role="ngo_admin",ngo_id=2,is_active=True,)
            db.add(solidarity_mod)
            print("Created contact@solidarity.example (Pending NGO 2) with password Amanah123456!")

        db.commit()
        print("Demo accounts configured successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    setup()
