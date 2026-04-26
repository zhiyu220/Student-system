# API Specification v0.1

> 所有人在開始實作前，先來這裡確認 endpoint 定義。
> 不得自行更改命名，有疑問開 issue 討論。

## 命名規則

- 全部 snake_case
- 路徑：`/api/{module}/{resource}`
- 回傳：JSON，統一包 `data` 或直接回物件

## Health

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/health | 服務健康狀態 |
| GET | /api/demo | 展示用端點 |

## Academic（學籍系統）

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/academic/courses | 課程列表 |
| GET | /api/academic/courses/{id} | 單一課程 |
| GET | /api/academic/students/{id}/schedule | 學生課表 |
| GET | /api/academic/students/{id}/grades | 學生成績 |
| POST | /api/academic/enrollments | 選課 |
| DELETE | /api/academic/enrollments/{id} | 退選 |

## Notification（通知系統）

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/notification/ | 通知列表（需帶 user_id） |
| POST | /api/notification/ | 建立通知 |
| PATCH | /api/notification/{id}/read | 標記已讀 |

## AI（推薦系統）

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/ai/recommendations/{student_id} | 課程推薦 |

---

## 回傳格式範例

```json
// 成功
{ "data": [...] }

// 錯誤
{ "detail": "Not found", "code": 404 }
```
