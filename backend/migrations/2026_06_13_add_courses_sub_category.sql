-- ============================================================================
-- Migration: 為 courses 新增 sub_category 欄位，支援校必修/通識的「逐項」畢業審查
-- ----------------------------------------------------------------------------
-- 背景：
--   原本「University Compulsory & General Education」(CREDIT_SUM 31) 只比對總學分，
--   造成 (1) 類別互相灌水 (2) 0 學分的體育隱形 (3) 子項目不檢查 等漏洞。
--   新增 sub_category 後，graduation.py 可逐子項判定（含「通過次數」與「跨領域數」）。
-- ============================================================================

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS sub_category VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_courses_sub_category ON courses (sub_category);

-- ----------------------------------------------------------------------------
-- 回填範本：請依貴系實際課號調整 WHERE 條件後執行。
-- sub_category 值需與 backend/app/api/routes/graduation.py 的 UNIVERSITY_COMPULSORY
-- 及 GE_CATEGORIES 設定一致。
-- ----------------------------------------------------------------------------

-- 校必修 21 學分 -----------------------------------------------------------
-- 國文（2學分 × 2學期）
-- UPDATE courses SET type='university_required', sub_category='chinese'
--   WHERE code IN ('GE001','GE002');

-- 必修英文 + 主題式英文（各 2學分 × 2學期）
-- UPDATE courses SET type='university_required', sub_category='english'
--   WHERE code IN ('GE011','GE012','GE013','GE014');

-- 英語檢定（1學分，Pass/Fail，可由英檢成績單或大四修課抵免）
-- UPDATE courses SET type='university_required', sub_category='english_cert'
--   WHERE code IN ('GE015');

-- 程式設計（2學分 × 2學期）
-- UPDATE courses SET type='university_required', sub_category='programming'
--   WHERE code IN ('GE021','GE022');

-- 服務學習（1學分，完成即計，不論學期）
-- UPDATE courses SET type='university_required', sub_category='service_learning'
--   WHERE code IN ('GE031');

-- 體育（0學分 × 4學期）
-- UPDATE courses SET type='university_required', sub_category='pe'
--   WHERE code IN ('PE001','PE002','PE003','PE004');

-- 經典五十（2學分 × 1學期，大三後可修）
-- UPDATE courses SET type='university_required', sub_category='classic_books'
--   WHERE code IN ('GE041');

-- 通識 10 學分（5 大領域，各 2學分 × 1學期）------------------------------------
-- UPDATE courses SET type='general_education', sub_category='ge_humanities'       WHERE code IN (...);
-- UPDATE courses SET type='general_education', sub_category='ge_social'           WHERE code IN (...);
-- UPDATE courses SET type='general_education', sub_category='ge_science'          WHERE code IN (...);
-- UPDATE courses SET type='general_education', sub_category='ge_arts'             WHERE code IN (...);
-- UPDATE courses SET type='general_education', sub_category='ge_interdisciplinary' WHERE code IN (...);
