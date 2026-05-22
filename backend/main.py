from __future__ import annotations

import csv
import base64
import hashlib
import io
import json
import logging
import math
import os
import random
import secrets
import smtplib
import sqlite3
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from geopy.geocoders import Nominatim
from haversine import Unit, haversine
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./costrasphere.db")
JWT_SECRET = os.getenv("JWT_SECRET", "costrasphere-local-dev-secret-change-before-production")
JWT_ALGORITHM = "HS256"
EMAIL_USER = os.getenv("EMAIL_USER", "costrasphere@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
geolocator = Nominatim(user_agent="costrasphere-ai/1.0")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("costrasphere")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="customer", nullable=False)
    name = Column(String, default="")
    phone = Column(String, default="")
    location = Column(String, default="")
    profile_image = Column(String, default="")
    company_name = Column(String, default="")
    address = Column(String, default="")
    gst_number = Column(String, default="")
    company_email = Column(String, default="")
    team_size = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    projects = relationship("Project", back_populates="owner")


class OTPLog(Base):
    __tablename__ = "otp_logs"
    id = Column(Integer, primary_key=True)
    email = Column(String, index=True)
    otp_hash = Column(String)
    purpose = Column(String)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    status = Column(String, default="created")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SystemLog(Base):
    __tablename__ = "system_logs"
    id = Column(Integer, primary_key=True)
    category = Column(String, index=True)
    level = Column(String, default="info")
    message = Column(Text)
    meta = Column(Text, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    status = Column(String, default="draft")
    submitted_company_id = Column(Integer, nullable=True)
    input_lat = Column(Float)
    input_lng = Column(Float)
    detected_city = Column(String)
    detected_state = Column(String)
    country = Column(String)
    currency = Column(String)
    currency_symbol = Column(String)
    terrain = Column(String)
    summary_json = Column(Text)
    towers_json = Column(Text)
    routes_json = Column(Text)
    cost_json = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    owner = relationship("User", back_populates="projects")


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    role: Literal["customer", "company", "developer"] = "customer"
    phone: str = ""
    company_name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OTPIn(BaseModel):
    email: EmailStr
    otp: str
    purpose: Literal["register", "reset"] = "register"


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    email: EmailStr
    otp: str
    password: str = Field(min_length=8)


class ProfileIn(BaseModel):
    name: str = ""
    phone: str = ""
    location: str = ""
    profile_image: str = ""
    company_name: str = ""
    address: str = ""
    gst_number: str = ""
    company_email: str = ""
    team_size: int = 0
    password: str | None = None


class ProjectIn(BaseModel):
    name: str
    latitude: float
    longitude: float
    terrain: Literal["Urban", "Rural", "Mountain", "Forest"] = "Urban"
    radius_km: Literal[5, 10, 20, 30] = 30


class ChatIn(BaseModel):
    project_id: int
    message: str


class SubmitApprovalIn(BaseModel):
    company_id: int


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def log(db: Session, category: str, message: str, level: str = "info", meta: dict[str, Any] | None = None):
    db.add(SystemLog(category=category, message=message, level=level, meta=json.dumps(meta or {})))
    db.commit()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return "pbkdf2_sha256$210000$" + base64.b64encode(salt).decode("ascii") + "$" + base64.b64encode(digest).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    try:
        scheme, rounds, salt_b64, digest_b64 = hashed.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(rounds))
        return secrets.compare_digest(actual, expected)
    except Exception:
        return False


