from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.models.course import Course, CourseInstructor, Enrollment
from app.models.user import User

router = APIRouter()


class CourseSelectionRequest(BaseModel):
    """選課請求"""
    student_id: str  # UUID 字符串格式
    course_id: str  # UUID 字符串格式


class CourseDropRequest(BaseModel):
    """退課請求"""
    student_id: str  # UUID 字符串格式
    course_id: str  # UUID 字符串格式


@router.get("/available")
async def get_available_courses(db: AsyncSession = Depends(get_db)):
    """獲取可選課程列表（連接真實數據庫）"""
    try:
        result = await db.execute(select(Course).order_by(Course.academic_year, Course.semester))
        courses = result.scalars().all()
        
        return {
            "available_courses": [
                {
                    "id": str(c.id),
                    "code": c.code,
                    "name": c.name,
                    "credits": c.credits,
                    "type": c.type,
                    "semester": c.semester,
                    "academic_year": c.academic_year,
                    "capacity": c.capacity,
                    "section": c.section,
                }
                for c in courses
            ]
        }
    except Exception as e:
        print(f"Error fetching available courses: {e}")
        return {"available_courses": []}


@router.post("/select")
async def select_course(request: CourseSelectionRequest, db: AsyncSession = Depends(get_db)):
    """選課"""
    # TODO: 實作選課邏輯（檢查容量、記錄到 enrollments 表等）
    return {
        "status": "success",
        "message": "選課成功",
        "student_id": request.student_id,
        "course_id": request.course_id,
    }


@router.post("/drop")
async def drop_course(request: CourseDropRequest, db: AsyncSession = Depends(get_db)):
    """退課"""
    # TODO: 實作退課邏輯（更新 enrollments 表）
    return {
        "status": "success",
        "message": "退課成功",
        "student_id": request.student_id,
        "course_id": request.course_id,
    }


@router.get("/{student_id}/selected")
async def get_selected_courses(student_id: str, db: AsyncSession = Depends(get_db)):
    """獲取學生已選課程"""
    # TODO: 接資料庫、實作學生已選課程查詢（從 enrollments 表）
    return {
        "student_id": student_id,
        "selected_courses": [],
    }



