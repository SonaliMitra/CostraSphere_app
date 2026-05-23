import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from database import SessionLocal
from models import OTPCode

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def send_otp_email(email: str, otp: str) -> bool:
    try:
        subject = "CostraSphere AI - Your OTP Code"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h2 style="color: #667eea; text-align: center;">CostraSphere AI</h2>
                    <p style="color: #333; font-size: 16px;">Your One-Time Password is:</p>
                    <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #667eea; letter-spacing: 5px; margin: 0;">{otp}</h1>
                    </div>
                    <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                </div>
            </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = email

        msg.attach(MIMEText(body, "html"))

        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.sendmail(EMAIL_USER, email, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.sendmail(EMAIL_USER, email, msg.as_string())

        db = SessionLocal()
        otp_record = OTPCode(email=email, otp=otp)
        db.add(otp_record)
        db.commit()
        db.close()

        return True
    except Exception as e:
        print(f"Error sending OTP: {str(e)}")
        return False

def verify_otp(email: str, otp: str) -> bool:
    db = SessionLocal()
    otp_record = db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.otp == otp
    ).order_by(OTPCode.created_at.desc()).first()

    if otp_record:
        created_time = otp_record.created_at
        if datetime.utcnow() - created_time < timedelta(minutes=10):
            db.delete(otp_record)
            db.commit()
            db.close()
            return True

    db.close()
    return False
