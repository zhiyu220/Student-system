from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import bcrypt
import jwt
from app.schemas.auth import LoginRequest, ChangePasswordRequest, UserResponse, LoginResponse, ChangePasswordResponse
from app.models.user import User, UserStatus
from app.core.db import get_session_factory

router = APIRouter()

# JWT 配置
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

async def get_db_session() -> AsyncSession:
    """獲取數據庫會話"""
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session

def create_access_token(student_id: str, is_temporary: bool = False):
    """產生 JWT token"""
    if is_temporary:
        expire = datetime.utcnow() + timedelta(hours=1)
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    payload = {
        "sub": student_id,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verify_token(token: str):
    """驗證 JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        student_id = payload.get("sub")
        if not student_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token 無效",
            )
        return student_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已過期",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效",
        )

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, session: AsyncSession = Depends(get_db_session)):
    """登入端點 - 使用真實數據庫"""
    # 查詢用戶
    stmt = select(User).where(User.student_id == request.student_id)
    result = await session.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="帳號或密碼錯誤",
        )
    
    # bcrypt 密碼驗證
    password_correct = bcrypt.checkpw(
        request.password.encode(),
        user.password_hash.encode()
    )
    
    if not password_correct:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="帳號或密碼錯誤",
        )
    
    # 檢查用戶 status
    if user.status != UserStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="帳號已停用或被凍結",
        )
    
    # 更新最後登入時間
    user.last_login_at = datetime.utcnow()
    await session.commit()
    
    # 檢查是否需要修改密碼
    if user.must_change_password:
        temp_token = create_access_token(user.student_id, is_temporary=True)
        return LoginResponse(
            token=temp_token,
            user=UserResponse(
                student_id=user.student_id,
                name=user.name,
                email=user.email,
                department=user.department,
                must_change_password=True,
            ),
            must_change_password=True,
        )
    
    # 正常登入
    token = create_access_token(user.student_id)
    return LoginResponse(
        token=token,
        user=UserResponse(
            student_id=user.student_id,
            name=user.name,
            email=user.email,
            department=user.department,
            must_change_password=False,
        ),
        must_change_password=False,
    )

@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request: ChangePasswordRequest,
    token: str = None,
    session: AsyncSession = Depends(get_db_session),
):
    """修改密碼端點 - 使用真實數據庫"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="需要提供 token",
        )
    
    # 驗證臨時 token
    student_id = verify_token(token)
    
    # 驗證密碼
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密碼至少需要 6 個字符",
        )
    
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="兩次密碼輸入不一致",
        )
    
    # 查詢並更新用戶密碼
    stmt = select(User).where(User.student_id == student_id)
    result = await session.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用戶不存在",
        )
    
    user.password_hash = bcrypt.hashpw(
        request.password.encode(),
        bcrypt.gensalt()
    ).decode()
    user.must_change_password = False
    user.updated_at = datetime.utcnow()
    await session.commit()
    
    # 發正式 token
    new_token = create_access_token(student_id)
    return ChangePasswordResponse(
        message="密碼已成功修改",
        token=new_token,
    )

@router.post("/logout")
async def logout():
    """登出端點"""
    # 實際上 JWT 是無狀態的，登出只需前端清除 token
    return {"message": "已登出"}
