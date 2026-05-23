import os
import sys
from datetime import datetime
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, NotFound

BACKEND_DIR = os.path.dirname(__file__)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from ai_engine import estimator
from auth import create_access_token, decode_token, hash_password, verify_password
from database import Base, SessionLocal, engine
from models import ChatHistory, CostBreakdown, OTPCode, Project, User
from otp_service import generate_otp, send_otp_email, verify_otp

load_dotenv()

STATIC_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "frontend", "dist"))

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})


def startup_validation():
    if not os.getenv("JWT_SECRET"):
        app.logger.warning("JWT_SECRET is not set; using development fallback from auth.py")
    if not os.getenv("DATABASE_URL"):
        app.logger.warning("DATABASE_URL is not set; using local SQLite fallback")
    if not os.getenv("EMAIL_USER") or not os.getenv("EMAIL_PASSWORD"):
        app.logger.warning("EMAIL_USER/EMAIL_PASSWORD missing; email endpoints will fail until configured")


Base.metadata.create_all(bind=engine)
startup_validation()


def serialize_user(user: User):
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "company_name": user.company_name or "",
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def serialize_project(project: Project):
    return {
        "id": str(project.id),
        "user_id": str(project.user_id),
        "project_name": project.project_name,
        "country": project.country,
        "city": project.city,
        "distance_km": project.distance_km,
        "terrain": project.terrain,
        "tower_count": project.tower_count,
        "fiber_length_km": project.fiber_length_km,
        "labor_type": project.labor_type,
        "estimated_days": project.estimated_days or 0,
        "worker_count": project.worker_count or 0,
        "total_salary_cost": project.total_salary_cost or 0,
        "total_material_cost": project.total_material_cost or 0,
        "total_project_cost": project.total_project_cost or 0,
        "status": project.status,
        "created_at": project.created_at.isoformat() if project.created_at else None,
    }


def serialize_cost(cost: CostBreakdown):
    return {
        "id": str(cost.id),
        "project_id": str(cost.project_id),
        "material_cost": cost.material_cost,
        "labor_cost": cost.labor_cost,
        "tower_cost": cost.tower_cost,
        "fiber_cost": cost.fiber_cost,
        "maintenance_cost": cost.maintenance_cost,
        "transport_cost": cost.transport_cost,
    }


def serialize_chat(chat: ChatHistory):
    return {
        "id": str(chat.id),
        "user_id": str(chat.user_id),
        "message": chat.message,
        "response": chat.response,
        "created_at": chat.created_at.isoformat() if chat.created_at else None,
    }


def serialize_otp(otp: OTPCode):
    return {
        "id": str(otp.id),
        "email": otp.email,
        "otp": otp.otp,
        "created_at": otp.created_at.isoformat() if otp.created_at else None,
    }


def api_error(message, status=400):
    return jsonify({"error": message, "detail": message}), status


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    if isinstance(error, NotFound):
        path = request.path.lstrip("/")
        if request.path.startswith("/api/"):
            return api_error("API route not found", 404)
        candidate = os.path.join(app.static_folder, path)
        if path and os.path.exists(candidate) and os.path.isfile(candidate):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")
    if isinstance(error, HTTPException):
        return jsonify({"error": error.description}), error.code
    app.logger.exception(error)
    return jsonify({"error": "Internal server error"}), 500


def get_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    return request.headers.get("X-Auth-Token") or request.cookies.get("access_token")


def current_user():
    token = get_token()
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    email = payload.get("sub")
    if not email:
        return None
    db = SessionLocal()
    try:
        return db.query(User).filter(User.email == email).first()
    finally:
        db.close()


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return api_error("Not authenticated", 401)
        request.current_user = user
        return fn(*args, **kwargs)
    return wrapper


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "database": "connected", "static_dir": STATIC_DIR})


