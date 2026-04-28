# 部署到 Zeabur — 操作手冊

> 只有 PM 需要做這份文件的設定，隊友不用動。

---

## 架構

```
Zeabur 專案（smart-campus）
├── backend   服務   → FastAPI   → yyy.zeabur.app
└── database  服務   → PostgreSQL（共用，隊友本機也連這裡）

前端 → 純 HTML，直接用瀏覽器開，不需要部署服務
```

---

## Step 1：建立 Zeabur 帳號 & 專案

1. 前往 https://zeabur.com 用 GitHub 登入
2. 建立新專案，命名 `smart-campus`
3. 選擇伺服器區域（建議 **Asia East**）

---

## Step 2：新增 PostgreSQL

1. Add Service → Marketplace → 搜尋 **PostgreSQL** → 建立
2. 進入 PostgreSQL 服務 → **Instructions**
3. 找到兩個連線字串：
   - **Public**：`postgresql://user:pass@zzz.zeabur.app:port/db`（隊友本機用）
   - **Private**：`postgresql://user:pass@postgresql.zeabur.internal:5432/db`（Zeabur 內部用）
4. 用 Public 連線字串跑初始化（只需要跑一次）：

```bash
psql "Public 連線字串" -f database/schema.sql
psql "Public 連線字串" -f database/seed.sql
```

5. 把 **Public 連線字串**私訊發給所有隊友，讓他們填進 `.env`

---

## Step 3：部署 Backend（FastAPI）

1. Add Service → Git → 選 GitHub repo
2. **Root Directory** 設成 `backend`
3. Service Variables 加：

| 變數名 | 值 |
|--------|-----|
| `DATABASE_URL` | Step 2 的 **Private** 連線字串 |
| `SECRET_KEY` | 自己設一個隨機字串 |
| `DEBUG` | `false` |
| `CORS_ORIGINS` | `["*"]` |

4. 部署完成 → Networking → Generate Domain → 複製 URL

---

## Step 4：前端設定

前端是純 HTML，不需要部署到 Zeabur。

隊友只需要：
1. 把 `frontend/js/api.js` 裡的 `API_BASE` 改成 Step 3 的 backend URL
2. 用瀏覽器直接開 `dashboard.html`

```js
// frontend/js/api.js 第一行改成：
const API_BASE = 'https://你的backend.zeabur.app';
```

---

## 自動部署

push 到 `main` → GitHub Actions 做 backend 語法檢查 → Zeabur 自動 redeploy backend

---

## 確認部署成功

```bash
curl https://你的後端.zeabur.app/api/health
# {"status":"ok","version":"0.1.0"}
```

---

## 費用估算

| 服務 | 預估月費 |
|------|---------|
| Backend | ~$1–3 |
| PostgreSQL | ~$1–2 |
| **合計** | **$2–5 / 月** |

前端不需要部署，省掉一個服務的費用。

---

## 常見問題

**Q: 前端打 API 出現 CORS error？**
A: 確認 backend Variables 的 `CORS_ORIGINS` 設成 `["*"]`，並 Redeploy。

**Q: 隊友連不上 DB？**
A: 確認填的是 Public 連線字串，不是 Private。

**Q: 環境變數改了沒生效？**
A: Zeabur 改完變數要手動點 Redeploy。
