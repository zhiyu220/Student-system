from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db
from app.core.auth import get_current_user, hash_password

router = APIRouter()


# ── GET endpoints ────────────────────────────────────────────────────────────

@router.get("/enrollments")
async def admin_enrollments(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(text("""
        SELECT
            e.id::text                          AS id,
            stu.student_id,
            stu.name                            AS student_name,
            c.code                              AS course_code,
            COALESCE(c.name_en, c.name)         AS course_name,
            c.type                              AS course_type,
            c.credits,
            e.academic_year,
            e.semester,
            e.grade::float                      AS grade,
            e.status,
            e.pass_flag,
            e.is_counted,
            COALESCE(inst.name, '')              AS instructor_name
        FROM enrollments e
        JOIN users stu  ON stu.id  = e.user_id
        JOIN courses c  ON c.id    = e.course_id
        LEFT JOIN course_instructors ci ON ci.course_id = c.id AND ci.role = 'primary'
        LEFT JOIN users inst ON inst.id = ci.instructor_id
        ORDER BY stu.student_id, e.academic_year, e.semester, c.code
    """))
    return [dict(r) for r in result.mappings().all()]


@router.get("/courses")
async def admin_courses(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(text("""
        SELECT
            c.id::text                              AS id,
            c.code,
            COALESCE(c.name_en, c.name)             AS name_en,
            c.name                                  AS name_zh,
            c.type,
            c.credits,
            c.academic_year,
            c.semester,
            c.grade_level,
            c.capacity,
            c.section,
            c.sub_category,
            d.code                                  AS dept_code,
            d.name                                  AS dept_name,
            c.department_id::text                   AS department_id,
            COALESCE(inst.name, '')                 AS instructor_name,
            ci.instructor_id::text                  AS instructor_id
        FROM courses c
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN course_instructors ci ON ci.course_id = c.id AND ci.role = 'primary'
        LEFT JOIN users inst ON inst.id = ci.instructor_id
        ORDER BY c.academic_year, c.semester, c.code
    """))
    return [dict(r) for r in result.mappings().all()]


@router.get("/users")
async def admin_users(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(text("""
        SELECT
            u.id::text           AS id,
            u.student_id,
            u.name,
            u.role,
            u.email,
            u.status,
            d.code               AS dept_code,
            COALESCE(d.name, '') AS dept_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        ORDER BY u.role, u.student_id
    """))
    return [dict(r) for r in result.mappings().all()]


@router.get("/departments")
async def admin_departments(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(text("""
        SELECT
            d.id::text  AS id,
            d.code,
            d.name,
            d.faculty,
            d.status,
            COUNT(u.id) AS user_count
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id
        GROUP BY d.id, d.code, d.name, d.faculty, d.status
        ORDER BY d.faculty, d.code
    """))
    return [dict(r) for r in result.mappings().all()]


# ── Pydantic models for PUT ──────────────────────────────────────────────────

class EnrollmentPatch(BaseModel):
    grade: Optional[float] = None
    status: str
    pass_flag: Optional[bool] = None
    is_counted: Optional[bool] = None
    academic_year: int
    semester: int


class CoursePatch(BaseModel):
    name_en: Optional[str] = None
    type: str
    credits: Optional[int] = None
    academic_year: Optional[int] = None
    semester: Optional[int] = None
    grade_level: Optional[int] = None
    section: Optional[str] = None
    capacity: Optional[int] = None
    sub_category: Optional[str] = None
    department_id: Optional[str] = None
    instructor_id: Optional[str] = None  # "" = remove, UUID = set, None = no-op


class UserPatch(BaseModel):
    name: str
    email: Optional[str] = None
    role: str
    status: Optional[str] = None


class DepartmentPatch(BaseModel):
    name: str
    faculty: Optional[str] = None
    status: Optional[str] = None


# ── PUT endpoints ────────────────────────────────────────────────────────────

@router.put("/enrollments/{eid}")
async def update_enrollment(
    eid: str,
    data: EnrollmentPatch,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT id FROM enrollments WHERE id = :id"),
        {"id": eid},
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    await db.execute(
        text("""
            UPDATE enrollments
            SET grade        = :grade,
                status       = :status,
                pass_flag    = :pass_flag,
                is_counted   = :is_counted,
                academic_year = :academic_year,
                semester     = :semester,
                updated_at   = NOW()
            WHERE id = :id
        """),
        {**data.model_dump(), "id": eid},
    )
    await db.commit()
    return {"ok": True}


@router.delete("/enrollments/{eid}")
async def delete_enrollment(
    eid: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM enrollments WHERE id = :id"), {"id": eid})
    await db.commit()
    return {"ok": True}


@router.put("/courses/{cid}")
async def update_course(
    cid: str,
    data: CoursePatch,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT id FROM courses WHERE id = :id"),
        {"id": cid},
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    course_fields = data.model_dump(exclude={"instructor_id"})
    await db.execute(
        text("""
            UPDATE courses
            SET name_en       = :name_en,
                type          = :type,
                credits       = :credits,
                academic_year = :academic_year,
                semester      = :semester,
                grade_level   = :grade_level,
                section       = :section,
                capacity      = :capacity,
                sub_category  = :sub_category,
                department_id = :department_id,
                updated_at    = NOW()
            WHERE id = :id
        """),
        {**course_fields, "id": cid},
    )

    # Always sync instructor when field is provided
    if data.instructor_id is not None:
        await db.execute(
            text("DELETE FROM course_instructors WHERE course_id = :cid AND role = 'primary'"),
            {"cid": cid},
        )
        if data.instructor_id:  # non-empty string = valid UUID
            await db.execute(
                text("""
                    INSERT INTO course_instructors (id, course_id, instructor_id, role, created_at)
                    VALUES (gen_random_uuid(), :cid, :iid, 'primary', NOW())
                """),
                {"cid": cid, "iid": data.instructor_id},
            )

    await db.commit()
    return {"ok": True}


@router.delete("/courses/{cid}")
async def delete_course(
    cid: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM course_instructors WHERE course_id = :id"), {"id": cid})
    await db.execute(text("DELETE FROM courses WHERE id = :id"), {"id": cid})
    await db.commit()
    return {"ok": True}


@router.put("/users/{uid}")
async def update_user(
    uid: str,
    data: UserPatch,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT id FROM users WHERE id = :id"),
        {"id": uid},
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.execute(
        text("""
            UPDATE users
            SET name   = :name,
                email  = :email,
                role   = :role,
                status = :status
            WHERE id = :id
        """),
        {**data.model_dump(), "id": uid},
    )
    await db.commit()
    return {"ok": True}


@router.delete("/users/{uid}")
async def delete_user(
    uid: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM enrollments WHERE user_id = :id"), {"id": uid})
    await db.execute(text("DELETE FROM users WHERE id = :id"), {"id": uid})
    await db.commit()
    return {"ok": True}


@router.put("/departments/{did}")
async def update_department(
    did: str,
    data: DepartmentPatch,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT id FROM departments WHERE id = :id"),
        {"id": did},
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    await db.execute(
        text("""
            UPDATE departments
            SET name    = :name,
                faculty = :faculty,
                status  = :status
            WHERE id = :id
        """),
        {**data.model_dump(), "id": did},
    )
    await db.commit()
    return {"ok": True}


@router.delete("/departments/{did}")
async def delete_department(
    did: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM departments WHERE id = :id"), {"id": did})
    await db.commit()
    return {"ok": True}


# ── POST (Create) endpoints ──────────────────────────────────────────────────

class EnrollmentCreate(BaseModel):
    user_id: str
    course_id: str
    academic_year: int
    semester: int
    status: str = "enrolled"
    grade: Optional[float] = None
    pass_flag: Optional[bool] = None
    is_counted: Optional[bool] = None


class CourseCreate(BaseModel):
    code: str
    name: str
    name_en: Optional[str] = None
    type: str
    credits: Optional[int] = None
    academic_year: int
    semester: int
    grade_level: Optional[int] = None
    section: Optional[str] = None
    capacity: Optional[int] = None
    sub_category: Optional[str] = None
    department_id: str
    instructor_id: Optional[str] = None


class UserCreate(BaseModel):
    name: str
    student_id: Optional[str] = None
    email: str
    password: str
    role: str = "student"
    department_id: Optional[str] = None


class DepartmentCreate(BaseModel):
    code: str
    name: str
    faculty: Optional[str] = None
    status: str = "active"


@router.post("/enrollments")
async def create_enrollment(
    data: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("""
            INSERT INTO enrollments
                (id, user_id, course_id, academic_year, semester,
                 status, grade, pass_flag, is_counted, created_at, updated_at)
            VALUES
                (gen_random_uuid(), :user_id, :course_id, :academic_year, :semester,
                 :status, :grade, :pass_flag, :is_counted, NOW(), NOW())
            RETURNING id::text
        """),
        data.model_dump(),
    )
    new_id = result.fetchone()[0]
    await db.commit()
    return {"ok": True, "id": new_id}


@router.post("/courses")
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    payload = data.model_dump(exclude={"instructor_id"})
    result = await db.execute(
        text("""
            INSERT INTO courses
                (id, code, name, name_en, type, credits, academic_year, semester,
                 grade_level, section, capacity, sub_category, department_id,
                 created_at, updated_at)
            VALUES
                (gen_random_uuid(), :code, :name, :name_en, :type, :credits,
                 :academic_year, :semester, :grade_level, :section, :capacity,
                 :sub_category, :department_id, NOW(), NOW())
            RETURNING id::text
        """),
        payload,
    )
    new_id = result.fetchone()[0]
    if data.instructor_id:
        await db.execute(
            text("""
                INSERT INTO course_instructors (id, course_id, instructor_id, role, created_at)
                VALUES (gen_random_uuid(), :cid, :iid, 'primary', NOW())
            """),
            {"cid": new_id, "iid": data.instructor_id},
        )
    await db.commit()
    return {"ok": True, "id": new_id}


@router.post("/users")
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    hashed = hash_password(data.password)
    result = await db.execute(
        text("""
            INSERT INTO users
                (id, name, student_id, email, password_hash, role,
                 department_id, status, must_change_password, created_at, updated_at)
            VALUES
                (gen_random_uuid(), :name, :student_id, :email, :password_hash, :role,
                 :department_id, 'active', false, NOW(), NOW())
            RETURNING id::text
        """),
        {
            "name":          data.name,
            "student_id":    data.student_id,
            "email":         data.email,
            "password_hash": hashed,
            "role":          data.role,
            "department_id": data.department_id,
        },
    )
    new_id = result.fetchone()[0]
    await db.commit()
    return {"ok": True, "id": new_id}


@router.post("/departments")
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("""
            INSERT INTO departments (id, code, name, faculty, status, created_at, updated_at)
            VALUES (gen_random_uuid(), :code, :name, :faculty, :status, NOW(), NOW())
            RETURNING id::text
        """),
        data.model_dump(),
    )
    new_id = result.fetchone()[0]
    await db.commit()
    return {"ok": True, "id": new_id}


# ── Requirements CRUD ────────────────────────────────────────────────────────

@router.get("/requirements")
async def admin_requirements(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(text("""
        SELECT
            gr.id::text,
            gr.rule_name,
            COALESCE(gr.description, '')        AS description,
            gr.rule_type,
            gr.required_value,
            gr.department_id::text,
            gr.parent_req_id::text              AS parent_req_id,
            d.code                              AS dept_code,
            COALESCE(d.name, '')                AS dept_name,
            COALESCE(pr.rule_name, '')          AS parent_req_name,
            COUNT(rc.id)::int                   AS course_count
        FROM graduation_requirements gr
        LEFT JOIN departments d              ON d.id  = gr.department_id
        LEFT JOIN graduation_requirements pr ON pr.id = gr.parent_req_id
        LEFT JOIN requirement_courses rc     ON rc.requirement_id = gr.id
        GROUP BY gr.id, gr.rule_name, gr.description, gr.rule_type,
                 gr.required_value, gr.department_id, gr.parent_req_id,
                 d.code, d.name, pr.rule_name
        ORDER BY d.code, gr.rule_type, gr.rule_name
    """))
    return [dict(r) for r in result.mappings().all()]


class RequirementPatch(BaseModel):
    rule_name: str
    description: Optional[str] = None
    rule_type: str
    required_value: Optional[int] = None
    department_id: Optional[str] = None
    parent_req_id: Optional[str] = None


@router.put("/requirements/{rid}")
async def update_requirement(
    rid: str,
    data: RequirementPatch,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    r = await db.execute(text("SELECT id FROM graduation_requirements WHERE id = :id"), {"id": rid})
    if not r.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
    await db.execute(
        text("""
            UPDATE graduation_requirements
            SET rule_name      = :rule_name,
                description    = :description,
                rule_type      = :rule_type,
                required_value = :required_value,
                department_id  = :department_id,
                parent_req_id  = :parent_req_id
            WHERE id = :id
        """),
        {**data.model_dump(), "id": rid},
    )
    await db.commit()
    return {"ok": True}


class RequirementCreate(BaseModel):
    rule_name: str
    description: Optional[str] = None
    rule_type: str
    required_value: Optional[int] = None
    department_id: Optional[str] = None
    parent_req_id: Optional[str] = None


@router.post("/requirements")
async def create_requirement(
    data: RequirementCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        text("""
            INSERT INTO graduation_requirements
                (id, rule_name, description, rule_type, required_value,
                 department_id, parent_req_id, created_at)
            VALUES
                (gen_random_uuid(), :rule_name, :description, :rule_type,
                 :required_value, :department_id, :parent_req_id, NOW())
            RETURNING id::text
        """),
        data.model_dump(),
    )
    new_id = result.fetchone()[0]
    await db.commit()
    return {"ok": True, "id": new_id}


@router.delete("/requirements/{rid}")
async def delete_requirement(
    rid: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM requirement_courses WHERE requirement_id = :id"), {"id": rid})
    await db.execute(text("DELETE FROM graduation_requirements WHERE id = :id"), {"id": rid})
    await db.commit()
    return {"ok": True}
