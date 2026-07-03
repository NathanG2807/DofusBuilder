from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models import CraftList, User
from app.schemas import CraftListCreate, CraftListOut, CraftListUpdate

router = APIRouter(prefix="/craft-lists", tags=["craft-lists"])


def _serialize_progress(progress: dict | None) -> dict:
    if not progress:
        return {}
    out: dict = {}
    for k, v in progress.items():
        if isinstance(v, dict):
            out[str(k)] = {
                "owned": int(v.get("owned") or 0),
                "validated": int(v.get("validated") or 0),
            }
    return out


def _serialize_entries(entries: list | None) -> list:
    if not entries:
        return []
    return [e if isinstance(e, dict) else e for e in entries]


@router.get("", response_model=list[CraftListOut])
async def list_my_craft_lists(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[CraftList]:
    result = await db.execute(
        select(CraftList)
        .where(CraftList.user_id == current.id)
        .order_by(CraftList.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=CraftListOut, status_code=status.HTTP_201_CREATED)
async def create_craft_list(
    body: CraftListCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> CraftList:
    cl = CraftList(
        user_id=current.id,
        name=body.name.strip(),
        entries=[e.model_dump() for e in body.entries],
        progress=_serialize_progress(body.progress),
    )
    db.add(cl)
    await db.commit()
    await db.refresh(cl)
    return cl


@router.get("/{craft_list_id}", response_model=CraftListOut)
async def get_craft_list(
    craft_list_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> CraftList:
    cl = await db.get(CraftList, craft_list_id)
    if cl is None or cl.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Craft list not found")
    return cl


@router.patch("/{craft_list_id}", response_model=CraftListOut)
async def update_craft_list(
    craft_list_id: uuid.UUID,
    body: CraftListUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> CraftList:
    cl = await db.get(CraftList, craft_list_id)
    if cl is None or cl.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Craft list not found")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        cl.name = data["name"].strip()
    if "entries" in data and data["entries"] is not None:
        cl.entries = [e.model_dump() if hasattr(e, "model_dump") else e for e in data["entries"]]
    if "progress" in data and data["progress"] is not None:
        cl.progress = _serialize_progress(data["progress"])
    if data:
        cl.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(cl)
    return cl


@router.delete("/{craft_list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_craft_list(
    craft_list_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    cl = await db.get(CraftList, craft_list_id)
    if cl is None or cl.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Craft list not found")
    await db.delete(cl)
    await db.commit()