def token_for(user: User) -> str:
    payload = {"sub": str(user.id), "email": user.email, "role": user.role, "exp": now_utc() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return dependency


def load_cost_data() -> pd.DataFrame:
    frames = []
    for path in sorted((ROOT / "data").glob("*_city_costs.csv")):
        if path.name == "global_city_costs.csv":
            continue
        frame = pd.read_csv(path)
        frame["source_file"] = path.name
        frames.append(frame)
    if not frames:
        raise RuntimeError("No city cost CSVs found in data/")
    df = pd.concat(frames, ignore_index=True)
    df["currency_symbol"] = df["currency_symbol"].replace({"â‚¹": "\u20b9"})
    df["city_l"] = df["city"].astype(str).str.lower()
    df["state_l"] = df["state"].astype(str).str.lower()
    return df


COST_DATA = load_cost_data()


def normalize_country(country: str | None) -> str:
    if not country:
        return ""
    c = country.lower()
    if c in {"united states", "usa", "us"}:
        return "USA"
    if c in {"united kingdom", "uk", "great britain"}:
        return "UK"
    return country.title()


def reverse_geocode(lat: float, lng: float, db: Session) -> dict[str, str]:
    try:
        location = geolocator.reverse((lat, lng), language="en", exactly_one=True, timeout=8)
        address = location.raw.get("address", {}) if location else {}
        return {
            "city": address.get("city") or address.get("town") or address.get("municipality") or address.get("county") or "",
            "district": address.get("state_district") or address.get("county") or "",
            "state": address.get("state") or "",
            "country": normalize_country(address.get("country")),
            "display": location.address if location else "",
        }
    except Exception as exc:
        log(db, "api", "Nominatim reverse geocode failed", "warning", {"error": str(exc), "lat": lat, "lng": lng})
        return {"city": "", "district": "", "state": "", "country": "", "display": ""}


def match_city(lat: float, lng: float, geo: dict[str, str]) -> pd.Series:
    df = COST_DATA.copy()
    country = geo.get("country", "")
    state = geo.get("state", "")
    city = geo.get("city", "")
    district = geo.get("district", "")
    if country:
        country_df = df[df["country"].astype(str).str.lower().eq(country.lower())]
        if not country_df.empty:
            df = country_df
    candidates = []
    for _, row in df.iterrows():
        point = (float(row["latitude"]), float(row["longitude"]))
        distance = haversine((lat, lng), point, unit=Unit.KILOMETERS)
        score = distance
        row_city = str(row["city"]).lower()
        row_state = str(row["state"]).lower()
        if city and row_city == city.lower():
            score -= 5000
        if district and row_city == district.lower():
            score -= 3500
        if state and row_state == state.lower():
            score -= 1200
        candidates.append((score, distance, row))
    candidates.sort(key=lambda item: (item[0], item[1]))
    best = candidates[0][2]
    if city.lower() == "chennai":
        chennai = COST_DATA[(COST_DATA["city_l"] == "chennai") & (COST_DATA["state_l"] == "tamil nadu")]
        if not chennai.empty:
            return chennai.iloc[0]
    return best


def density_for(city: str) -> str:
    metros = {"chennai", "mumbai", "delhi", "bengaluru", "bangalore", "tokyo", "osaka", "new york", "los angeles", "london", "beijing", "shanghai"}
    large = {"pune", "hyderabad", "ahmedabad", "yokohama", "manchester", "chicago", "houston", "shenzhen"}
    c = city.lower()
    if c in metros:
        return "metro"
    if c in large:
        return "large"
    return "regional"


def destination(lat: float, lng: float, bearing: float, km: float) -> tuple[float, float]:
    radius = 6371.0
    bearing_rad = math.radians(bearing)
    lat1 = math.radians(lat)
    lng1 = math.radians(lng)
    lat2 = math.asin(math.sin(lat1) * math.cos(km / radius) + math.cos(lat1) * math.sin(km / radius) * math.cos(bearing_rad))
    lng2 = lng1 + math.atan2(math.sin(bearing_rad) * math.sin(km / radius) * math.cos(lat1), math.cos(km / radius) - math.sin(lat1) * math.sin(lat2))
    return math.degrees(lat2), math.degrees(lng2)


def looks_like_water(lat: float, lng: float) -> bool:
    try:
        location = geolocator.reverse((lat, lng), language="en", exactly_one=True, timeout=5, zoom=14)
        text = f"{location.address if location else ''} {json.dumps(location.raw.get('address', {}) if location else {})}".lower()
        water_terms = [" sea", "ocean", "bay", "gulf", "lake", "reservoir", "river", "canal", "harbour", "harbor", "beach", "strait"]
        return any(term in text for term in water_terms)
    except Exception:
        return False


def generate_towers(lat: float, lng: float, city: str, terrain: str, cost_row: pd.Series, max_radius_km: int) -> list[dict[str, Any]]:
    density = density_for(city)
    base_count = {"metro": 14, "large": 10, "regional": 7}[density]
    count = max(4, round(base_count * (max_radius_km / 30)))
    tower_types = ["Macro Tower", "Micro Cell", "Small Cell", "Distribution Point", "Central Office"]
    towers = []
    random.seed(f"{round(lat, 3)}:{round(lng, 3)}:{city}:{max_radius_km}")
    attempts = 0
    min_radius = 1 if max_radius_km == 5 else 5
    while len(towers) < count and attempts < count * 18:
        attempts += 1
        idx = len(towers)
        km = random.uniform(min_radius, max_radius_km)
        bearing = (360 / count) * idx + random.uniform(-35, 35)
        t_lat, t_lng = destination(lat, lng, bearing, km)
        if looks_like_water(t_lat, t_lng):
            continue
        tower_type = tower_types[idx % len(tower_types)]
        connector_count = random.randint(8, 36) if density == "metro" else random.randint(4, 20)
        fiber_nodes = random.randint(5, 24)
        load = random.randint(42, 94)
        towers.append({
            "id": f"TWR-{idx + 1:03d}",
            "name": f"{city} {tower_type} {idx + 1}",
            "lat": round(t_lat, 6),
            "lng": round(t_lng, 6),
            "type": tower_type,
            "distance_km": round(km, 2),
            "connector_count": connector_count,
            "fiber_node_count": fiber_nodes,
            "tower_load": load,
            "deployment_cost": 0,
            "cost_breakdown": {},
            "status": "optimized" if load < 82 else "high-load",
        })
    return towers


def terrain_multiplier(terrain: str) -> float:
    return {"Urban": 1.15, "Rural": 1.0, "Mountain": 1.65, "Forest": 1.45}.get(terrain, 1.15)


def route_for(user_lat: float, user_lng: float, tower: dict[str, Any]) -> dict[str, Any]:
    coord = f"{user_lng},{user_lat};{tower['lng']},{tower['lat']}"
    query = urllib.parse.urlencode({"overview": "full", "geometries": "geojson", "alternatives": "false", "steps": "false"})
    url = f"https://router.project-osrm.org/route/v1/driving/{coord}?{query}"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
        route = payload["routes"][0]
        points = [[round(lat, 6), round(lng, 6)] for lng, lat in route["geometry"]["coordinates"]]
        if len(points) >= 2:
            tower["lat"], tower["lng"] = points[-1]
            tower["road_distance_km"] = round(float(route["distance"]) / 1000, 2)
            return {"tower_id": tower["id"], "points": points, "mode": "osrm-road", "distance_km": tower["road_distance_km"]}
    except Exception:
        pass
    mid_lat, mid_lng = destination(user_lat, user_lng, random.uniform(0, 360), tower["distance_km"] * 0.36)
    points = [[user_lat, user_lng], [round(mid_lat, 6), round(mid_lng, 6)], [tower["lat"], tower["lng"]]]
    tower["road_distance_km"] = tower["distance_km"]
    return {"tower_id": tower["id"], "points": points, "mode": "fallback-direct", "distance_km": tower["distance_km"]}


def apply_tower_costs(row: pd.Series, towers: list[dict[str, Any]], terrain: str) -> None:
    multiplier = terrain_multiplier(terrain) * float(row.get("terrain_multiplier", 1.0))
    for tower in towers:
        km = float(tower.get("road_distance_km") or tower["distance_km"])
        tower_install = 185000 * multiplier
        fiber = km * float(row["fiber_per_km"]) * multiplier
        labor = km * float(row["labor_per_km"]) * multiplier
        connectors = tower["connector_count"] * float(row["connector_cost"])
        maintenance = km * float(row["maintenance_per_km"]) * 1.25
        transport = (km * 4600 + 8200) * multiplier
        contingency = (tower_install + fiber + labor + connectors + transport) * 0.08
        total = tower_install + fiber + labor + connectors + maintenance + transport + contingency
        tower["deployment_cost"] = round(total, 2)
        tower["cost_breakdown"] = {
            "tower_installation_cost": round(tower_install, 2),
            "fiber_deployment_cost": round(fiber, 2),
            "worker_planning_cost": round(labor, 2),
            "connector_cost": round(connectors, 2),
            "maintenance_cost": round(maintenance, 2),
            "transport_cost": round(transport, 2),
            "contingency": round(contingency, 2),
            "final_tower_budget": round(total, 2),
        }


def calculate_cost(row: pd.Series, towers: list[dict[str, Any]], terrain: str) -> dict[str, Any]:
    fiber_km = sum(float(t.get("road_distance_km") or t["distance_km"]) for t in towers)
    connectors = sum(t["connector_count"] for t in towers)
    nodes = sum(t["fiber_node_count"] for t in towers)
    worker_days = max(8, round(fiber_km / 3.8 + len(towers) * 1.7))
    skilled_labor = max(4, math.ceil(worker_days / 4))
    multiplier = terrain_multiplier(terrain) * float(row.get("terrain_multiplier", 1.0))
    tower_install = sum(t["cost_breakdown"]["tower_installation_cost"] for t in towers)
    fiber = sum(t["cost_breakdown"]["fiber_deployment_cost"] for t in towers)
    labor = sum(t["cost_breakdown"]["worker_planning_cost"] for t in towers)
    connectors_cost = sum(t["cost_breakdown"]["connector_cost"] for t in towers)
    transport = sum(t["cost_breakdown"]["transport_cost"] for t in towers)
    maintenance = sum(t["cost_breakdown"]["maintenance_cost"] for t in towers)
    contingency = sum(t["cost_breakdown"]["contingency"] for t in towers)
    final = sum(t["cost_breakdown"]["final_tower_budget"] for t in towers)
    return {
        "tower_installation_cost": round(tower_install, 2),
        "fiber_deployment_cost": round(fiber, 2),
        "worker_planning_cost": round(labor, 2),
        "transport_cost": round(transport, 2),
        "maintenance_cost": round(maintenance, 2),
        "connector_cost": round(connectors_cost, 2),
        "contingency": round(contingency, 2),
        "final_project_budget": round(final, 2),
        "deployment_duration_days": worker_days,
        "skilled_labor_count": skilled_labor,
        "field_worker_count": max(10, skilled_labor * 4),
        "fiber_km": round(fiber_km, 2),
        "connector_count": connectors,
        "fiber_node_count": nodes,
        "terrain_multiplier": round(multiplier, 2),
    }


def serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "phone": user.phone,
        "location": user.location,
        "profile_image": user.profile_image,
        "company_name": user.company_name,
        "address": user.address,
        "gst_number": user.gst_number,
        "company_email": user.company_email,
        "team_size": user.team_size,
        "is_verified": user.is_verified,
    }