@app.post("/api/register")
@app.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name") or data.get("name") or email.split("@")[0]
    if not email or not password:
        return api_error("Email and password are required", 422)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            return api_error("Email already registered", 400)
        user = User(
            full_name=full_name,
            email=email,
            password=hash_password(password),
            role=data.get("role", "customer"),
            company_name=data.get("company_name") or "",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": user.email, "role": user.role})
        return jsonify({"message": "User registered successfully", "user": serialize_user(user), "access_token": token, "token_type": "bearer"})
    finally:
        db.close()


@app.post("/api/login")
@app.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password):
            return api_error("Invalid email or password", 401)
        token = create_access_token({"sub": user.email, "role": user.role})
        return jsonify({"message": "Login successful", "user": serialize_user(user), "access_token": token, "token_type": "bearer"})
    finally:
        db.close()


@app.get("/api/me")
@require_auth
def me():
    return jsonify({"user": serialize_user(request.current_user), "profile": serialize_user(request.current_user)})


@app.post("/api/send-otp")
def send_otp():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    if not email:
        return api_error("Email is required", 422)
    otp = generate_otp()
    if not send_otp_email(email, otp):
        return api_error("Unable to send OTP. Check SMTP environment variables.", 502)
    return jsonify({"success": True, "message": "OTP sent"})


@app.post("/api/verify-otp")
def verify_otp_route():
    data = request.get_json(silent=True) or {}
    ok = verify_otp(data.get("email", "").strip().lower(), data.get("otp", ""))
    return jsonify({"success": ok})


