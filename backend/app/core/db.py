from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy import MetaData, Table
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    return database_url


metadata = MetaData()
_reflected_tables: dict[str, Table] | None = None
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine, _session_factory

    if _engine is None:
        _engine = create_async_engine(
            normalize_database_url(settings.DATABASE_URL),
            future=True,
            pool_pre_ping=True,
        )
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False, class_=AsyncSession)

    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory

    if _session_factory is None:
        get_engine()

    return _session_factory


def _find_table_by_name(table_name: str) -> Table | None:
    for key, table in metadata.tables.items():
        if key.split(".")[-1] == table_name:
            return table
    return None


def _reflect_required_tables(sync_connection) -> dict[str, Table]:
    metadata.clear()
    metadata.reflect(
        bind=sync_connection,
        only=[
            "events",
            "event_registrations",
            "event_reflections",
            "departments",
            "users",
            "courses",
            "course_instructors",
            "enrollments",
        ],
    )

    return {
        "events": _find_table_by_name("events"),
        "event_registrations": _find_table_by_name("event_registrations"),
        "event_reflections": _find_table_by_name("event_reflections"),
        "departments": _find_table_by_name("departments"),
        "users": _find_table_by_name("users"),
        "courses": _find_table_by_name("courses"),
        "course_instructors": _find_table_by_name("course_instructors"),
        "enrollments": _find_table_by_name("enrollments"),
    }


async def get_reflected_tables() -> dict[str, Table]:
    global _reflected_tables

    if _reflected_tables is None:
        async with get_engine().begin() as connection:
            _reflected_tables = await connection.run_sync(_reflect_required_tables)

    return _reflected_tables


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with get_session_factory()() as session:
        yield session
