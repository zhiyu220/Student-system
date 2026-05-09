from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, insert, literal, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db, get_reflected_tables

router = APIRouter()


def _serialize_value(value: Any) -> Any:
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _serialize_mapping(data: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize_value(value) for key, value in data.items()}


def _normalize_status(value: Any) -> str:
    if value is None:
        return "open"

    normalized = str(value).strip().lower()
    mapping = {
        "published": "open",
        "open": "open",
        "active": "open",
        "full": "full",
        "closed": "closed",
        "waitlist": "waitlist",
        "draft": "draft",
        "cancelled": "cancelled",
    }
    return mapping.get(normalized, str(value))


def _registration_label(registration_status: Any, is_waitlist: Any) -> str:
    if is_waitlist:
        return "waitlist"

    normalized = str(registration_status or "").strip().lower()
    if normalized in {"waitlist", "waiting"}:
        return "waitlist"
    if normalized in {"cancelled", "canceled"}:
        return "cancelled"
    return "registered"


async def _load_context() -> dict[str, Any]:
    try:
        tables = await get_reflected_tables()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc

    required = ["events", "event_registrations", "event_reflections", "users", "departments"]
    missing = [name for name in required if tables.get(name) is None]
    if missing:
        raise HTTPException(status_code=500, detail=f"Missing tables: {', '.join(missing)}")

    return tables


async def _get_current_user(
    session: AsyncSession,
    users_table,
    student_id: str | None = None,
):
    stmt = select(users_table)
    if student_id:
        stmt = stmt.where(users_table.c.student_id == student_id)
    else:
        stmt = stmt.where(users_table.c.role == "student").order_by(users_table.c.student_id.asc()).limit(1)

    result = await session.execute(stmt)
    user = result.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="Student user not found")
    return user


def _build_class_info(user: Any) -> str:
    enrollment_year = user.get("enrollment_year")
    class_name = user.get("class_name")
    if enrollment_year and class_name:
        return f"{enrollment_year}-{class_name}"
    return class_name or ""


async def _registration_counts_by_event(session: AsyncSession, registrations_table) -> dict[UUID, int]:
    stmt = (
        select(
            registrations_table.c.event_id,
            func.count().label("registered_count"),
        )
        .where(
            or_(
                registrations_table.c.registration_status.is_(None),
                registrations_table.c.registration_status.not_in(["cancelled", "canceled"]),
            )
        )
        .group_by(registrations_table.c.event_id)
    )
    result = await session.execute(stmt)
    return {row.event_id: int(row.registered_count or 0) for row in result}


async def _registered_event_ids(session: AsyncSession, registrations_table, user_id: UUID) -> set[UUID]:
    stmt = select(registrations_table.c.event_id).where(
        and_(
            registrations_table.c.user_id == user_id,
            or_(
                registrations_table.c.registration_status.is_(None),
                registrations_table.c.registration_status.not_in(["cancelled", "canceled"]),
            ),
        )
    )
    result = await session.execute(stmt)
    return {row.event_id for row in result}


def _event_slots_info(event: dict[str, Any], registered_count: int) -> str:
    max_participants = event.get("max_participants")
    if not max_participants:
        return "unlimited"

    if registered_count >= max_participants and event.get("allow_waitlist"):
        return f"{registered_count}/{max_participants} (waitlist)"

    return f"{registered_count}/{max_participants}"


