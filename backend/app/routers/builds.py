from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Build, User
from app.schemas import BuildCreate, BuildOut, BuildUpdate

router = APIRouter(prefix="/builds", tags=["builds"])


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
    b = Build(
        user_id=current.id,
        name=body.name.strip(),
        description=body.description,
        class_id=body.class_id,
        level=body.level,
        slots=body.slots or {},
        total_stats=body.total_stats,
        active_set_bonuses=body.active_set_bonuses,
        is_public=body.is_public,
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
    for k, v in data.items():
        setattr(b, k, v)
    if data:
        b.updated_at = datetime.now(timezone.utc)
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
    db.delete(b)
    await db.commit()
