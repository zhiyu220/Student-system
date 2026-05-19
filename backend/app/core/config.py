import json
from pathlib import Path
from typing import Any, List

from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    APP_NAME: str = "Smart Campus System"
    App_VERSION: str = "0.1.2"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/smart_campus"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://student-system-frontend.zeabur.app",
        "https://student-system.zeabur.app",
    ]
    SECRET_KEY: str = "change-this-in-production"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if value is None:
            return False

        normalized = str(value).strip().lower()
        if normalized in {"1", "true", "yes", "on", "debug", "development"}:
            return True
        if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
            return False

        return False

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped == "*":
                return ["*"]
            if stripped.startswith("["):
                try:
                    return json.loads(stripped)
                except json.JSONDecodeError:
                    return [item.strip() for item in stripped.split(",") if item.strip()]
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    model_config = ConfigDict(
        env_file=ROOT_ENV_FILE,
        extra="allow",
    )


settings = Settings()
