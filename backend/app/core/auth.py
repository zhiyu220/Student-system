from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db

ACCESS_TOKEN_EXPIRE_HOURS = 8
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效或已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_access_token(token)
    user_id: Optional[str] = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 無效")

    result = await db.execute(
        text("""
            SELECT id, student_id, name, role, status,
                   department_id, must_change_password,
                   COALESCE(avatar_url, '') AS avatar_url
            FROM users
            WHERE id = :uid
        """),
        {"uid": user_id},
    )
    user = result.mappings().fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用戶不存在")
    if user["status"] == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="帳號已停用")

    return user
