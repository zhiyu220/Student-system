from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.db import get_db

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    student_id: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ── Routes ────────────────────────────────────────────────────────────

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT id, student_id, name, role, status,
                   department_id, password_hash, must_change_password
            FROM users
            WHERE student_id = :sid
        """),
        {"sid": req.student_id},
    )
    user = result.mappings().fetchone()

    if not user or not verify_password(req.password, user["password_hash"] or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")

    if user["status"] == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="帳號已停用")

    await db.execute(
        text("UPDATE users SET last_login_at = now() WHERE id = :uid"),
        {"uid": str(user["id"])},
    )
    await db.commit()

    token = create_access_token({
        "user_id": str(user["id"]),
        "student_id": user["student_id"],
        "role": user["role"],
        "name": user["name"],
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "must_change_password": bool(user["must_change_password"]),
        "user": {
            "student_id": user["student_id"],
            "name": user["name"],
            "role": user["role"],
            "department_id": str(user["department_id"]) if user["department_id"] else None,
        },
    }


@router.post("/logout")
async def logout():
    return {"status": "success", "message": "登出成功"}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT password_hash FROM users WHERE id = :uid"),
        {"uid": str(current_user["id"])},
    )
    row = result.mappings().fetchone()

    if not verify_password(req.old_password, row["password_hash"] or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="舊密碼不正確")

    await db.execute(
        text("""
            UPDATE users
            SET password_hash = :hash, must_change_password = false, updated_at = now()
            WHERE id = :uid
        """),
        {"hash": hash_password(req.new_password), "uid": str(current_user["id"])},
    )
    await db.commit()
    return {"message": "密碼更新成功"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    dept_id = current_user["department_id"]
    return {
        "student_id": current_user["student_id"],
        "name": current_user["name"],
        "role": current_user["role"],
        "department_id": str(dept_id) if dept_id else None,
        "avatar_url": current_user["avatar_url"] or None,
        "must_change_password": bool(current_user["must_change_password"]),
    }
