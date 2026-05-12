from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.core.db import get_session_factory, get_db

router = APIRouter()


@router.get("/")
async def list_notifications(
    session: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
):
    """獲取用戶的所有通知"""
    try:
        # TODO: 需要添加用戶身份驗證，從 token 取得 student_id
        # 現在返回空列表作為佔位符
        return {
            "notifications": [],
            "total": 0,
            "skip": skip,
            "limit": limit,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法獲取通知: {str(e)}",
        )


@router.get("/unread-count")
async def get_unread_count(session: AsyncSession = Depends(get_db)):
    """獲取未讀通知數量"""
    try:
        # TODO: 需要添加用戶身份驗證
        return {"unread_count": 0}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法獲取未讀通知數: {str(e)}",
        )


@router.post("/mark-as-read/{notification_id}")
async def mark_as_read(
    notification_id: str,
    session: AsyncSession = Depends(get_db),
):
    """標記通知為已讀"""
    try:
        # TODO: 實作標記為已讀的邏輯
        return {"status": "success", "message": "已標記為已讀"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法標記通知: {str(e)}",
        )


@router.post("/")
async def create_notification(
    title: str,
    message: str,
    notification_type: str = "info",
    session: AsyncSession = Depends(get_db),
):
    """建立新通知 - 內部 API"""
    try:
        # TODO: 實作建立通知的邏輯
        return {
            "status": "created",
            "notification_id": "notif_001",
            "title": title,
            "message": message,
            "type": notification_type,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"無法建立通知: {str(e)}",
        )