def send_otp_email(db: Session, email: str, otp: str, purpose: str) -> None:
    subject = "CostraSphere AI verification code"
    body = (
        "Hi,\n\n"
        "Welcome to CostraSphere\n\n"
        f"Your One Time Password (OTP) is: {otp}\n\n"
        "Please use this OTP to complete your signup.\n\n"
        "Regards,\n"
        "Team Digital Dynamos 💜"
    )
    msg = MIMEText(body, _charset="utf-8")
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = email
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.set_debuglevel(1)
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_USER, [email], msg.as_string())
        log(db, "smtp", "OTP email sent", "info", {"email": email, "purpose": purpose})
    except Exception as exc:
        log(db, "smtp", "OTP email failed", "error", {"email": email, "purpose": purpose, "error": str(exc)})
        raise HTTPException(status_code=502, detail=f"Gmail SMTP delivery failed: {exc}")


def send_new_password_email(db: Session, email: str, password: str) -> None:
    subject = "Your new CostraSphere password"
    body = (
        "Hi,\n\n"
        "Your new CostraSphere password is:\n\n"
        f"{password}\n\n"
        "Please login using this password.\n\n"
        "Regards,\n"
        "Team Digital Dynamos 💜"
    )
    msg = MIMEText(body, _charset="utf-8")
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = email
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.set_debuglevel(1)
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_USER, [email], msg.as_string())
        log(db, "smtp", "New password email sent", "info", {"email": email})
    except Exception as exc:
        log(db, "smtp", "New password email failed", "error", {"email": email, "error": str(exc)})
        raise HTTPException(status_code=502, detail=f"Gmail SMTP delivery failed: {exc}")


