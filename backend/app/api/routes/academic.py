from fastapi import APIRouter

router = APIRouter()


@router.get("/courses")
async def list_courses():
    # TODO: 接資料庫
    return {
        "courses": [
            {"id": 1, "name": "資料結構", "credits": 3, "instructor": "陳教授"},
            {"id": 2, "name": "作業系統", "credits": 3, "instructor": "林教授"},
        ]
    }


@router.get("/students/{student_id}/schedule")
async def get_schedule(student_id: str):
    # TODO: 接資料庫
    return {
        "student_id": student_id,
        "schedule": []
    }
