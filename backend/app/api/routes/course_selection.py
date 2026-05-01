from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class CourseSelectionRequest(BaseModel):
    """選課請求"""
    student_id: str
    course_id: int


class CourseDropRequest(BaseModel):
    """退課請求"""
    student_id: str
    course_id: int


@router.get("/available")
async def get_available_courses():
    """獲取可選課程列表"""
    # TODO: 接資料庫
    return {
        "available_courses": [
            {"id": 1, "name": "資料結構", "credits": 3, "instructor": "陳教授", "capacity": 50, "enrolled": 45},
            {"id": 2, "name": "作業系統", "credits": 3, "instructor": "林教授", "capacity": 40, "enrolled": 38},
        ]
    }


@router.post("/select")
async def select_course(request: CourseSelectionRequest):
    """選課"""
    # TODO: 實作選課邏輯
    return {
        "status": "success",
        "message": "選課成功",
        "student_id": request.student_id,
        "course_id": request.course_id,
    }


@router.post("/drop")
async def drop_course(request: CourseDropRequest):
    """退課"""
    # TODO: 實作退課邏輯
    return {
        "status": "success",
        "message": "退課成功",
        "student_id": request.student_id,
        "course_id": request.course_id,
    }


@router.get("/{student_id}/selected")
async def get_selected_courses(student_id: str):
    """獲取學生已選課程"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "selected_courses": [],
    }
