from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="customer")
    company_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="user")
    chat_history = relationship("ChatHistory", back_populates="user")


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    city = Column(String, nullable=False)
    distance_km = Column(Float, nullable=False)
    terrain = Column(String, nullable=False)
    tower_count = Column(Integer, nullable=False)
    fiber_length_km = Column(Float, nullable=False)
    labor_type = Column(String, nullable=False)
    estimated_days = Column(Integer, nullable=True)
    worker_count = Column(Integer, nullable=True)
    total_salary_cost = Column(Float, nullable=True)
    total_material_cost = Column(Float, nullable=True)
    total_project_cost = Column(Float, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    cost_breakdown = relationship("CostBreakdown", back_populates="project", uselist=False)


class CostBreakdown(Base):
    __tablename__ = "cost_breakdowns"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    material_cost = Column(Float, default=0)
    labor_cost = Column(Float, default=0)
    tower_cost = Column(Float, default=0)
    fiber_cost = Column(Float, default=0)
    maintenance_cost = Column(Float, default=0)
    transport_cost = Column(Float, default=0)

    project = relationship("Project", back_populates="cost_breakdown")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chat_history")
