from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
import bcrypt
import jwt
from app.schemas.auth import LoginRequest, ChangePasswordRequest, UserResponse, LoginResponse, ChangePasswordResponse
from app.models.user import User, UserStatus

router = APIRouter()

# JWT 配置
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# 簡單的內存用戶數據庫 (實際應使用真實數據庫)
MOCK_USERS = {
    "S001": {
        "student_id": "S001",
        "name": "王小明",
        "email": "student1@example.com",
        "department": "資工系",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode(),
        "status": "active",
        "must_change_password": False,
    },
    "S002": {
        "student_id": "S002",
        "name": "李小華",
        "email": "student2@example.com",
        "department": "電子系",
        "password_hash": bcrypt.hashpw(b"newuser123", bcrypt.gensalt()).decode(),
        "status": "active",
        "must_change_password": True,
    },
    "S003": {
        "student_id": "S003",
        "name": "陳小美",
        "email": "student3@example.com",
        "department": "機械系",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode(),
        "status": "suspended",
        "must_change_password": False,
    },
}

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

@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """登入端點"""
    # 查詢用戶（模擬數據庫）
    user_data = MOCK_USERS.get(request.student_id)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="帳號或密碼錯誤",
        )
    
    # bcrypt 密碼驗證
    password_correct = bcrypt.checkpw(
        request.password.encode(),
        user_data["password_hash"].encode()
    )
    
    if not password_correct:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="帳號或密碼錯誤",
        )
    
    # 檢查用戶 status
    if user_data["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="帳號已停用或被凍結",
        )
    
    # 檢查是否需要修改密碼
    if user_data["must_change_password"]:
        # 只發臨時 token，不允許系統存取
        temp_token = create_access_token(request.student_id, is_temporary=True)
        return LoginResponse(
            token=temp_token,
            user=UserResponse(**{k: v for k, v in user_data.items() if k != "password_hash"}),
            must_change_password=True,
        )
    
    # 正常登入
    token = create_access_token(request.student_id)
    return LoginResponse(
        token=token,
        user=UserResponse(**{k: v for k, v in user_data.items() if k != "password_hash"}),
        must_change_password=False,
    )

@router.post("/auth/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request: ChangePasswordRequest,
    token: str = None,
):
    """修改密碼端點（首次登入）"""
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
    
    # 更新用戶密碼
    user_data = MOCK_USERS.get(student_id)
    if user_data:
        user_data["password_hash"] = bcrypt.hashpw(
            request.password.encode(),
            bcrypt.gensalt()
        ).decode()
        user_data["must_change_password"] = False
    
    # 發正式 token
    new_token = create_access_token(student_id)
    return ChangePasswordResponse(
        message="密碼已成功修改",
        token=new_token,
    )

@router.post("/auth/logout")
async def logout():
    """登出端點"""
    # 實際上 JWT 是無狀態的，登出只需前端清除 token
    return {"message": "已登出"}
