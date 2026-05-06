from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()


class JobPost(BaseModel):
    """工作職位"""
    id: int
    title: str
    company: str
    description: str
    salary_range: str
    location: str
    deadline: datetime
    requirements: List[str]


class JobApplicationRequest(BaseModel):
    """工作申請"""
    job_id: int
    student_id: str
    resume_url: Optional[str] = None
    cover_letter: Optional[str] = None


@router.get("/")
async def list_job_postings():
    """獲取所有職位"""
    # TODO: 接資料庫
    return {
        "job_postings": [
            {
                "id": 1,
                "title": "軟體工程師實習生",
                "company": "Tech Company A",
                "description": "尋求軟體工程師實習生",
                "salary_range": "時薪 200-250 元",
                "location": "台北",
                "deadline": "2024-12-31",
                "requirements": ["Python", "JavaScript"],
            }
        ]
    }


@router.get("/{job_id}")
async def get_job_detail(job_id: int):
    """獲取特定職位詳情"""
    # TODO: 接資料庫
    return {
        "job_id": job_id,
        "title": "軟體工程師實習生",
        "company": "Tech Company A",
        "description": "尋求軟體工程師實習生",
        "salary_range": "時薪 200-250 元",
        "location": "台北",
        "deadline": "2024-12-31",
        "requirements": ["Python", "JavaScript"],
    }


@router.post("/apply")
async def apply_for_job(request: JobApplicationRequest):
    """申請工作"""
    # TODO: 實作申請邏輯
    return {
        "status": "success",
        "message": "申請成功",
        "job_id": request.job_id,
        "student_id": request.student_id,
        "application_id": "app123",
    }


@router.get("/{student_id}/applications")
async def get_student_job_applications(student_id: str):
    """獲取學生的工作申請"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "applications": [],
    }


@router.get("/applications/{application_id}")
async def get_application_status(application_id: str):
    """獲取申請狀態"""
    # TODO: 接資料庫
    return {
        "application_id": application_id,
        "status": "待審核",
        "applied_date": "2024-11-01",
        "job_id": 1,
    }


@router.delete("/applications/{application_id}")
async def cancel_application(application_id: str):
    """取消申請"""
    # TODO: 實作取消邏輯
    return {
        "status": "success",
        "message": "申請已取消",
        "application_id": application_id,
    }
