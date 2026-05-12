from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db

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


class JobApplicationResponse(BaseModel):
    """工作申請回應"""
    status: str
    message: str
    job_id: int
    student_id: str
    application_id: str


@router.get("/")
async def list_job_postings(
    session: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
):
    """獲取所有職位 - TODO: 連接實際數據庫"""
    try:
        # TODO: 從 job_postings 表獲取數據
        return {
            "job_postings": [
                {
                    "id": 1,
                    "title": "軟體工程師實習生",
                    "company": "Tech Company A",
                    "description": "尋求軟體工程師實習生",
                    "salary_range": "時薪 200-250 元",
                    "location": "台北",
                    "deadline": "2025-12-31",
                    "requirements": ["Python", "JavaScript"],
                }
            ],
            "total": 1,
            "skip": skip,
            "limit": limit,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法獲取職位列表: {str(e)}",
        )


@router.get("/{job_id}")
async def get_job_detail(
    job_id: int,
    session: AsyncSession = Depends(get_db),
):
    """獲取特定職位詳情 - TODO: 連接實際數據庫"""
    try:
        # TODO: 從 job_postings 表獲取特定職位
        return {
            "job_id": job_id,
            "title": "軟體工程師實習生",
            "company": "Tech Company A",
            "description": "尋求軟體工程師實習生",
            "salary_range": "時薪 200-250 元",
            "location": "台北",
            "deadline": "2025-12-31",
            "requirements": ["Python", "JavaScript"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法獲取職位詳情: {str(e)}",
        )


@router.post("/apply", response_model=JobApplicationResponse)
async def apply_for_job(
    request: JobApplicationRequest,
    session: AsyncSession = Depends(get_db),
):
    """申請工作 - TODO: 連接實際數據庫"""
    try:
        # TODO: 驗證職位是否存在
        # TODO: 檢查學生是否已申請
        # TODO: 保存申請到數據庫
        
        return {
            "status": "success",
            "message": "申請成功",
            "job_id": request.job_id,
            "student_id": request.student_id,
            "application_id": f"app_{request.job_id}_{request.student_id}",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"申請失敗: {str(e)}",
        )


@router.get("/{student_id}/applications")
async def get_student_job_applications(
    student_id: str,
    session: AsyncSession = Depends(get_db),
):
    """獲取學生的工作申請 - TODO: 連接實際數據庫"""
    try:
        # TODO: 從 job_applications 表獲取學生的所有申請
        return {
            "student_id": student_id,
            "applications": [],
            "total": 0,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法獲取申請列表: {str(e)}",
        )


@router.get("/applications/{application_id}")
async def get_application_status(
    application_id: str,
    session: AsyncSession = Depends(get_db),
):
    """獲取申請狀態 - TODO: 連接實際數據庫"""
    try:
        # TODO: 從 job_applications 表查詢申請狀態
        return {
            "application_id": application_id,
            "status": "待審核",
            "applied_date": "2025-01-14",
            "job_id": 1,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法獲取申請狀態: {str(e)}",
        )


@router.delete("/applications/{application_id}")
async def withdraw_application(
    application_id: str,
    session: AsyncSession = Depends(get_db),
):
    """撤回申請 - TODO: 連接實際數據庫"""
    try:
        # TODO: 驗證申請是否存在
        # TODO: 檢查是否可以撤回（例如：狀態不是已完成）
        # TODO: 從數據庫刪除或標記為撤回
        
        return {
            "status": "success",
            "message": "申請已撤回",
            "application_id": application_id,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法撤回申請: {str(e)}",
        )
