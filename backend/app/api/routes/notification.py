from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_notifications():
    # TODO: 接資料庫
    return {"notifications": []}


@router.post("/")
async def create_notification():
    # TODO: 實作通知建立
    return {"status": "created"}
