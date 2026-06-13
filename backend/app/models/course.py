from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), nullable=False, index=True)  # 課號（例如 IM307）
    name = Column(String(255), nullable=False)  # 課程名稱
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    grade_level = Column(Integer, nullable=True)  # 開課年級
    credits = Column(Integer, nullable=True)  # 學分數
    type = Column(String(20), nullable=False)  # required / elective / university_required / general_education
    # 子類別：用於校必修/通識的逐項畢業審查。
    # 例：chinese / english / english_cert / programming / service_learning / pe /
    #     classic_books / ge_humanities / ge_social / ge_science / ge_arts /
    #     ge_interdisciplinary ...
    sub_category = Column(String(40), nullable=True)
    academic_year = Column(Integer, nullable=False)  # 學年度
    semester = Column(Integer, nullable=False)  # 學期（1/2）
    capacity = Column(Integer, nullable=True)  # 人數上限
    section = Column(String(10), nullable=True)  # 班別（A/B/C...）
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True


class CourseInstructor(Base):
    __tablename__ = "course_instructors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, index=True)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # primary / co_instructor / assistant
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False, index=True)
    grade = Column(Numeric(5, 2), nullable=True)  # 成績
    status = Column(String(20), nullable=False)  # enrolled / dropped / completed
    pass_flag = Column(Boolean, nullable=True)  # 是否通過
    attempt = Column(Integer, nullable=True)  # 第幾次修課
    is_counted = Column(Boolean, nullable=True)  # 是否列入畢業學分
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), nullable=False, index=True)  # 系所代碼
    name = Column(String(100), nullable=False)  # 系所名稱
    faculty = Column(String(100), nullable=True)  # 學院
    status = Column(String(20), nullable=True)  # active / inactive
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    class Config:
        from_attributes = True

