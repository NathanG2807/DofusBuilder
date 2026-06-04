"""Load and filter item rows for the solver."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.item_name_filters import sql_exclude_gm_items
from app.models.item import Item
from app.solver.slots import SLOT_ORDER, item_fits_slot


async def load_items_for_solver(
    session: AsyncSession,
    max_level: int,
) -> list[Item]:
    """Items without conditions (MVP: skip condition trees)."""
    result = await session.execute(
        select(Item).where(
            Item.level <= max_level,
            Item.conditions.is_(None),
            sql_exclude_gm_items(),
        )
    )
    return list(result.scalars().all())


def build_slot_candidates(
    items: list[Item],
    score_fn,
    max_per_slot: int,
    *,
    allow_dofus: bool = False,
    allow_prysmaradite: bool = False,
) -> dict[str, list[Item]]:
    """Assign each item to eligible slots; keep top `max_per_slot` by score per slot."""
    by_slot: dict[str, list[Item]] = {s: [] for s in SLOT_ORDER}
    for it in items:
        for slot in SLOT_ORDER:
            if item_fits_slot(
                slot,
                it,
                allow_dofus=allow_dofus,
                allow_prysmaradite=allow_prysmaradite,
            ):
                by_slot[slot].append(it)
    for slot in SLOT_ORDER:
        row = by_slot[slot]
        row.sort(key=lambda x: score_fn(x), reverse=True)
        by_slot[slot] = row[:max_per_slot]
    return by_slot
