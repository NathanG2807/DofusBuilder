from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Build, Item, User
from app.schemas import BuildCreate, BuildOut, BuildUpdate, PublicBuildOut

router = APIRouter(prefix="/builds", tags=["builds"])


async def _slots_preview_from_slots(
    db: AsyncSession,
    slots: dict | None,
) -> dict[str, str | None]:
    """Rebuild slot → icon URL map from equipped item IDs."""
    if not slots:
        return {}

    item_ids: list[int] = []
    for raw in slots.values():
        if raw is None:
            continue
        try:
            item_ids.append(int(raw))
        except (TypeError, ValueError):
            continue

    icons_by_id: dict[int, str | None] = {}
    if item_ids:
        result = await db.execute(select(Item.ankama_id, Item.image_url_icon).where(Item.ankama_id.in_(item_ids)))
        icons_by_id = {row[0]: row[1] for row in result.all()}

    preview: dict[str, str | None] = {}
    for slot_key, raw in slots.items():
        if raw is None:
            preview[slot_key] = None
            continue
        try:
            preview[slot_key] = icons_by_id.get(int(raw))
        except (TypeError, ValueError):
            preview[slot_key] = None
    return preview


@router.get("/public", response_model=list[PublicBuildOut])
async def list_public_builds(
    q: Optional[str] = Query(default=None, description="Search by build name"),
    class_id: Optional[int] = Query(default=None, description="Filter by class ID"),
    tags: Optional[list[str]] = Query(default=None, description="Filter by tags (OR)"),
    level: Optional[int] = Query(default=None, description="Filter by level"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = (
        select(Build)
        .where(Build.is_public == True)  # noqa: E712
        .options(selectinload(Build.user))
    )
    if q:
        stmt = stmt.where(Build.name.ilike(f"%{q.strip()}%"))
    if class_id is not None:
        stmt = stmt.where(Build.class_id == class_id)
    if level is not None:
        stmt = stmt.where(Build.level == level)
    if tags:
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import JSONB
        for tag in tags:
            stmt = stmt.where(Build.tags.contains(cast([tag], JSONB)))
    stmt = stmt.order_by(Build.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    builds = list(result.scalars().all())
    return [
        {
            "id": b.id,
            "name": b.name,
            "class_id": b.class_id,
            "level": b.level,
            "sex": b.sex,
            "is_public": b.is_public,
            "tags": b.tags,
            "slots_preview": b.slots_preview,
            "slots": b.slots,
            "exo_fm": b.exo_fm,
            "username": b.user.username if b.user else None,
            "created_at": b.created_at,
            "updated_at": b.updated_at,
        }
        for b in builds
    ]


@router.get("", response_model=list[BuildOut])
async def list_my_builds(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Build]:
    result = await db.execute(
        select(Build)
        .where(Build.user_id == current.id)
        .order_by(Build.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=BuildOut, status_code=status.HTTP_201_CREATED)
async def create_build(
    body: BuildCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Build:
    slots = body.slots or {}
    b = Build(
        user_id=current.id,
        name=body.name.strip(),
        description=body.description,
        class_id=body.class_id,
        level=body.level,
        sex=body.sex,
        slots=slots,
        total_stats=body.total_stats,
        active_set_bonuses=body.active_set_bonuses,
        char_stats=body.char_stats,
        parcho_stats=body.parcho_stats,
        exo_fm=body.exo_fm,
        locked_slots=body.locked_slots,
        is_public=body.is_public,
        tags=body.tags or [],
        slots_preview=await _slots_preview_from_slots(db, slots),
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return b


def _can_edit(build: Build, user: User) -> bool:
    return build.user_id == user.id


@router.get("/{build_id}", response_model=BuildOut)
async def get_build(
    build_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: Optional[User] = Depends(get_optional_user),
) -> Build:
    b = await db.get(Build, build_id)
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Build not found")
    if b.is_public:
        return b
    if current is None or b.user_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Build is private")
    return b


@router.patch("/{build_id}", response_model=BuildOut)
async def update_build(
    build_id: uuid.UUID,
    body: BuildUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Build:
    b = await db.get(Build, build_id)
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Build not found")
    if not _can_edit(b, current):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed")
    data = body.model_dump(exclude_unset=True)
    if "slots" in data:
        data["slots_preview"] = await _slots_preview_from_slots(db, data.get("slots"))
    for k, v in data.items():
        setattr(b, k, v)
    if data:
        b.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(b)
    return b


@router.delete("/{build_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_build(
    build_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    b = await db.get(Build, build_id)
    if b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Build not found")
    if not _can_edit(b, current):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not allowed")
    await db.delete(b)
    await db.commit()