def create_otp(db: Session, email: str, purpose: str) -> None:
    otp = f"{random.randint(100000, 999999)}"
    db.add(OTPLog(email=email, otp_hash=hash_password(otp), purpose=purpose, expires_at=now_utc() + timedelta(minutes=10), status="sent"))
    db.commit()
    send_otp_email(db, email, otp, purpose)


app = FastAPI(title="CostraSphere AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_logger(request: Request, call_next):
    start = datetime.now()
    response = await call_next(request)
    try:
        with SessionLocal() as db:
            log(db, "api", f"{request.method} {request.url.path}", "info", {"status": response.status_code, "ms": (datetime.now() - start).total_seconds() * 1000})
    except Exception:
        pass
    return response


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        columns = [row[1] for row in connection.exec_driver_sql("PRAGMA table_info(projects)").fetchall()]
        if "submitted_company_id" not in columns:
            connection.exec_driver_sql("ALTER TABLE projects ADD COLUMN submitted_company_id INTEGER")
    with SessionLocal() as db:
        dev = db.query(User).filter(User.email == "developer@costrasphere.ai").first()
        if not dev:
            db.add(User(email="developer@costrasphere.ai", hashed_password=hash_password("CostraSphere@Dev2026"), role="developer", name="CostraSphere Developer", is_verified=True))
            db.commit()
        log(db, "ai", "Cost dataset loaded", "info", {"rows": int(len(COST_DATA)), "countries": sorted(COST_DATA["country"].unique().tolist())})


@app.get("/api/health")
def health():
    return {"status": "ok", "dataset_rows": len(COST_DATA)}


@app.post("/api/auth/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=payload.email, hashed_password=hash_password(payload.password), role=payload.role, name=payload.name, phone=payload.phone, company_name=payload.company_name, is_verified=False)
    db.add(user)
    db.commit()
    create_otp(db, payload.email, "register")
    return {"message": "Registered. Verify the OTP sent to email."}


@app.post("/api/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_verified and user.role != "developer":
        raise HTTPException(status_code=403, detail="Verify email before login")
    return {"token": token_for(user), "user": serialize_user(user)}


@app.post("/api/auth/verify-otp")
def verify_otp(payload: OTPIn, db: Session = Depends(get_db)):
    records = db.query(OTPLog).filter(OTPLog.email == payload.email, OTPLog.purpose == payload.purpose, OTPLog.used == False).order_by(OTPLog.id.desc()).all()
    for record in records:
        expires = record.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now_utc():
            record.status = "expired"
            continue
        if verify_password(payload.otp, record.otp_hash):
            record.used = True
            record.status = "verified"
            user = db.query(User).filter(User.email == payload.email).first()
            if user and payload.purpose == "register":
                user.is_verified = True
            db.commit()
            return {"message": "OTP verified"}
    db.commit()
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")


@app.post("/api/auth/resend-otp")
def resend_otp(payload: ForgotIn, db: Session = Depends(get_db)):
    if not db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=404, detail="Email not found")
    create_otp(db, payload.email, "register")
    return {"message": "OTP resent"}


@app.post("/api/auth/forgot-password")
def forgot(payload: ForgotIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    new_password = f"Costra{random.randint(1000, 9999)}"
    user.hashed_password = hash_password(new_password)
    db.commit()
    send_new_password_email(db, payload.email, new_password)
    return {"message": "New password sent to email"}


@app.post("/api/auth/reset-password")
def reset(payload: ResetIn, db: Session = Depends(get_db)):
    verify_otp(OTPIn(email=payload.email, otp=payload.otp, purpose="reset"), db)
    user = db.query(User).filter(User.email == payload.email).first()
    user.hashed_password = hash_password(payload.password)
    db.commit()
    return {"message": "Password reset complete"}


@app.get("/api/me")
def me(user: User = Depends(current_user)):
    return serialize_user(user)


@app.get("/api/companies")
def companies(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.role == "company").order_by(User.company_name.asc(), User.name.asc()).all()
    return [
        {
            "id": company.id,
            "name": company.company_name or company.name or company.email,
            "email": company.company_email or company.email,
            "location": company.location or company.address or "",
            "team_size": company.team_size or None,
        }
        for company in rows
    ]


@app.put("/api/profile")
def update_profile(payload: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for field in ["name", "phone", "location", "profile_image", "company_name", "address", "gst_number", "company_email", "team_size"]:
        setattr(user, field, getattr(payload, field))
    if payload.password:
        user.hashed_password = hash_password(payload.password)
    db.commit()
    return serialize_user(user)


@app.post("/api/projects")
def create_project(payload: ProjectIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    geo = reverse_geocode(payload.latitude, payload.longitude, db)
    row = match_city(payload.latitude, payload.longitude, geo)
    towers = generate_towers(payload.latitude, payload.longitude, row["city"], payload.terrain, row, payload.radius_km)
    if not towers:
        raise HTTPException(status_code=422, detail="No land-based tower candidates found in the selected radius. Try a wider radius.")
    routes = [route_for(payload.latitude, payload.longitude, t) for t in towers]
    apply_tower_costs(row, towers, payload.terrain)
    costs = calculate_cost(row, towers, payload.terrain)
    summary = {
        "project_name": payload.name,
        "detected_city": row["city"],
        "detected_state": row["state"],
        "country": row["country"],
        "reverse_geocode": geo,
        "tower_count": len(towers),
        "search_radius_km": payload.radius_km,
        "density": density_for(row["city"]),
        "approval_recommendation": "approve" if costs["terrain_multiplier"] < 2.2 else "review",
    }
    project = Project(
        user_id=user.id,
        name=payload.name,
        status="draft",
        input_lat=payload.latitude,
        input_lng=payload.longitude,
        detected_city=row["city"],
        detected_state=row["state"],
        country=row["country"],
        currency=row["currency"],
        currency_symbol=row["currency_symbol"],
        terrain=payload.terrain,
        summary_json=json.dumps(summary),
        towers_json=json.dumps(towers),
        routes_json=json.dumps(routes),
        cost_json=json.dumps(costs),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    log(db, "ai", "Deployment project generated", "info", {"project_id": project.id, "city": row["city"], "state": row["state"]})
    return project_payload(project, include_internal=user.role in {"company", "developer"})


def project_payload(project: Project, include_internal: bool = False) -> dict[str, Any]:
    costs = json.loads(project.cost_json)
    towers = json.loads(project.towers_json)
    if not include_internal:
        costs = {k: v for k, v in costs.items() if k not in {"skilled_labor_count", "field_worker_count", "worker_planning_cost"}}
        for tower in towers:
            if isinstance(tower.get("cost_breakdown"), dict):
                tower["cost_breakdown"] = {k: v for k, v in tower["cost_breakdown"].items() if k != "worker_planning_cost"}
    return {
        "id": project.id,
        "name": project.name,
        "status": project.status,
        "submitted_company_id": project.submitted_company_id,
        "input_lat": project.input_lat,
        "input_lng": project.input_lng,
        "detected_city": project.detected_city,
        "detected_state": project.detected_state,
        "country": project.country,
        "currency": project.currency,
        "currency_symbol": project.currency_symbol,
        "terrain": project.terrain,
        "summary": json.loads(project.summary_json),
        "towers": towers,
        "routes": json.loads(project.routes_json),
        "costs": costs,
        "created_at": project.created_at.isoformat(),
    }


@app.get("/api/projects")
def list_projects(user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Project)
    if user.role == "customer":
        query = query.filter(Project.user_id == user.id)
    elif user.role == "company":
        query = query.filter(Project.submitted_company_id == user.id, Project.status.in_(["submitted", "approved", "rejected"]))
    projects = query.order_by(Project.id.desc()).all()
    return [project_payload(p, include_internal=user.role in {"company", "developer"}) for p in projects]


@app.post("/api/projects/{project_id}/submit-approval")
def submit_project(project_id: int, payload: SubmitApprovalIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    company = db.get(User, payload.company_id)
    if not company or company.role != "company":
        raise HTTPException(status_code=404, detail="Company not found")
    project.status = "submitted"
    project.submitted_company_id = company.id
    db.commit()
    log(db, "api", "Project submitted to company for approval", "info", {"project_id": project.id, "user_id": user.id, "company_id": company.id})
    return project_payload(project, include_internal=False)


@app.post("/api/chatbot")
def chatbot(payload: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    project = db.get(Project, payload.project_id)
    if not project or (user.role == "customer" and project.user_id != user.id):
        raise HTTPException(status_code=404, detail="Project not found")
    data = project_payload(project, include_internal=user.role in {"company", "developer"})
    question = payload.message.lower()
    costs = data["costs"]
    towers = data["towers"]
    if "cost" in question or "budget" in question:
        answer = f"Estimated project budget is {data['currency_symbol']}{round(costs['final_project_budget']):,}. The largest visible drivers are fiber deployment, tower installation, connectors, maintenance, and terrain multiplier."
    elif "tower" in question or "load" in question:
        busiest = max(towers, key=lambda t: t["tower_load"])
        answer = f"The plan has {len(towers)} telecom towers. The highest-load point is {busiest['name']} at {busiest['tower_load']}% with {busiest['connector_count']} connectors."
    elif "route" in question or "fiber" in question:
        answer = f"Total planned fiber distance is {costs['fiber_km']} km across road-ready OSRM route waypoints, with {costs['connector_count']} connectors and {costs['fiber_node_count']} fiber nodes."
    elif "day" in question or "duration" in question or "timeline" in question:
        answer = f"Estimated completion is {costs['deployment_duration_days']} days for {data['terrain']} terrain near {data['detected_city']}."
    else:
        answer = f"{data['name']} is planned for {data['detected_city']}, {data['detected_state']} with {len(towers)} generated telecom assets and an approval status of {data['status']}."
    log(db, "ai", "Chatbot response generated", "info", {"project_id": payload.project_id, "user_id": user.id})
    return {"answer": answer}


@app.patch("/api/projects/{project_id}/status")
def update_project_status(project_id: int, status: str, user: User = Depends(require_roles("company", "developer")), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "company" and project.submitted_company_id != user.id:
        raise HTTPException(status_code=403, detail="Project was not submitted to this company")
    project.status = status
    db.commit()
    return project_payload(project, include_internal=True)


@app.get("/api/analytics")
def analytics(user: User = Depends(require_roles("company", "developer")), db: Session = Depends(get_db)):
    query = db.query(Project)
    if user.role == "company":
        query = query.filter(Project.submitted_company_id == user.id, Project.status.in_(["submitted", "approved", "rejected"]))
    projects = query.all()
    totals = [json.loads(p.cost_json) for p in projects]
    revenue = sum(c["final_project_budget"] for c in totals)
    return {
        "project_count": len(projects),
        "revenue": round(revenue, 2),
        "approved": sum(1 for p in projects if p.status == "approved"),
        "pending": sum(1 for p in projects if p.status == "pending"),
        "workers": sum(c["field_worker_count"] for c in totals),
        "fiber_km": round(sum(c["fiber_km"] for c in totals), 2),
        "connectors": sum(c["connector_count"] for c in totals),
    }


@app.get("/api/developer/logs")
def developer_logs(user: User = Depends(require_roles("developer")), db: Session = Depends(get_db)):
    logs = db.query(SystemLog).order_by(SystemLog.id.desc()).limit(300).all()
    otp = db.query(OTPLog).order_by(OTPLog.id.desc()).limit(100).all()
    return {
        "logs": [{"id": l.id, "category": l.category, "level": l.level, "message": l.message, "meta": json.loads(l.meta or "{}"), "created_at": l.created_at.isoformat()} for l in logs],
        "otp": [{"id": o.id, "email": o.email, "purpose": o.purpose, "status": o.status, "used": o.used, "expires_at": o.expires_at.isoformat(), "created_at": o.created_at.isoformat()} for o in otp],
    }


@app.get("/api/developer/db")
def db_view(user: User = Depends(require_roles("developer"))):
    path = ROOT / "costrasphere.db"
    tables: dict[str, Any] = {}
    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
            name = row["name"]
            tables[name] = [dict(r) for r in conn.execute(f"SELECT * FROM {name} LIMIT 100")]
    return tables


@app.get("/api/developer/users")
def users(user: User = Depends(require_roles("developer")), db: Session = Depends(get_db)):
    return [serialize_user(u) for u in db.query(User).order_by(User.id.desc()).all()]


@app.post("/api/developer/users/{user_id}/role")
def change_role(user_id: int, role: Literal["customer", "company", "developer"], user: User = Depends(require_roles("developer")), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = role
    db.commit()
    return serialize_user(target)


@app.post("/api/datasets/global-city-costs.csv")
def export_global_csv(user: User = Depends(require_roles("developer"))):
    buf = io.StringIO()
    COST_DATA.drop(columns=["city_l", "state_l"], errors="ignore").to_csv(buf, index=False, quoting=csv.QUOTE_MINIMAL)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=global_city_costs.csv"})


@app.post("/api/upload-profile-image")
async def upload_profile_image(file: UploadFile, user: User = Depends(current_user)):
    content = await file.read()
    encoded = f"data:{file.content_type};base64," + base64.b64encode(content).decode("ascii")
    return {"data_url": encoded}
