from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, academic, notification, ai
from app.core.config import settings

app = FastAPI(
    title="Smart Campus System API",
    version="0.1.0",
    description="校園智慧系統 API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(academic.router, prefix="/api/academic", tags=["academic"])
app.include_router(notification.router, prefix="/api/notification", tags=["notification"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
