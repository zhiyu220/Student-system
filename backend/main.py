from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import (
    health,
    academic,
    course_records,
    course_selection,
    graduation,
    auth,
    notification,
    job_registration,
    events,
    ai,
)
from app.core.config import settings
from routers import course_history

app = FastAPI(
    title="Smart Campus System API",
    version= settings.App_VERSION,
    description="校園智慧系統 API",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#課程歷史追蹤(sy)
app.include_router(course_history.router)

# 健康檢查
app.include_router(health.router, prefix="/api", tags=["health"])

# 登入登出（需要在其他路由之前）
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# 修課紀錄
app.include_router(course_records.router, prefix="/api/course-records", tags=["course_records"])

# 選課系統
app.include_router(course_selection.router, prefix="/api/course-selection", tags=["course_selection"])

# 畢業追蹤
app.include_router(graduation.router, prefix="/api/graduation", tags=["graduation"])

# 通知系統
app.include_router(notification.router, prefix="/api/notification", tags=["notification"])

# 工作報名
app.include_router(job_registration.router, prefix="/api/jobs", tags=["jobs"])

# 活動報名
app.include_router(events.router, prefix="/api/events", tags=["events"])

# AI 相關 API
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(auth.router, prefix="/api", tags=["auth"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
