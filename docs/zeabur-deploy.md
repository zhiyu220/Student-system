# 部署到 Zeabur — 操作手冊

> 只有 PM 需要做這份文件的設定，隊友不用動。

---

## 架構

```
Zeabur 專案（smart-campus）
├── frontend  服務   → Next.js   → xxx.zeabur.app
├── backend   服務   → FastAPI   → yyy.zeabur.app
└── database  服務   → PostgreSQL（共用，隊友本機也連這裡）
```

---

## Step 1：建立 Zeabur 帳號 & 專案

1. 前往 https://zeabur.com 用 GitHub 登入
2. 建立新專案，命名 `smart-campus`
3. 選擇伺服器區域（建議 **Asia East**）

---

## Step 2：新增 PostgreSQL

1. Add Service → Marketplace → 搜尋 **PostgreSQL** → 建立
2. 建立後進入 PostgreSQL 服務 → **Instructions**
3. 找到兩個連線字串：
   - **Public**：`postgresql://user:pass@zzz.zeabur.app:port/db`（隊友本機用）
   - **Private**：`postgresql://user:pass@postgresql.zeabur.internal:5432/db`（Zeabur 內部服務用）
4. 用 Public 連線字串跑初始化（只需要跑一次）：

```bash
psql "Public 連線字串" -f database/schema.sql
psql "Public 連線字串" -f database/seed.sql
```

5. 把 **Public 連線字串**發給所有隊友，讓他們填進 `.env`

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

4. 部署完成 → Networking → Generate Domain → 複製 URL

---

## Step 4：部署 Frontend（Next.js）

1. Add Service → Git → 同一個 repo
2. **Root Directory** 設成 `frontend`
3. Service Variables 加：

| 變數名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_API_URL` | Step 3 的 backend URL |

4. 部署完成 → Generate Domain

---

## Step 5：設定 CORS

Backend Variables 補上：

| 變數名 | 值 |
|--------|-----|
| `FRONTEND_URL` | Step 4 的 frontend URL |

儲存後 Zeabur 自動 redeploy。

---

## Step 6：確認部署成功

```bash
curl https://你的後端.zeabur.app/api/health
# {"status":"ok","version":"0.1.0"}
```

---

## 自動部署

push 到 `main` → GitHub Actions 檢查 → Zeabur 自動 redeploy  
develop / feature branch **不會**觸發部署。

---

## 給隊友的連線字串發送方式

建議透過私訊或加密的方式傳送，不要 commit 進 repo。  
`.env` 已在 `.gitignore` 中，不會被 push 上去。

---

## 費用估算

| 服務 | 預估月費 |
|------|---------|
| Frontend | ~$1–3 |
| Backend | ~$1–3 |
| PostgreSQL | ~$1–2 |
| **合計** | **$3–8 / 月** |

---

## 常見問題

**Q: 隊友連不上 DB？**  
A: 確認他們填的是 Public 連線字串，不是 Private。Private 只有 Zeabur 內部服務能用。

**Q: 環境變數改了沒生效？**  
A: Zeabur 改完變數要手動點 Redeploy。

**Q: CORS error？**  
A: 確認 `FRONTEND_URL` 已設定且 backend 有 redeploy。

**Q: DB 連線字串要怎麼傳給隊友？**  
A: 私訊或 LINE，不要放進 repo 或 Discord 公開頻道。
