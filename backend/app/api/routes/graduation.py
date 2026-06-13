import asyncio

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db

router = APIRouter()

TRACK_A = {"IM360", "IM446"}
TRACK_B = {"IM359", "IM445"}

DIGITAL_APP_CODES = {"IM120", "IM226", "IM303", "IM240", "IM345"}

# ── University Compulsory (校必修) 子項規則 ────────────────────────────────────
# 每個子項都必須「各自」達標，不能用總學分互相灌水。
#   required_credits → 該子項需修得的學分
#   required_passes  → 該子項需「通過」的課堂數（學期數）。0 學分課（體育）靠這個判定。
# 子項由 courses.sub_category 標記（見 migrations/2026_06_13_add_courses_sub_category.sql）。
UNIVERSITY_COMPULSORY = {
    "chinese":          {"label": "國文",         "required_credits": 4, "required_passes": 2},
    "english":          {"label": "英文",         "required_credits": 8, "required_passes": 4},
    "english_cert":     {"label": "英語檢定",     "required_credits": 1, "required_passes": 1},
    "programming":      {"label": "程式設計",     "required_credits": 4, "required_passes": 2},
    "service_learning": {"label": "服務學習",     "required_credits": 1, "required_passes": 1},
    "pe":               {"label": "體育",         "required_credits": 0, "required_passes": 4},
    "classic_books":    {"label": "經典五十",     "required_credits": 2, "required_passes": 1},
}
# 校必修總學分 = 各子項學分加總（目前 20；如貴系為 21，請於上方調整對應子項）。
UNIVERSITY_COMPULSORY_CREDITS = sum(r["required_credits"] for r in UNIVERSITY_COMPULSORY.values())

# ── 通識 (General Education) 規則：總學分 + 跨領域數雙重門檻 ────────────────────
GE_REQUIRED_CREDITS   = 10
GE_MIN_CATEGORIES     = 4   # 須橫跨 4 大領域（以不同 sub_category 計）


