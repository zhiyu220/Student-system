from pydantic import BaseModel, Field
from typing import Optional

class LoginRequest(BaseModel):
    student_id: str = Field(..., description="學號")
    password: str = Field(..., description="密碼")

class ChangePasswordRequest(BaseModel):
    password: str = Field(..., description="新密碼")
    confirm_password: str = Field(..., description="確認密碼")

class UserResponse(BaseModel):
    student_id: str
    name: str
    email: str
    department: str
    must_change_password: bool = False

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    must_change_password: bool = False

class ChangePasswordResponse(BaseModel):
    message: str
    token: Optional[str] = None
