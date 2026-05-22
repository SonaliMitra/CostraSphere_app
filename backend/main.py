from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from database import engine, get_db, Base
from models import User, OTPCode, Project, CostBreakdown, ChatHistory
from auth import hash_password, verify_password, create_access_token, decode_token
from otp_service import generate_otp, send_otp_email, verify_otp
from ai_engine import estimator
from pdf_generator import generate_project_pdf

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CostraSphere AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "customer"
    company_name: str = None

class LoginRequest(BaseModel):
    email: str
    password: str

class SendOTPRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

class ProjectCreateRequest(BaseModel):
    project_name: str
    country: str
    city: str
    tower_count: int
    fiber_length_km: float
    terrain: str
    labor_type: str

class ChatRequest(BaseModel):
    message: str

def get_current_user(token: str, db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

@app.get("/")
async def root():
    return {"message": "CostraSphere AI API", "version": "1.0.0"}

@app.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(request.password)

    new_user = User(
        full_name=request.full_name,
        email=request.email,
        password=hashed_password,
        role=request.role,
        company_name=request.company_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role
        },
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_name": user.company_name
        },
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    otp = generate_otp()
    success = send_otp_email(request.email, otp)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP")

    return {"message": "OTP sent successfully", "email": request.email}

@app.post("/verify-otp")
async def verify_otp_endpoint(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    if not verify_otp(request.email, request.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "message": "OTP verified successfully",
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/forgot-password")
async def forgot_password(request: SendOTPRequest):
    otp = generate_otp()
    success = send_otp_email(request.email, otp)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP")

    return {"message": "Password reset OTP sent", "email": request.email}

@app.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(request.new_password)
    db.commit()

    return {"message": "Password reset successfully"}

@app.post("/create-project")
async def create_project(
    request: ProjectCreateRequest,
    token: str,
    db: Session = Depends(get_db)
):
    user = get_current_user(token, db)

    cost_data = estimator.calculate_costs(
        country=request.country,
        city=request.city,
        tower_count=request.tower_count,
        fiber_distance=request.fiber_length_km,
        terrain=request.terrain,
        labor_type=request.labor_type
    )

    project = Project(
        user_id=user.id,
        project_name=request.project_name,
        country=request.country,
        city=request.city,
        distance_km=request.fiber_length_km,
        terrain=request.terrain,
        tower_count=request.tower_count,
        fiber_length_km=request.fiber_length_km,
        labor_type=request.labor_type,
        estimated_days=cost_data["estimated_days"],
        worker_count=cost_data["worker_count"],
        total_salary_cost=cost_data["salary_cost"],
        total_material_cost=cost_data["material_cost"],
        total_project_cost=cost_data["total_project_cost"],
        status="pending"
    )

    db.add(project)
    db.flush()

    cost_breakdown = CostBreakdown(
        project_id=project.id,
        material_cost=cost_data["material_cost"],
        labor_cost=cost_data["labor_cost"],
        tower_cost=cost_data["tower_cost"],
        fiber_cost=cost_data["fiber_cost"],
        maintenance_cost=cost_data["maintenance_cost"],
        transport_cost=cost_data["transport_cost"]
    )

    db.add(cost_breakdown)
    db.commit()
    db.refresh(project)

    suggestions = estimator.get_ai_suggestions({
        "tower_count": request.tower_count,
        "fiber_length_km": request.fiber_length_km,
        "terrain": request.terrain,
        "labor_type": request.labor_type,
        "total_project_cost": cost_data["total_project_cost"]
    })

    return {
        "message": "Project created successfully",
        "project": {
            "id": project.id,
            "project_name": project.project_name,
            "country": project.country,
            "city": project.city,
            "total_project_cost": project.total_project_cost,
            "worker_count": project.worker_count,
            "estimated_days": project.estimated_days,
            "status": project.status
        },
        "cost_data": cost_data,
        "suggestions": suggestions
    }

@app.get("/projects")
async def get_projects(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    if user.role == "admin":
        projects = db.query(Project).all()
    else:
        projects = db.query(Project).filter(Project.user_id == user.id).all()

    return {
        "projects": [
            {
                "id": p.id,
                "project_name": p.project_name,
                "country": p.country,
                "city": p.city,
                "total_project_cost": p.total_project_cost,
                "worker_count": p.worker_count,
                "estimated_days": p.estimated_days,
                "status": p.status,
                "created_at": p.created_at
            }
            for p in projects
        ]
    }

@app.get("/project/{project_id}")
async def get_project(project_id: int, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if user.role != "admin" and project.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    cost_breakdown = db.query(CostBreakdown).filter(CostBreakdown.project_id == project_id).first()

    return {
        "project": {
            "id": project.id,
            "project_name": project.project_name,
            "country": project.country,
            "city": project.city,
            "tower_count": project.tower_count,
            "fiber_length_km": project.fiber_length_km,
            "terrain": project.terrain,
            "labor_type": project.labor_type,
            "total_project_cost": project.total_project_cost,
            "worker_count": project.worker_count,
            "estimated_days": project.estimated_days,
            "status": project.status,
            "created_at": project.created_at
        },
        "cost_breakdown": {
            "material_cost": cost_breakdown.material_cost if cost_breakdown else 0,
            "labor_cost": cost_breakdown.labor_cost if cost_breakdown else 0,
            "tower_cost": cost_breakdown.tower_cost if cost_breakdown else 0,
            "fiber_cost": cost_breakdown.fiber_cost if cost_breakdown else 0,
            "maintenance_cost": cost_breakdown.maintenance_cost if cost_breakdown else 0,
            "transport_cost": cost_breakdown.transport_cost if cost_breakdown else 0
        } if cost_breakdown else {}
    }

@app.post("/chat")
async def chat(request: ChatRequest, token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    response = generate_chatbot_response(request.message)

    chat_record = ChatHistory(
        user_id=user.id,
        message=request.message,
        response=response
    )
    db.add(chat_record)
    db.commit()

    return {
        "message": request.message,
        "response": response
    }

@app.get("/profile")
async def get_profile(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "company_name": user.company_name,
            "created_at": user.created_at
        }
    }

@app.get("/analytics")
async def get_analytics(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access analytics")

    total_projects = db.query(Project).count()
    total_users = db.query(User).count()
    total_cost = sum([p.total_project_cost for p in db.query(Project).all()] or [0])
    total_workers = sum([p.worker_count for p in db.query(Project).all()] or [0])

    return {
        "analytics": {
            "total_projects": total_projects,
            "total_users": total_users,
            "total_cost": total_cost,
            "total_workers": total_workers,
            "avg_project_cost": total_cost / max(total_projects, 1)
        }
    }

@app.get("/admin/users")
async def get_users(token: str, db: Session = Depends(get_db)):
    user = get_current_user(token, db)

    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access this")

    users = db.query(User).all()

    return {
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at
            }
            for u in users
        ]
    }

def generate_chatbot_response(message: str) -> str:
    message_lower = message.lower()

    responses = {
        "cost": "To estimate project costs, provide details like location, tower count, fiber distance, and terrain type. I can help you get accurate cost predictions using AI.",
        "tower": "Telecom towers are critical infrastructure for 5G and fiber deployment. Costs vary by terrain - urban areas are cheaper than mountains or forests.",
        "fiber": "Fiber deployment involves trenching, cable laying, and connection. Average cost is 40,000-50,000 per km depending on location and terrain complexity.",
        "worker": "Project workforce depends on scope. Typically, you need 5-15 workers for fiber deployment, with costs varying by skill level and location.",
        "timeline": "Project duration depends on fiber distance and tower count. Generally, expect 20-100 days for medium-sized deployments.",
        "maintain": "Maintenance is critical. Budget 5,000-10,000 per km annually for fiber maintenance and tower upkeep.",
        "5g": "5G deployment requires fiber connectivity, towers, and infrastructure. Our AI helps optimize placement and cost.",
        "hello": "Hello! I'm CostraSphere AI assistant. I can help you with telecom infrastructure planning, cost estimation, and project insights.",
        "help": "I can assist with: cost estimates, project planning, timeline prediction, worker requirements, and telecom infrastructure advice."
    }

    for keyword, response in responses.items():
        if keyword in message_lower:
            return response

    return "I can help you with telecom infrastructure planning. Try asking about costs, towers, fiber deployment, worker requirements, timelines, or maintenance. What would you like to know?"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
