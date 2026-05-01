"""
API Routes Package

每個功能都有自己的獨立路由文件：
- auth.py: 登入登出
- course_records.py: 修課紀錄
- course_selection.py: 選課系統
- graduation.py: 畢業追蹤
- job_registration.py: 工作報名
- events.py: 活動報名
- notification.py: 通知系統
- health.py: 健康檢查
- ai.py: AI 相關 API
"""

from . import (
    health,
    auth,
    course_records,
    course_selection,
    graduation,
    notification,
    job_registration,
    events,
    ai,
)

__all__ = [
    "health",
    "auth",
    "course_records",
    "course_selection",
    "graduation",
    "notification",
    "job_registration",
    "events",
    "ai",
]
