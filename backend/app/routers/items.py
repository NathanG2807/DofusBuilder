from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.item_name_filters import sql_exclude_gm_items
from app.models import Item
from app.schemas import ItemListResponse, ItemOut

router = APIRouter(prefix="/items", tags=["items"])

_STAT_KEY_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


@router.get("", response_model=ItemListResponse)
async def list_items(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    q: Optional[str] = Query(None, description="Recherche insensible à la casse sur le nom"),
    min_level: Optional[int] = Query(None, ge=0, le=200),
    max_level: Optional[int] = Query(None, ge=0, le=200),
    type_name_id: Optional[str] = Query(
        None,
        description="Slug de type d'équipement (ex: hat, ring, boots)",
        max_length=100,
    ),
    is_weapon: Optional[bool] = Query(None, description="Filtrer armes / non-armes"),
    parent_set_id: Optional[int] = Query(None, description="Filtrer par panoplie (ankama_id)"),
    stat_key: Optional[str] = Query(
        None,
        description="Clé dans base_stats (ex: pa, vitality, damage_earth)",
        max_length=64,
    ),
    min_stat_value: Optional[int] = Query(
        None,
        ge=0,
        description="Valeur minimale pour stat_key (inclus)",
    ),
) -> ItemListResponse:
    filters = [sql_exclude_gm_items()]
    if q:
        filters.append(Item.name.ilike(f"%{q}%"))
    if min_level is not None:
        filters.append(Item.level >= min_level)
    if max_level is not None:
        filters.append(Item.level <= max_level)
    if type_name_id:
        filters.append(Item.type_name_id == type_name_id)
    if is_weapon is not None:
        filters.append(Item.is_weapon == is_weapon)
    if parent_set_id is not None:
        filters.append(Item.parent_set_id == parent_set_id)
    if stat_key is not None or min_stat_value is not None:
        if not stat_key or min_stat_value is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="Fournir stat_key et min_stat_value ensemble.",
            )
        if not _STAT_KEY_RE.match(stat_key):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="stat_key invalide.",
            )
        jtext = Item.base_stats[stat_key].astext
        filters.append(cast(jtext, Integer) >= min_stat_value)

    count_stmt = select(func.count()).select_from(Item)
    stmt = select(Item)
    for f in filters:
        count_stmt = count_stmt.where(f)
        stmt = stmt.where(f)

    total = (await db.execute(count_stmt)).scalar_one()
    offset = (page - 1) * page_size
    stmt = stmt.order_by(Item.level.desc(), Item.name).offset(offset).limit(page_size)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return ItemListResponse(
        items=[ItemOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{ankama_id}", response_model=ItemOut)
async def get_item(ankama_id: int, db: AsyncSession = Depends(get_db)) -> Item:
    result = await db.execute(select(Item).where(Item.ankama_id == ankama_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item