@router.get("/{student_id}")
async def get_graduation_status(student_id: str, db: AsyncSession = Depends(get_db)):
    # ── Step 1: look up user + department ────────────────────────────────
    user_result = await db.execute(
        text("""
            SELECT u.id, u.name, u.student_id, u.department_id,
                   COALESCE(d.name, '') AS dept_name
            FROM users u
            LEFT JOIN departments d ON d.id = u.department_id
            WHERE u.student_id = :sid
        """),
        {"sid": student_id},
    )
    user = user_result.mappings().fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    user_id  = str(user["id"])
    dept_id  = str(user["department_id"]) if user["department_id"] else None

    if not dept_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Student has no department assigned")

    # ── Steps 2 & 3: run requirements + enrollments queries in parallel ───
    req_result, enroll_result = await asyncio.gather(
        db.execute(
            text("""
                SELECT id::text, rule_name, rule_type, required_value
                FROM graduation_requirements
                WHERE department_id = :dept_id
            """),
            {"dept_id": dept_id},
        ),
        db.execute(
            text("""
                SELECT c.code,
                       COALESCE(c.name_en, c.name) AS name_en,
                       c.credits, c.type, c.sub_category,
                       e.pass_flag, e.status, e.is_counted
                FROM enrollments e
                JOIN courses c ON c.id = e.course_id
                WHERE e.user_id = :uid
            """),
            {"uid": user_id},
        ),
    )
    requirements = req_result.mappings().all()
    enrollments  = enroll_result.mappings().all()

    # Build lookup: code → enrollment record
    enroll_by_code: dict = {}
    for e in enrollments:
        code = e["code"]
        if code not in enroll_by_code:
            enroll_by_code[code] = e
        else:
            # Keep the best attempt (pass_flag=True preferred)
            if e["pass_flag"] and not enroll_by_code[code]["pass_flag"]:
                enroll_by_code[code] = e

    passed_codes  = {code for code, e in enroll_by_code.items() if e["pass_flag"]}
    enrolled_only = {code for code, e in enroll_by_code.items() if e["status"] == "enrolled" and not e["pass_flag"]}

    # Credits earned per course type (pass_flag=True AND is_counted=True)
    type_credits: dict[str, int] = {}
    for code, e in enroll_by_code.items():
        if e["pass_flag"] and e["is_counted"]:
            ctype = e["type"]
            type_credits[ctype] = type_credits.get(ctype, 0) + (e["credits"] or 0)

    # ── Step 4: requirement_courses for LIST_ALL rules ────────────────────
    list_all_reqs = [r for r in requirements if r["rule_type"] == "LIST_ALL"]
    req_course_map: dict[str, list] = {}  # req_id → list of course dicts

    if list_all_reqs:
        req_ids = [r["id"] for r in list_all_reqs]
        placeholders = ", ".join(f":rid_{i}" for i in range(len(req_ids)))
        rc_params = {f"rid_{i}": req_ids[i] for i in range(len(req_ids))}
        rc_result = await db.execute(
            text(f"""
                SELECT rc.requirement_id::text,
                       c.code,
                       COALESCE(c.name_en, c.name) AS name_en,
                       c.credits
                FROM requirement_courses rc
                JOIN courses c ON c.id = rc.course_id
                WHERE rc.requirement_id::text IN ({placeholders})
            """),
            rc_params,
        )
        for row in rc_result.mappings().all():
            rid = row["requirement_id"]
            req_course_map.setdefault(rid, []).append(dict(row))

    # ── Step 5: build buckets ─────────────────────────────────────────────
    # Merge all LIST_ALL requirements into one "Department Required Courses" bucket.
    # CREDIT_SUM 24 → Elective, CREDIT_SUM 31 → University.
    TOTAL_REQUIRED = 128

    # --- Department Required Courses (merged from all LIST_ALL rules) ---
    dept_required_credits = 0
    dept_earned_credits   = 0
    dept_missing: list    = []
    dept_blocking: list   = []

    for req in requirements:
        rid     = req["id"]
        rtype   = req["rule_type"]
        req_val = req["required_value"] or 0

        if rtype == "LIST_ALL":
            dept_required_credits += int(req_val)
            req_courses = req_course_map.get(rid, [])
            for c in req_courses:
                if c["code"] in passed_codes:
                    dept_earned_credits += (c["credits"] or 0)
                else:
                    e = enroll_by_code.get(c["code"])
                    dept_missing.append({
                        "code":    c["code"],
                        "name_en": c["name_en"],
                        "credits": c["credits"],
                        "status":  e["status"] if e else "not_enrolled",
                    })
                    if c["code"] in enrolled_only:
                        dept_blocking.append(
                            f"{c['code']} {c['name_en']} — currently enrolled"
                        )

    buckets = [
        {
            "name":             "Department Required Courses",
            "required_credits": dept_required_credits,
            "earned_credits":   dept_earned_credits,
            "missing_courses":  dept_missing,
            "passed":           dept_earned_credits >= dept_required_credits and not dept_blocking,
            "_blocking":        dept_blocking,
        }
    ]
    total_earned_credits = dept_earned_credits

    # Passed & counted enrollments grouped by sub_category (for the structured
    # University Compulsory / General Education audit below).
    passed_by_sub: dict[str, list] = {}
    for e in enroll_by_code.values():
        if e["pass_flag"] and e["is_counted"]:
            passed_by_sub.setdefault(e["sub_category"], []).append(e)

    for req in requirements:
        rtype   = req["rule_type"]
        req_val = int(req["required_value"] or 0)

        if rtype == "CREDIT_SUM" and req_val == 24:
            earned = type_credits.get("elective", 0)
            buckets.append({
                "name":             "Elective Courses",
                "required_credits": 24,
                "earned_credits":   earned,
                "missing_courses":  [],
                "passed":           earned >= 24,
                "_blocking":        [],
            })
            total_earned_credits += earned
        elif rtype == "CREDIT_SUM" and req_val == 31:
            ug_blocking: list  = []
            sub_requirements: list = []

            # ── 校必修：逐子項判定 ───────────────────────────────────────────
            # required_credits == 0 的子項（例：體育）視為「非學分必修」，
            # 不論課程資料的 credits 填多少，一律只看通過次數、不計入學分。
            uni_earned = 0
            for key, rule in UNIVERSITY_COMPULSORY.items():
                attempts       = passed_by_sub.get(key, [])
                pass_count     = len(attempts)
                credit_bearing = rule["required_credits"] > 0
                earned_credits = sum(a["credits"] or 0 for a in attempts) if credit_bearing else 0
                ok = (pass_count >= rule["required_passes"]
                      and earned_credits >= rule["required_credits"])
                uni_earned += earned_credits  # 非學分課貢獻 0，不會灌水總學分
                row = {
                    "key":             key,
                    "label":           rule["label"],
                    "required_passes": rule["required_passes"],
                    "passes":          pass_count,
                    "met":             ok,
                }
                if credit_bearing:
                    row["required_credits"] = rule["required_credits"]
                    row["earned_credits"]   = earned_credits
                sub_requirements.append(row)
                if not ok:
                    ug_blocking.append(f"校必修 — {rule['label']} 尚未完成")

            # ── 通識：總學分 + 跨領域數雙重門檻 ──────────────────────────────
            ge_attempts   = [
                e for e in enroll_by_code.values()
                if e["pass_flag"] and e["is_counted"] and e["type"] == "general_education"
            ]
            ge_credits    = sum(e["credits"] or 0 for e in ge_attempts)
            ge_categories = {e["sub_category"] for e in ge_attempts if e["sub_category"]}
            ge_ok = ge_credits >= GE_REQUIRED_CREDITS and len(ge_categories) >= GE_MIN_CATEGORIES
            sub_requirements.append({
                "key":              "general_education",
                "label":            "通識",
                "required_credits": GE_REQUIRED_CREDITS,
                "earned_credits":   ge_credits,
                "required_categories": GE_MIN_CATEGORIES,
                "categories":       len(ge_categories),
                "met":              ge_ok,
            })
            if not ge_ok:
                ug_blocking.append(
                    f"通識 — 需 {GE_REQUIRED_CREDITS} 學分且橫跨 {GE_MIN_CATEGORIES} 領域"
                    f"（目前 {ge_credits} 學分 / {len(ge_categories)} 領域）"
                )

            earned       = uni_earned + ge_credits
            required_cr  = UNIVERSITY_COMPULSORY_CREDITS + GE_REQUIRED_CREDITS
            buckets.append({
                "name":             "University Compulsory & General Education",
                "required_credits": required_cr,
                "earned_credits":   earned,
                "missing_courses":  [],
                "sub_requirements": sub_requirements,
                # 關鍵：不再只看總學分，而是「每個子項都達標」才算通過。
                "passed":           not ug_blocking,
                "_blocking":        ug_blocking,
            })
            total_earned_credits += earned

    # Enforce consistent bucket order
    _order = {"Department Required Courses": 0, "Elective Courses": 1, "University Compulsory & General Education": 2}
    buckets.sort(key=lambda b: _order.get(b["name"], 99))

    # ── Step 6: aggregate blocking items + capstone track ────────────────
    all_blocking: list[str] = []
    for b in buckets:
        all_blocking.extend(b.pop("_blocking"))

    capstone_track = None
    if TRACK_A & passed_codes:
        capstone_track = "A"
    elif TRACK_B & passed_codes:
        capstone_track = "B"

    # ── Step 7: overall summary ───────────────────────────────────────────
    credits_in_progress = sum(
        (e["credits"] or 0)
        for e in enrollments
        if e["status"] == "enrolled"
    )
    percentage = round(total_earned_credits / TOTAL_REQUIRED * 100) if TOTAL_REQUIRED else 0
    # Each bucket carries its own `passed` verdict (the University bucket requires
    # every sub-requirement met, not just a credit total), so trust that flag.
    can_graduate = all(
        b.get("passed", b["earned_credits"] >= b["required_credits"])
        for b in buckets
    ) and not all_blocking

    return {
        "student": {
            "name":       user["name"],
            "student_id": user["student_id"],
            "department": user["dept_name"],
        },
        "overall": {
            "total_required":      TOTAL_REQUIRED,
            "credits_earned":      total_earned_credits,
            "credits_in_progress": credits_in_progress,
            "percentage":          percentage,
        },
        "buckets":       buckets,
        "capstone_track":  capstone_track,
        "can_graduate":    can_graduate,
        "blocking_items":  all_blocking,
    }
