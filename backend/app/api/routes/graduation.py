from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db

router = APIRouter()

TRACK_A = {"IM360", "IM446"}
TRACK_B = {"IM359", "IM445"}

DIGITAL_APP_CODES = {"IM120", "IM226", "IM303", "IM240", "IM345"}


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

    # ── Step 2: graduation requirements for the department ────────────────
    if not dept_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Student has no department assigned")

    req_result = await db.execute(
        text("""
            SELECT id::text, rule_name, rule_type, required_value
            FROM graduation_requirements
            WHERE department_id = :dept_id
        """),
        {"dept_id": dept_id},
    )
    requirements = req_result.mappings().all()

    # ── Step 3: student's enrollments ────────────────────────────────────
    enroll_result = await db.execute(
        text("""
            SELECT c.code,
                   COALESCE(c.name_en, c.name) AS name_en,
                   c.credits, c.type,
                   e.pass_flag, e.status, e.is_counted
            FROM enrollments e
            JOIN courses c ON c.id = e.course_id
            WHERE e.user_id = :uid
        """),
        {"uid": user_id},
    )
    enrollments = enroll_result.mappings().all()

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
            "_blocking":        dept_blocking,
        }
    ]
    total_earned_credits = dept_earned_credits

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
                "_blocking":        [],
            })
            total_earned_credits += earned
        elif rtype == "CREDIT_SUM" and req_val == 31:
            earned = (
                type_credits.get("university_required", 0)
                + type_credits.get("general_education", 0)
            )
            buckets.append({
                "name":             "University Compulsory & General Education",
                "required_credits": 31,
                "earned_credits":   earned,
                "missing_courses":  [],
                "_blocking":        [],
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
    can_graduate = all(
        b["earned_credits"] >= b["required_credits"]
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