def _event_response(
    event: dict[str, Any],
    organizer: str,
    registered_count: int,
    is_registered: bool,
) -> dict[str, Any]:
    status = _normalize_status(event.get("status"))
    max_participants = event.get("max_participants")

    if max_participants and registered_count >= max_participants:
        status = "waitlist" if event.get("allow_waitlist") else "full"

    description = event.get("description") or ""
    return {
        "id": str(event["id"]),
        "title": event.get("title") or "",
        "organizer": organizer,
        "category": event.get("category") or "",
        "location": event.get("location") or "",
        "start_at": _serialize_value(event.get("start_at")),
        "end_at": _serialize_value(event.get("end_at")),
        "max_participants": event.get("max_participants"),
        "registered": registered_count,
        "is_waitlist_allowed": bool(event.get("allow_waitlist")),
        "max_waitlist": None,
        "summary": description,
        "description": description,
        "service_hours": _serialize_value(event.get("service_hours")) or 0,
        "service_hours_type": event.get("service_hours_type") or "",
        "status": status,
        "tags": [],
        "created_at": _serialize_value(event.get("created_at")),
        "is_registered": is_registered,
        "slots_info": _event_slots_info(event, registered_count),
        "cover_image_url": event.get("cover_image_url"),
        "color": event.get("color"),
    }


