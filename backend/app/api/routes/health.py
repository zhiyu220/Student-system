from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "version": settings.App_VERSION,
    }


@router.get("/demo")
async def demo():
    return {
        "message": "Smart Campus System is running",
        "features": [
            "academic", "notification", "ai-recommendation"
        ],
    }
