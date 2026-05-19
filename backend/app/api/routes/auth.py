from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class LoginRequest(BaseModel):
    """登入請求"""
    username: str
    password: str


class LoginResponse(BaseModel):
    """登入回應"""
    access_token: str
    token_type: str
    user_id: str
    username: str


class User(BaseModel):
    """使用者資訊"""
    user_id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """使用者登入"""
    # TODO: 實作登入邏輯，連接資料庫驗證
    # TODO: 生成 JWT token
    return {
        "access_token": "token_string",
        "token_type": "bearer",
        "user_id": "user123",
        "username": request.username,
    }


@router.post("/logout")
async def logout():
    """使用者登出"""
    # TODO: 實作登出邏輯（例如: token 黑名單）
    return {
        "status": "success",
        "message": "登出成功",
    }


@router.post("/register")
async def register(user_data: dict):
    """使用者註冊"""
    # TODO: 實作註冊邏輯
    return {
        "status": "success",
        "message": "註冊成功",
        "user_id": "new_user_id",
    }


@router.get("/me", response_model=User)
async def get_current_user():
    """獲取目前登入使用者資訊"""
    # TODO: 實作 JWT token 驗證
    return {
        "user_id": "user123",
        "username": "student",
        "email": "student@university.edu",
        "full_name": "張三",
        "role": "student",
    }


@router.post("/refresh-token")
async def refresh_token():
    """刷新 JWT token"""
    # TODO: 實作 token 刷新邏輯
    return {
        "access_token": "new_token_string",
        "token_type": "bearer",
    }
