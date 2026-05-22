from database import engine, Base, SessionLocal
from models import User, OTPCode, Project, CostBreakdown, ChatHistory
from auth import hash_password

def init_database():
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")

    db = SessionLocal()

    existing_developer = db.query(User).filter(User.email == "developer@costrasphere.ai").first()
    if not existing_developer:
        developer = User(
            full_name="CostraSphere Developer",
            email="developer@costrasphere.ai",
            password=hash_password("CostraSphere@Dev2026"),
            role="developer",
            company_name="CostraSphere AI"
        )
        db.add(developer)
        print("Created developer account: developer@costrasphere.ai")

    db.commit()
    db.close()

if __name__ == "__main__":
    init_database()
