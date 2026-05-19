from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, join
from app.core.db import get_db
from app.models.course import Course, CourseInstructor
from app.models.user import User  # 需要 User 模型以獲取教師姓名

router = APIRouter()


@router.get("/courses")
async def list_courses(db: AsyncSession = Depends(get_db)):
    """獲取所有課程列表（連接真實數據庫）"""
    try:
        # 查詢所有課程，按學年度和學期排序
        result = await db.execute(
            select(Course).order_by(Course.academic_year, Course.semester, Course.code)
        )
        courses = result.scalars().all()
        
        if not courses:
            return {"courses": []}
        
        # 為每個課程獲取主授課教師
        course_data = []
        for course in courses:
            # 查詢該課程的主授課教師姓名
            instructor_name = None
            try:
                instructor_result = await db.execute(
                    select(User.name).join(
                        CourseInstructor,
                        CourseInstructor.instructor_id == User.id
                    ).where(
                        (CourseInstructor.course_id == course.id) 
                        & (CourseInstructor.role == "primary")
                    )
                )
                instructor_name = instructor_result.scalar_one_or_none()
            except Exception as e:
                print(f"Error fetching instructor for course {course.id}: {e}")
            
            course_data.append({
                "id": str(course.id),
                "code": course.code,
                "name": course.name,
                "credits": course.credits,
                "instructor": instructor_name or "未指定",
                "semester": course.semester,
                "academic_year": course.academic_year,
                "type": course.type,
                "grade_level": course.grade_level,
                "capacity": course.capacity,
                "section": course.section,
                "department_id": str(course.department_id) if course.department_id else None,
            })
        
        return {"courses": course_data}
    except Exception as e:
        print(f"Error fetching courses: {e}")
        return {"courses": []}


@router.get("/students/{student_id}/schedule")
async def get_schedule(student_id: str, db: AsyncSession = Depends(get_db)):
    """獲取學生的課程時間表"""
    # TODO: 實作學生課程時間表邏輯
    return {
        "student_id": student_id,
        "schedule": []
    }



