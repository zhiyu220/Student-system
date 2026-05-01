from fastapi import APIRouter, Query
from typing import List, Optional

router = APIRouter()


@router.get("/")
async def list_course_records():
    """獲取所有修課紀錄"""
    # TODO: 接資料庫
    return {
        "course_records": [
            {
                "id": 1,
                "course_name": "資料結構",
                "credits": 3,
                "instructor": "陳教授",
                "semester": "113-1",
                "grade": "A",
            },
            {
                "id": 2,
                "course_name": "作業系統",
                "credits": 3,
                "instructor": "林教授",
                "semester": "113-1",
                "grade": "B+",
            },
        ]
    }


@router.get("/{student_id}")
async def get_student_course_records(student_id: str):
    """獲取特定學生的修課紀錄"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "course_records": [],
        "total_credits": 0,
        "gpa": 0.0,
    }


@router.get("/{student_id}/schedule")
async def get_course_schedule(student_id: str):
    """獲取學生的課程時間表"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "schedule": [],
    }
