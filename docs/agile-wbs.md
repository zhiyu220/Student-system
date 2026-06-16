# Agile WBS（工作分解結構）

> 本文件以 Epic → User Story → Task 三層結構拆解，每個 Task 對應一個 feature branch。
> Sprint 長度預設 **2 週**，每個 Sprint 約可消化 2–3 個 Story。

---

## Sprint 規劃概覽

| Sprint | 主題              | Epic          |
|--------|-------------------|---------------|
| S1     | 基礎建設 + 學籍   | Infra, F1     |
| S2     | 選課 + 成績       | F1            |
| S3     | 通知系統          | F2            |
| S4     | 畢業審核          | F3            |
| S5     | AI 推薦           | F4            |
| S6     | 活動系統          | F5            |
| S7     | 就業系統          | F6            |
| S8     | 整合測試 + 上線   | QA, DevOps    |

---

## Infra — 基礎建設

### Story INF-1：建立開發環境
- [ ] Task：撰寫 `docker-compose.yml`（DB + Backend + Frontend）
- [ ] Task：建立 `.env.example` 環境變數範本
- [ ] Task：設定 Nginx 反向代理規則
- [ ] Task：撰寫 `README.md` 快速啟動說明

### Story INF-2：建立 CI/CD 流程
- [ ] Task：設定 GitHub Actions（lint + build）
- [ ] Task：設定 Zeabur 自動部署（develop → staging）
- [ ] Task：設定 main → production 部署

### Story INF-3：Health Check & 共用元件
- [ ] Task：實作 `GET /api/health`
- [ ] Task：建立前端共用 CSS / JS（Navbar、Toast、Loading）
- [ ] Task：建立 Backend 錯誤回傳格式（`{ detail, code }`）

---

## F1 — 學籍 / 選課系統

### Story F1-1：瀏覽課程清單
**As a** 學生，**I want to** 查看所有開課清單，**so that** 我可以選擇想上的課。

- [ ] Task（後端）：實作 `GET /api/academic/courses`（分頁、篩選系所）
- [ ] Task（後端）：實作 `GET /api/academic/courses/{id}`（課程詳情）
- [ ] Task（前端）：實作 `courses.html` 課程列表頁（卡片式呈現）
- [ ] Task（前端）：實作課程詳情 Modal / 跳頁

### Story F1-2：選課 / 退選
**As a** 學生，**I want to** 線上選課及退選，**so that** 不需要臨櫃辦理。

- [ ] Task（後端）：實作 `POST /api/academic/enrollments`（含人數上限檢查）
- [ ] Task（後端）：實作 `DELETE /api/academic/enrollments/{id}`
- [ ] Task（前端）：選課按鈕、狀態即時更新（已選 / 額滿）
- [ ] Task（前端）：退選確認 Dialog

### Story F1-3：查看個人課表
**As a** 學生，**I want to** 查看我的當學期課表，**so that** 掌握上課時間地點。

- [ ] Task（後端）：實作 `GET /api/academic/students/{id}/schedule`
- [ ] Task（前端）：`dashboard.html` 課表區塊（週視圖）

### Story F1-4：查看成績 / 修課紀錄
**As a** 學生，**I want to** 查看歷年成績與修課紀錄，**so that** 追蹤學業進度。

- [ ] Task（後端）：實作 `GET /api/academic/students/{id}/grades`
- [ ] Task（前端）：`course_history01.html` — 修課紀錄列表
- [ ] Task（前端）：`course_history02.html` — 成績詳情 / GPA 計算

---

## F2 — 通知系統

### Story F2-1：查看通知列表
**As a** 學生，**I want to** 查看所有系統通知，**so that** 不遺漏重要公告。

- [ ] Task（後端）：實作 `GET /api/notification/?user_id=`（支援已讀/未讀篩選）
- [ ] Task（前端）：`notifications.html` 通知列表（含未讀紅點 badge）

### Story F2-2：標記已讀
**As a** 學生，**I want to** 將通知標記為已讀，**so that** 清楚知道哪些還未處理。

- [ ] Task（後端）：實作 `PATCH /api/notification/{id}/read`
- [ ] Task（前端）：點擊通知自動標記已讀 + UI 狀態切換

### Story F2-3：建立通知（管理員）
**As a** 管理員，**I want to** 對指定學生或全體發送通知，**so that** 傳達重要資訊。

- [ ] Task（後端）：實作 `POST /api/notification/`（支援廣播）
- [ ] Task（後端）：通知發送 Log 記錄

---

## F3 — 畢業審核系統

### Story F3-1：畢業資格查詢
**As a** 學生，**I want to** 查詢我的畢業資格狀態，**so that** 知道還差哪些學分或條件。

