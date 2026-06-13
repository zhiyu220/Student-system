from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.db import get_db

router = APIRouter()


@router.get("/courses")
async def list_courses(db: AsyncSession = Depends(get_db)):
    """獲取所有課程列表（連接真實數據庫）。

    以單一 LEFT JOIN 取得每門課的主授課教師，避免逐課查詢 (1+N) 造成的延遲。
    """
    try:
        result = await db.execute(
            text("""
                SELECT c.id::text AS id,
                       c.code, c.name, c.credits, c.type,
                       c.semester, c.academic_year, c.grade_level,
                       c.capacity, c.section,
                       c.department_id::text AS department_id,
                       u_i.name AS instructor
                FROM courses c
                LEFT JOIN course_instructors ci
                       ON ci.course_id = c.id AND ci.role = 'primary'
                LEFT JOIN users u_i ON u_i.id = ci.instructor_id
                ORDER BY c.academic_year, c.semester, c.code
            """)
        )
        rows = result.mappings().all()

        if not rows:
            return {"courses": []}

        course_data = [
            {
                "id": r["id"],
                "code": r["code"],
                "name": r["name"],
                "credits": r["credits"],
                "instructor": r["instructor"] or "未指定",
                "semester": r["semester"],
                "academic_year": r["academic_year"],
                "type": r["type"],
                "grade_level": r["grade_level"],
                "capacity": r["capacity"],
                "section": r["section"],
                "department_id": r["department_id"],
            }
            for r in rows
        ]

        return {"courses": course_data}
    except Exception as e:
        print(f"Error fetching courses: {e}")
        return {"courses": []}


@router.get("/students/{student_id}/schedule")
async def get_schedule(student_id: str, db: AsyncSession = Depends(get_db)):
    return {"student_id": student_id, "schedule": []}


DIGITAL_APP_CODES = {"IM120", "IM226", "IM303", "IM240", "IM345"}


def _grade_to_gpa(grade) -> float:
    if grade is None: return 0.0
    g = float(grade)
    if g >= 90:   return 4.0
    elif g >= 85: return 3.7
    elif g >= 80: return 3.3
    elif g >= 75: return 3.0
    elif g >= 70: return 2.7
    elif g >= 65: return 2.3
    elif g >= 60: return 2.0
    return 0.0


@router.get("/students/{student_id}/performance")
async def get_student_performance(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT e.academic_year, e.semester,
                   c.code,
                   COALESCE(c.name_en, c.name) AS name_en,
                   c.type, c.credits,
                   e.grade::float AS grade,
                   e.pass_flag, e.status,
                   COALESCE(u_i.name, '') AS instructor
            FROM enrollments e
            JOIN users stu ON stu.id = e.user_id AND stu.student_id = :sid
            JOIN courses c  ON c.id = e.course_id
            LEFT JOIN course_instructors ci
                   ON ci.course_id = c.id AND ci.role = 'primary'
            LEFT JOIN users u_i ON u_i.id = ci.instructor_id
            WHERE e.status IN ('completed', 'enrolled')
            ORDER BY e.academic_year, e.semester, c.code
        """),
        {"sid": student_id},
    )
    rows = result.mappings().all()

    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or no records")

    # Group rows into semesters
    sem_map: dict = {}
    for r in rows:
        key = (r["academic_year"], r["semester"])
        if key not in sem_map:
            sem_map[key] = []
        sem_map[key].append(r)

    semesters = []
    for (yr, sem), sem_rows in sorted(sem_map.items()):
        courses_out = []
        gpa_sum = 0.0
        gpa_credits = 0
        sem_credits = 0

        for r in sem_rows:
            gpa_pts = _grade_to_gpa(r["grade"])
            credits = r["credits"] or 0
            passed  = bool(r["pass_flag"]) if r["pass_flag"] is not None else False
            if passed and r["status"] == "completed":
                gpa_sum     += gpa_pts * credits
                gpa_credits += credits
            sem_credits += credits
            courses_out.append({
                "code":       r["code"],
                "name_en":    r["name_en"],
                "type":       r["type"],
                "credits":    credits,
                "grade":      float(r["grade"]) if r["grade"] is not None else None,
                "gpa_points": gpa_pts,
                "instructor": r["instructor"],
            })

        sem_gpa = round(gpa_sum / gpa_credits, 2) if gpa_credits > 0 else 0.0
        semesters.append({
            "academic_year": yr,
            "semester":      sem,
            "label":         f"{yr}-{sem}",
            "gpa":           sem_gpa,
            "credits":       sem_credits,
            "courses":       courses_out,
        })

    # Overall summary
    all_completed = [s for s in semesters if s["gpa"] > 0]
    avg_gpa = round(sum(s["gpa"] for s in all_completed) / len(all_completed), 2) if all_completed else 0.0

    best_sem  = max(semesters, key=lambda s: s["gpa"], default=None)
    worst_sem = min([s for s in semesters if s["gpa"] > 0], key=lambda s: s["gpa"], default=None)

    total_credits = sum(
        (r["credits"] or 0)
        for r in rows
        if bool(r["pass_flag"]) and r["status"] == "completed"
    )
    total_courses   = len(rows)
    completion_rate = round(total_credits / 128 * 100, 1)

    # Insights
    decline_note = None
    if len(all_completed) >= 2:
        last_two = sorted(all_completed, key=lambda s: (s["academic_year"], s["semester"]))[-2:]
        if last_two[1]["gpa"] < last_two[0]["gpa"]:
            decline_note = f"GPA declined from {last_two[0]['label']} ({last_two[0]['gpa']}) to {last_two[1]['label']} ({last_two[1]['gpa']})"

    digital_count = sum(
        1 for r in rows
        if r["code"] in DIGITAL_APP_CODES and r["status"] == "completed" and r["pass_flag"]
    )

    return {
        "summary": {
            "avg_gpa":               avg_gpa,
            "highest_gpa":           best_sem["gpa"] if best_sem else 0.0,
            "lowest_gpa":            worst_sem["gpa"] if worst_sem else 0.0,
            "highest_gpa_semester":  best_sem["label"] if best_sem else None,
            "lowest_gpa_semester":   worst_sem["label"] if worst_sem else None,
            "total_courses":         total_courses,
            "total_credits":         total_credits,
            "completion_rate":       completion_rate,
        },
        "semesters": semesters,
        "insights": {
            "strength_semester":             best_sem["label"] if best_sem else None,
            "decline_note":                  decline_note,
            "digital_app_courses_completed": digital_count,
        },
    }

