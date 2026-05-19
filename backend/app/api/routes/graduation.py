from fastapi import APIRouter
from typing import List, Optional

router = APIRouter()


@router.get("/{student_id}")
async def get_graduation_status(student_id: str):
    """獲取學生畢業進度"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "graduation_status": "進行中",
        "required_credits": 128,
        "completed_credits": 0,
        "progress_percentage": 0,
        "requirements": [
            {
                "category": "必修課程",
                "required": 60,
                "completed": 0,
                "courses": [],
            },
            {
                "category": "選修課程",
                "required": 30,
                "completed": 0,
                "courses": [],
            },
            {
                "category": "通識課程",
                "required": 20,
                "completed": 0,
                "courses": [],
            },
            {
                "category": "服務學習",
                "required": 18,
                "completed": 0,
            },
        ],
    }


@router.get("/{student_id}/audit-checklist")
async def get_graduation_audit_checklist(student_id: str):
    """獲取畢業審查清單"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "checklist": {
            "credits_met": False,
            "gpa_met": False,
            "service_learning_met": False,
            "thesis_submitted": False,
            "documents_submitted": False,
        },
    }


@router.get("/{student_id}/missing-requirements")
async def get_missing_requirements(student_id: str):
    """獲取缺少的畢業要求"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "missing_requirements": [],
        "recommendations": [],
    }
