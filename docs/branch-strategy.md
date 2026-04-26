# Branch Strategy

## 結構

```
main          ← 只放穩定版本，只有 PM merge
develop       ← 整合分支
team/frontend ← 前端組整合
team/backend  ← 後端組整合
team/ai       ← AI 組整合
feature/*     ← 個人功能分支
hotfix/*      ← main 緊急修復
```

## 開發流程

1. 從 team branch 開 feature branch
```bash
git checkout team/backend
git pull origin team/backend
git checkout -b feature/F3-graduation-audit
```

2. 開發完畢，push 並開 PR 回 team branch
```bash
git push origin feature/F3-graduation-audit
# 在 GitHub 開 PR → team/backend
```

3. team lead 確認後 merge，再由 PM 統一 PR 進 develop

## 禁止事項

- ❌ 直接 push develop 或 main
- ❌ 在 feature branch 改 schema.sql（開 issue 討論）
- ❌ PR 沒有任何 reviewer 就 merge

## Commit 格式

```
feat: 新增畢業審核頁面
fix: 修正選課人數上限計算
docs: 更新 API spec
chore: 升級 fastapi 版本
```

## PR 規則

- 至少 1 人 review
- 標題格式：`[F3] 畢業審核 - 新增查詢功能`
- 要附上測試截圖或 curl 輸出