- [ ] Task（後端）：實作畢業審核邏輯（總學分、必修、選修）
- [ ] Task（後端）：`GET /api/academic/students/{id}/graduation-status`
- [ ] Task（前端）：`graduation.html` — 進度條 + 缺少項目清單

### Story F3-2：畢業申請
**As a** 學生，**I want to** 線上申請畢業審查，**so that** 不需要紙本送件。

- [ ] Task（後端）：`POST /api/academic/graduation-application`
- [ ] Task（前端）：申請表單 + 送出確認

---

## F4 — AI 課程推薦系統

### Story F4-1：個人化課程推薦
**As a** 學生，**I want to** 看到適合我的課程推薦，**so that** 更有效率地規劃修課。

- [ ] Task（AI 後端）：設計推薦演算法（協同過濾 / 內容過濾）
- [ ] Task（AI 後端）：實作 `GET /api/ai/recommendations/{student_id}`
- [ ] Task（前端）：`dashboard.html` 推薦課程區塊（滑動卡片）
- [ ] Task（前端）：「為什麼推薦這門課」說明 Tooltip

### Story F4-2：推薦回饋
**As a** 學生，**I want to** 對推薦課程給予評分，**so that** 推薦越來越準確。

- [ ] Task（後端）：`POST /api/ai/recommendations/{student_id}/feedback`
- [ ] Task（前端）：Like / Dislike 按鈕

---

## F5 — 活動系統

### Story F5-1：瀏覽活動列表
**As a** 學生，**I want to** 查看所有校內活動，**so that** 選擇想參加的活動。

- [ ] Task（後端）：`GET /api/events/`（含分類、日期篩選）
- [ ] Task（前端）：`events.html` 活動列表（卡片 + 日曆切換）

### Story F5-2：活動報名
**As a** 學生，**I want to** 線上報名活動，**so that** 確保名額。

- [ ] Task（後端）：`POST /api/events/{id}/register`（含名額上限）
- [ ] Task（前端）：`events-register.html` 報名表單 + 成功回饋

### Story F5-3：查看活動詳情
**As a** 學生，**I want to** 看到活動的完整資訊，**so that** 做出是否參加的決定。

- [ ] Task（後端）：`GET /api/events/{id}`
- [ ] Task（前端）：`events-detail.html` 活動詳情頁

### Story F5-4：活動參與紀錄 / 出席 Log
**As a** 學生，**I want to** 查看我的活動參與紀錄，**so that** 統計課外活動時數。

- [ ] Task（後端）：`GET /api/events/records?student_id=`
- [ ] Task（後端）：`GET /api/events/logs?student_id=`（出席打卡紀錄）
- [ ] Task（前端）：`events-records.html` 報名紀錄列表
- [ ] Task（前端）：`events-logs.html` 出席日誌時間軸

---

## F6 — 就業系統

### Story F6-1：瀏覽職缺
**As a** 學生，**I want to** 查看合作企業的職缺資訊，**so that** 找到適合的實習 / 工作機會。

- [ ] Task（後端）：`GET /api/jobs/`（含關鍵字、類型篩選）
- [ ] Task（前端）：`jobs.html` 職缺列表

### Story F6-2：求職狀態追蹤
**As a** 學生，**I want to** 追蹤我的求職進度，**so that** 掌握每個職缺的面試狀態。

- [ ] Task（後端）：`GET /api/jobs/applications?student_id=`
- [ ] Task（前端）：求職看板（投遞中 / 面試中 / 錄取 / 拒絕）

---

## QA — 品質保證

### Story QA-1：單元測試
- [ ] Task：Backend API 單元測試（pytest，覆蓋率 ≥ 70%）
- [ ] Task：前端元件互動測試

### Story QA-2：整合測試 / E2E
- [ ] Task：選課完整流程 E2E（Playwright）
- [ ] Task：活動報名 E2E 測試

### Story QA-3：效能 & 安全
- [ ] Task：API 回應時間壓測（Locust）
- [ ] Task：SQL Injection / XSS 掃描
- [ ] Task：Dependency 弱點掃描（`pip audit`）

---

## 優先級排序（MoSCoW）

| 優先級   | 功能                                  |
|----------|---------------------------------------|
| **Must** | INF, F1（課程/選課/課表）, F2（通知） |
| **Should** | F3（畢業審核）, F5（活動）          |
| **Could** | F4（AI 推薦）, F6（就業）           |
| **Won't** | 行動 App、多語系（本版本不做）       |

---

## Definition of Done（完成定義）

每個 Task 完成須符合：
1. 功能可在 `develop` 環境正常運作
2. 有對應的 API 回傳格式符合 `api-spec.md`
3. PR 至少 1 人 review 且通過
4. 附上測試截圖或 `curl` 輸出
5. 無 ESLint / Flake8 錯誤
