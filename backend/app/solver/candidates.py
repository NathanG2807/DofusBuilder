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


async def load_locked_items(
    session: AsyncSession,
    ankama_ids: list[int],
) -> list[Item]:
    """Charge les items verrouillés par ankama_id, sans filtre de conditions ni de niveau.
    Ces items sont injectés tels quels dans le solver quel que soit leur état."""
    if not ankama_ids:
        return []
    result = await session.execute(
        select(Item).where(Item.ankama_id.in_(ankama_ids))
    )
    return list(result.scalars().all())


def build_slot_candidates(
    items: list[Item],
    score_fn,
    max_per_slot: int,
    *,
    allow_dofus: bool = False,
    allow_prysmaradite: bool = False,
    locked_slots: dict[str, int] | None = None,
    locked_items_by_id: dict[int, Item] | None = None,
) -> dict[str, list[Item]]:
    """Assign each item to eligible slots; keep top `max_per_slot` by score per slot.

    Pour les slots verrouillés, l'item locké est le seul candidat — le solver
    est ainsi contraint de le conserver.
    """
    locked_slots = locked_slots or {}
    locked_items_by_id = locked_items_by_id or {}

    by_slot: dict[str, list[Item]] = {s: [] for s in SLOT_ORDER}

    # Slots libres : distribution normale
    free_slots = [s for s in SLOT_ORDER if s not in locked_slots]
    for it in items:
        for slot in free_slots:
            if item_fits_slot(
                slot,
                it,
                allow_dofus=allow_dofus,
                allow_prysmaradite=allow_prysmaradite,
            ):
                by_slot[slot].append(it)

    for slot in free_slots:
        row = by_slot[slot]
        row.sort(key=lambda x: score_fn(x), reverse=True)
        by_slot[slot] = row[:max_per_slot]

    # Slots verrouillés : un seul candidat — l'item locké
    for slot, ankama_id in locked_slots.items():
        if slot not in by_slot:
            continue
        locked_item = locked_items_by_id.get(ankama_id)
        if locked_item is not None:
            by_slot[slot] = [locked_item]
        else:
            # Item introuvable en base : slot laissé vide (ne bloque pas le solver)
            by_slot[slot] = []

    return by_slot