@router.get("/events/registrations", tags=["events"])
async def get_user_registrations(
    student_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tables = await _load_context()
    events_table = tables["events"]
    registrations_table = tables["event_registrations"]
    users_table = tables["users"]
    departments_table = tables["departments"]

    user = await _get_current_user(db, users_table, student_id=student_id)
    counts = await _registration_counts_by_event(db, registrations_table)

    stmt = (
        select(
            registrations_table,
            events_table,
            departments_table.c.name.label("organizer_name"),
            users_table.c.student_id.label("student_number"),
            users_table.c.class_name.label("student_class_name"),
            users_table.c.enrollment_year.label("student_enrollment_year"),
        )
        .join(events_table, registrations_table.c.event_id == events_table.c.id)
        .join(users_table, registrations_table.c.user_id == users_table.c.id)
        .outerjoin(departments_table, events_table.c.department_id == departments_table.c.id)
        .where(registrations_table.c.user_id == user["id"])
        .order_by(registrations_table.c.registered_at.desc())
    )
    result = await db.execute(stmt)

    data = []
    for row in result.mappings():
        event_data = _serialize_mapping(dict(row[events_table]))
        event_item = _event_response(
            event=event_data,
            organizer=row.organizer_name or "Unknown organizer",
            registered_count=counts.get(row[events_table]["id"], 0),
            is_registered=True,
        )

        data.append(
            {
                "id": str(row[registrations_table]["id"]),
                "event_id": str(row[registrations_table]["event_id"]),
                "student_id": row.student_number,
                "class_info": (
                    f"{row.student_enrollment_year}-{row.student_class_name}"
                    if row.student_enrollment_year and row.student_class_name
                    else row.student_class_name
                ),
                "registered_at": _serialize_value(row[registrations_table]["registered_at"]),
                "status": _registration_label(
                    row[registrations_table]["registration_status"],
                    row[registrations_table]["is_waitlist"],
                ),
                "register_notes": row[registrations_table]["register_notes"],
                "custom_fields": [],
                "is_waitlist": bool(row[registrations_table]["is_waitlist"]),
                "event": event_item,
            }
        )

    return {"code": 0, "data": data, "total": len(data)}


@router.get("/events", tags=["events"])
async def get_events(
    q: str | None = Query(None),
    organizer: str | None = Query(None),
    service_type: str | None = Query(None),
    status: str | None = Query(None),
    sort_by: str = Query("start_at"),
    sort_order: str = Query("asc"),
    student_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tables = await _load_context()
    events_table = tables["events"]
    registrations_table = tables["event_registrations"]
    users_table = tables["users"]
    departments_table = tables["departments"]

    user = await _get_current_user(db, users_table, student_id=student_id)
    counts = await _registration_counts_by_event(db, registrations_table)
    registered_ids = await _registered_event_ids(db, registrations_table, user["id"])

    stmt = (
        select(events_table, departments_table.c.name.label("organizer_name"))
        .outerjoin(departments_table, events_table.c.department_id == departments_table.c.id)
    )

    filters = []
    if q:
        keyword = f"%{q.strip()}%"
        filters.append(
            or_(
                events_table.c.title.ilike(keyword),
                events_table.c.description.ilike(keyword),
                events_table.c.location.ilike(keyword),
            )
        )
    if organizer:
        filters.append(departments_table.c.name == organizer)
    if service_type:
        filters.append(events_table.c.service_hours_type == service_type)
    if status:
        filters.append(events_table.c.status == status)

    if filters:
        stmt = stmt.where(and_(*filters))

    sort_map = {
        "start_at": events_table.c.start_at,
        "created_at": events_table.c.created_at,
        "registered": literal(0),
    }
    if sort_by == "registered":
        stmt = stmt.order_by(events_table.c.created_at.desc())
    else:
        sort_column = sort_map.get(sort_by, events_table.c.start_at)
        stmt = stmt.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())

    result = await db.execute(stmt)
    rows = result.mappings().all()

    items = []
    for row in rows:
        event = _serialize_mapping(dict(row[events_table]))
        event_id = row[events_table]["id"]
        items.append(
            _event_response(
                event=event,
                organizer=row.organizer_name or "Unknown organizer",
                registered_count=counts.get(event_id, 0),
                is_registered=event_id in registered_ids,
            )
        )

    if sort_by == "registered":
        items.sort(key=lambda item: item["registered"], reverse=sort_order == "desc")

    organizer_values = sorted({item["organizer"] for item in items if item["organizer"]})
    service_types = sorted({item["service_hours_type"] for item in items if item["service_hours_type"]})
    statuses = sorted({item["status"] for item in items if item["status"]})

    return {
        "code": 0,
        "data": items,
        "filters": {
            "organizers": organizer_values,
            "service_types": service_types,
            "statuses": statuses,
        },
        "total": len(items),
    }


@router.get("/events/{event_id}", tags=["events"])
async def get_event_detail(
    event_id: UUID,
    student_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tables = await _load_context()
    events_table = tables["events"]
    registrations_table = tables["event_registrations"]
    users_table = tables["users"]
    departments_table = tables["departments"]

    user = await _get_current_user(db, users_table, student_id=student_id)
    counts = await _registration_counts_by_event(db, registrations_table)
    registered_ids = await _registered_event_ids(db, registrations_table, user["id"])

    stmt = (
        select(events_table, departments_table.c.name.label("organizer_name"))
        .outerjoin(departments_table, events_table.c.department_id == departments_table.c.id)
        .where(events_table.c.id == event_id)
    )
    result = await db.execute(stmt)
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")

    event = _serialize_mapping(dict(row[events_table]))
    data = _event_response(
        event=event,
        organizer=row.organizer_name or "Unknown organizer",
        registered_count=counts.get(event_id, 0),
        is_registered=event_id in registered_ids,
    )
    data["current_user"] = {
        "student_id": user.get("student_id"),
        "name": user.get("name"),
        "phone": user.get("phone"),
        "class_info": _build_class_info(user),
    }
    data["registration_form_config"] = []

    return {"code": 0, "data": data}


@router.post("/events/{event_id}/register", tags=["events"])
async def register_event(
    event_id: UUID,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    tables = await _load_context()
    events_table = tables["events"]
    registrations_table = tables["event_registrations"]
    users_table = tables["users"]

    student_id = body.get("student_id")
    user = await _get_current_user(db, users_table, student_id=student_id)

    event_result = await db.execute(select(events_table).where(events_table.c.id == event_id))
    event = event_result.mappings().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing_stmt = select(registrations_table).where(
        and_(
            registrations_table.c.event_id == event_id,
            registrations_table.c.user_id == user["id"],
            or_(
                registrations_table.c.registration_status.is_(None),
                registrations_table.c.registration_status.not_in(["cancelled", "canceled"]),
            ),
        )
    )
    existing = (await db.execute(existing_stmt)).mappings().first()
    if existing:
        raise HTTPException(status_code=409, detail="Already registered for this event")

    current_count = (
        await db.execute(
            select(func.count()).select_from(registrations_table).where(
                and_(
                    registrations_table.c.event_id == event_id,
                    or_(
                        registrations_table.c.registration_status.is_(None),
                        registrations_table.c.registration_status.not_in(["cancelled", "canceled"]),
                    ),
                )
            )
        )
    ).scalar_one()

    max_participants = event["max_participants"]
    allow_waitlist = bool(event["allow_waitlist"])
    is_waitlist = bool(max_participants and current_count >= max_participants and allow_waitlist)
    if max_participants and current_count >= max_participants and not allow_waitlist:
        raise HTTPException(status_code=409, detail="Event is full")

    now = datetime.utcnow()
    registration_id = uuid4()
    registration_status = "waitlist" if is_waitlist else "registered"

    await db.execute(
        insert(registrations_table).values(
            id=registration_id,
            event_id=event_id,
            user_id=user["id"],
            attendee_name=body.get("attendee_name") or user.get("name"),
            attendee_phone=body.get("attendee_phone") or user.get("phone"),
            register_notes=body.get("register_notes"),
            registration_status=registration_status,
            is_waitlist=is_waitlist,
            registered_at=now,
        )
    )
    await db.commit()

    return {
        "code": 0,
        "message": "Registration created",
        "data": {
            "id": str(registration_id),
            "event_id": str(event_id),
            "student_id": user.get("student_id"),
            "attendee_name": body.get("attendee_name") or user.get("name"),
            "attendee_phone": body.get("attendee_phone") or user.get("phone"),
            "register_notes": body.get("register_notes"),
            "class_info": body.get("class_info") or _build_class_info(user),
            "custom_fields": body.get("custom_fields") or [],
            "is_waitlist": is_waitlist,
            "status": registration_status,
            "registered_at": now.isoformat(),
        },
    }


@router.post("/events/{event_id}/logs", tags=["events"])
async def submit_event_log(
    event_id: UUID,
    body: dict[str, Any],
    student_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tables = await _load_context()
    registrations_table = tables["event_registrations"]
    reflections_table = tables["event_reflections"]
    users_table = tables["users"]

    if not body.get("content"):
        raise HTTPException(status_code=400, detail="Reflection content is required")

    user = await _get_current_user(db, users_table, student_id=student_id)
    registration_stmt = select(registrations_table).where(
        and_(
            registrations_table.c.event_id == event_id,
            registrations_table.c.user_id == user["id"],
        )
    )
    registration = (await db.execute(registration_stmt)).mappings().first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found for this user")

    log_id = uuid4()
    submitted_at = datetime.utcnow()
    rating = int(body.get("rating") or 0)
    service_hours = float(body.get("service_hours") or 0)

    await db.execute(
        insert(reflections_table).values(
            id=log_id,
            event_id=event_id,
            registration_id=registration["id"],
            user_id=user["id"],
            content=body["content"],
            earned_service_hours=service_hours,
            rating=rating,
            submitted_at=submitted_at,
            updated_at=submitted_at,
        )
    )
    await db.commit()

    return {
        "code": 0,
        "message": "Reflection submitted",
        "data": {
            "id": str(log_id),
            "student_id": user.get("student_id"),
            "event_id": str(event_id),
            "content": body["content"],
            "service_hours": service_hours,
            "submitted_at": submitted_at.isoformat(),
            "rating": rating,
        },
    }


@router.get("/events/{event_id}/logs", tags=["events"])
async def get_event_logs(
    event_id: UUID,
    student_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    tables = await _load_context()
    reflections_table = tables["event_reflections"]
    users_table = tables["users"]

    user = await _get_current_user(db, users_table, student_id=student_id)
    stmt = (
        select(reflections_table)
        .where(
            and_(
                reflections_table.c.event_id == event_id,
                reflections_table.c.user_id == user["id"],
            )
        )
        .order_by(reflections_table.c.submitted_at.desc())
    )
    result = await db.execute(stmt)
    logs = []
    for row in result.mappings():
        record = _serialize_mapping(dict(row[reflections_table]))
        record["service_hours"] = record.pop("earned_service_hours", 0)
        logs.append(record)

    return {"code": 0, "data": logs, "total": len(logs)}
