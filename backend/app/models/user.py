from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class User(Base):
    __tablename__ = "users"

    student_id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.active)
    must_change_password = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.student_id}>"
