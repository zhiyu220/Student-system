from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "Smart Campus System"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Zeabur 自動注入 PostgreSQL 連線資訊
    # 優先讀 DATABASE_URL，沒有的話拆開讀
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/smart_campus"
    )

    CORS_ORIGINS: List[str] = (
        # 優先讀環境變數設定的完整清單
        eval(os.getenv("CORS_ORIGINS", "[]")) if os.getenv("CORS_ORIGINS") else [
            "http://localhost:3000",
            "http://localhost:8000",
            # Zeabur 部署後的前端 URL
            *([url.strip() for url in os.getenv("FRONTEND_URL", "").split(",") if url.strip()]),
        ]
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-in-production")

    model_config = ConfigDict(
        env_file=".env",
        extra="allow"  # 允許額外的環境變量（如前端配置）
    )


settings = Settings()
