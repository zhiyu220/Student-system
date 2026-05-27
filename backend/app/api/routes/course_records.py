from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db

router = APIRouter()


def grade_to_gpa(grade) -> float:
    if grade is None:
        return 0.0
    g = float(grade)
    if g >= 90:   return 4.0
    elif g >= 85: return 3.7
    elif g >= 80: return 3.3
    elif g >= 75: return 3.0
    elif g >= 70: return 2.7
    elif g >= 65: return 2.3
    elif g >= 60: return 2.0
    return 0.0


@router.get("/{student_id}")
async def get_student_course_records(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT e.academic_year, e.semester,
                   c.code,
                   COALESCE(c.name_en, c.name) AS name_en,
                   c.type, c.credits,
                   e.grade::float AS grade,
                   e.pass_flag, e.status, e.is_counted,
                   COALESCE(u_i.name, '') AS instructor
            FROM enrollments e
            JOIN users stu ON stu.id = e.user_id AND stu.student_id = :sid
            JOIN courses c  ON c.id = e.course_id
            LEFT JOIN course_instructors ci
                   ON ci.course_id = c.id AND ci.role = 'primary'
            LEFT JOIN users u_i ON u_i.id = ci.instructor_id
            ORDER BY e.academic_year, e.semester, c.code
        """),
        {"sid": student_id},
    )
    rows = result.mappings().all()

    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or has no records")

    records = []
    counted_credits = 0
    weighted_gpa_sum = 0.0

    for r in rows:
        gpa_pts = grade_to_gpa(r["grade"])
        passed = bool(r["pass_flag"]) if r["pass_flag"] is not None else False
        counted = bool(r["is_counted"]) if r["is_counted"] is not None else False
        credits = r["credits"] or 0

        if passed and counted:
            counted_credits += credits
            weighted_gpa_sum += gpa_pts * credits

        records.append({
            "academic_year": r["academic_year"],
            "semester":      r["semester"],
            "code":          r["code"],
            "name_en":       r["name_en"],
            "type":          r["type"],
            "credits":       credits,
            "grade":         float(r["grade"]) if r["grade"] is not None else None,
            "gpa_points":    gpa_pts,
            "instructor":    r["instructor"],
            "status":        r["status"],
            "pass_flag":     passed,
        })

    total_credits = counted_credits

    cumulative_gpa = round(weighted_gpa_sum / total_credits, 2) if total_credits > 0 else 0.0

    degree_completion = round(total_credits / 128 * 100, 1)

    return {
        "summary": {
            "total_credits":    total_credits,
            "cumulative_gpa":   cumulative_gpa,
            "total_courses":    len(records),
            "degree_completion": degree_completion,
        },
        "records": records,
    }
