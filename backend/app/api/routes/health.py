from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


@router.get("/demo")
async def demo():
    return {
        "message": "Smart Campus System is running",
        "features": [
            "academic", "notification", "ai-recommendation"
        ],
    }
