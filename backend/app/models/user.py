from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(String(20), nullable=True, index=True)  # 學號
    name = Column(String(100), nullable=False)  # 姓名
    email = Column(String(255), nullable=False, unique=True, index=True)  # Email
    role = Column(String(20), nullable=False)  # student / professor / admin
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    grade = Column(Integer, nullable=True)  # 年級
    enrollment_year = Column(Integer, nullable=True)  # 入學年度
    class_name = Column(String(50), nullable=True)  # 班級
    password_hash = Column(Text, nullable=True)
    must_change_password = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    avatar_url = Column(Text, nullable=True)
    status = Column(String(20), nullable=False)  # active / suspended / graduated
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True
