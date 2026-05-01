from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()


class EventRegistrationRequest(BaseModel):
    """活動報名"""
    event_id: int
    student_id: str
    dietary_restrictions: Optional[str] = None


class Event(BaseModel):
    """活動"""
    id: int
    title: str
    description: str
    date: datetime
    location: str
    capacity: int
    registered: int
    event_type: str


@router.get("/")
async def list_events():
    """獲取所有活動"""
    # TODO: 接資料庫
    return {
        "events": [
            {
                "id": 1,
                "title": "開學迎新會",
                "description": "校園開學迎新活動",
                "date": "2024-09-15",
                "location": "操場",
                "capacity": 500,
                "registered": 200,
                "event_type": "迎新",
            }
        ]
    }


@router.get("/{event_id}")
async def get_event_detail(event_id: int):
    """獲取特定活動詳情"""
    # TODO: 接資料庫
    return {
        "id": event_id,
        "title": "開學迎新會",
        "description": "校園開學迎新活動",
        "date": "2024-09-15",
        "location": "操場",
        "capacity": 500,
        "registered": 200,
        "event_type": "迎新",
        "organizer": "學生會",
        "contact": "contact@university.edu",
    }


@router.post("/register")
async def register_event(request: EventRegistrationRequest):
    """報名活動"""
    # TODO: 實作報名邏輯
    return {
        "status": "success",
        "message": "報名成功",
        "event_id": request.event_id,
        "student_id": request.student_id,
        "registration_id": "reg123",
    }


@router.get("/{student_id}/registrations")
async def get_student_event_registrations(student_id: str):
    """獲取學生的活動報名"""
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "registrations": [],
    }


@router.get("/registrations/{registration_id}")
async def get_registration_status(registration_id: str):
    """獲取報名狀態"""
    # TODO: 接資料庫
    return {
        "registration_id": registration_id,
        "status": "已報名",
        "registered_date": "2024-11-01",
        "event_id": 1,
    }


@router.delete("/registrations/{registration_id}")
async def cancel_registration(registration_id: str):
    """取消報名"""
    # TODO: 實作取消邏輯
    return {
        "status": "success",
        "message": "報名已取消",
        "registration_id": registration_id,
    }


@router.get("/")
async def list_event_categories():
    """獲取活動分類"""
    # TODO: 接資料庫
    return {
        "categories": [
            "迎新",
            "講座",
            "工作坊",
            "社團",
            "比賽",
        ]
    }
