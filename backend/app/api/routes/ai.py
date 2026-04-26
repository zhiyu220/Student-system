from fastapi import APIRouter

router = APIRouter()


@router.get("/recommendations/{student_id}")
async def get_recommendations(student_id: str):
    # TODO: 接 AI 推薦模型
    return {
        "student_id": student_id,
        "recommendations": []
    }
