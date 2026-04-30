from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import ItemSet
from app.schemas import ItemSetListResponse, ItemSetOut

router = APIRouter(prefix="/sets", tags=["sets"])


@router.get("", response_model=ItemSetListResponse)
async def list_sets(
    db: AsyncSession = Depends(get_db),
    q: Optional[str] = Query(None, description="Recherche insensible à la casse sur le nom"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> ItemSetListResponse:
    """Liste / recherche de panoplies par nom."""
    filters = []
    if q:
        filters.append(ItemSet.name.ilike(f"%{q}%"))

    count_stmt = select(func.count()).select_from(ItemSet)
    stmt = select(ItemSet)
    for f in filters:
        count_stmt = count_stmt.where(f)
        stmt = stmt.where(f)

    total = (await db.execute(count_stmt)).scalar_one()
    offset = (page - 1) * page_size
    stmt = stmt.order_by(ItemSet.name).offset(offset).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()
    return ItemSetListResponse(
        sets=[ItemSetOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{ankama_id}", response_model=ItemSetOut)
async def get_set(ankama_id: int, db: AsyncSession = Depends(get_db)) -> ItemSet:
    result = await db.execute(select(ItemSet).where(ItemSet.ankama_id == ankama_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Set not found")
    return row