@app.post("/api/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    new_password = data.get("new_password") or data.get("newPassword")
    if not email or not new_password:
        return api_error("Email and new password are required", 422)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return api_error("User not found", 404)
        user.password = hash_password(new_password)
        db.commit()
        return jsonify({"success": True, "message": "Password updated"})
    finally:
        db.close()


@app.post("/api/ai-estimate")
def ai_estimate():
    data = request.get_json(silent=True) or {}
    latitude = float(data.get("latitude", 13.0827))
    longitude = float(data.get("longitude", 80.2707))
    tower_count = int(data.get("tower_count", 5))
    fiber_length_km = float(data.get("fiber_length_km", 10))
    labor_type = data.get("labor_type", "skilled")
    country = data.get("country", "India")
    city = data.get("city", "Chennai")
    terrain = data.get("terrain", "urban")
    costs = estimator.calculate_costs(country, city, tower_count, fiber_length_km, terrain, labor_type)
    result = {
        **costs,
        "nearest_city": {"name": city, "country": country, "latitude": latitude + 0.05, "longitude": longitude + 0.05},
        "terrain": terrain,
        "tower_density": "metro" if tower_count >= 5 else "regional",
        "nearby_towers": [
            {"id": i + 1, "latitude": latitude + (i + 1) * 0.01, "longitude": longitude + (i + 1) * 0.012, "type": ["macro", "micro", "small_cell"][i % 3]}
            for i in range(tower_count)
        ],
        "fiber_nodes": [
            {"id": i + 1, "latitude": latitude + (i + 1) * 0.006, "longitude": longitude - (i + 1) * 0.005, "type": "main_hub" if i == 0 else "distribution_point"}
            for i in range(max(2, tower_count // 2))
        ],
        "suggestions": estimator.get_ai_suggestions({**costs, "tower_count": tower_count, "terrain": terrain, "fiber_length_km": fiber_length_km}),
    }
    return jsonify(result)


@app.get("/api/projects")
@require_auth
def list_projects():
    db = SessionLocal()
    try:
        query = db.query(Project)
        user = request.current_user
        if user.role == "customer":
            query = query.filter(Project.user_id == user.id)
        eq_col = request.args.get("eq_col")
        eq_val = request.args.get("eq_val")
        if eq_col and eq_val and hasattr(Project, eq_col):
            query = query.filter(getattr(Project, eq_col) == eq_val)
        projects = query.order_by(Project.created_at.desc()).all()
        return jsonify([serialize_project(project) for project in projects])
    finally:
        db.close()


@app.post("/api/projects")
@require_auth
def create_project():
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        project = Project(
            user_id=request.current_user.id,
            project_name=data.get("project_name", "Untitled Project"),
            country=data.get("country", "India"),
            city=data.get("city", "Chennai"),
            distance_km=float(data.get("distance_km") or data.get("fiber_length_km") or 0),
            terrain=data.get("terrain", "urban"),
            tower_count=int(data.get("tower_count", 1)),
            fiber_length_km=float(data.get("fiber_length_km", 0)),
            labor_type=data.get("labor_type", "skilled"),
            estimated_days=int(data.get("estimated_days", 0)),
            worker_count=int(data.get("worker_count", 0)),
            total_salary_cost=float(data.get("total_salary_cost", 0)),
            total_material_cost=float(data.get("total_material_cost", 0)),
            total_project_cost=float(data.get("total_project_cost", 0)),
            status=data.get("status", "pending"),
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return jsonify(serialize_project(project))
    finally:
        db.close()


@app.get("/api/projects/<int:project_id>")
@require_auth
def get_project(project_id):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return api_error("Project not found", 404)
        return jsonify(serialize_project(project))
    finally:
        db.close()


@app.delete("/api/projects/<int:project_id>")
@require_auth
def delete_project(project_id):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return api_error("Project not found", 404)
        db.delete(project)
        db.commit()
        return jsonify({"success": True})
    finally:
        db.close()


@app.patch("/api/projects/<int:project_id>")
@require_auth
def update_project(project_id):
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return api_error("Project not found", 404)
        for key, value in data.items():
            if hasattr(project, key):
                setattr(project, key, value)
        db.commit()
        db.refresh(project)
        return jsonify(serialize_project(project))
    finally:
        db.close()


@app.post("/api/cost_breakdowns")
@require_auth
def create_cost_breakdown():
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        cost = CostBreakdown(
            project_id=int(data.get("project_id")),
            material_cost=float(data.get("material_cost", 0)),
            labor_cost=float(data.get("labor_cost", 0)),
            tower_cost=float(data.get("tower_cost", 0)),
            fiber_cost=float(data.get("fiber_cost", 0)),
            maintenance_cost=float(data.get("maintenance_cost", 0)),
            transport_cost=float(data.get("transport_cost", 0)),
        )
        db.add(cost)
        db.commit()
        db.refresh(cost)
        return jsonify(serialize_cost(cost))
    finally:
        db.close()


@app.post("/api/chat_history")
@require_auth
def create_chat_history():
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        row = ChatHistory(
            user_id=int(data.get("user_id") or request.current_user.id),
            message=data.get("message", ""),
            response=data.get("response", ""),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return jsonify(serialize_chat(row))
    finally:
        db.close()


@app.get("/api/table/<table>")
@require_auth
def table_query(table):
    serializers = {
        "profiles": (User, serialize_user),
        "users": (User, serialize_user),
        "projects": (Project, serialize_project),
        "cost_breakdowns": (CostBreakdown, serialize_cost),
        "chat_history": (ChatHistory, serialize_chat),
        "otp_codes": (OTPCode, serialize_otp),
    }
    if table not in serializers:
        return jsonify([])
    model, serializer = serializers[table]
    db = SessionLocal()
    try:
        query = db.query(model)
        eq_col = request.args.get("eq_col")
        eq_val = request.args.get("eq_val")
        if eq_col and eq_val and hasattr(model, eq_col):
            query = query.filter(getattr(model, eq_col) == eq_val)
        order_col = request.args.get("order")
        if order_col and hasattr(model, order_col):
            col = getattr(model, order_col)
            query = query.order_by(col.desc() if request.args.get("ascending") == "false" else col.asc())
        limit = int(request.args.get("limit", "100"))
        rows = query.limit(limit).all()
        if request.args.get("head") == "true":
            return jsonify({"count": query.count(), "data": []})
        return jsonify([serializer(row) for row in rows])
    finally:
        db.close()


@app.get("/api/cost_breakdowns")
@require_auth
def list_cost_breakdowns():
    return table_query("cost_breakdowns")


@app.post("/api/chat")
@require_auth
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")
    response = f"CostraSphere AI reviewed your request: {message}. Use the planning dashboard for a detailed estimate."
    db = SessionLocal()
    try:
        row = ChatHistory(user_id=request.current_user.id, message=message, response=response)
        db.add(row)
        db.commit()
    finally:
        db.close()
    return jsonify({"response": response})


@app.get("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/<path:path>")
def serve_spa(path):
    if path.startswith("api/"):
        return api_error("API route not found", 404)
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
