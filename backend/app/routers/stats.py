"""Recalcul des totaux (équipement + panoplies) pour un inventaire."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.item_name_filters import is_excluded_item_id
from app.models import Build, CraftList, Item, ItemSet, User
from app.schemas import (
    ActiveSetDetail,
    AggregateStatsRequest,
    AggregateStatsResponse,
    CommunityStatsResponse,
    DofusduGameMeta,
)
from app.services.dofusdu_meta import fetch_dofusdu_game_meta
from app.solver.slots import LEGACY_SLOT_ALIASES, SLOT_ORDER
from app.solver.stats import aggregate_totals, merge_stats, set_tier_bonus_stats

router = APIRouter(prefix="/stats", tags=["stats"])

# Bonus de base du personnage (indépendants du niveau).
CHARACTER_BASE_PA            = 6
CHARACTER_BASE_PM            = 3
# Vitalité de base : 50 HP fixes + 5 HP par niveau.
CHARACTER_BASE_VITALITY_FIXED = 50
CHARACTER_VITALITY_PER_LEVEL  = 5
# Prospection de base.
CHARACTER_BASE_PROSPECTING    = 100
# Pods de base : 1000 fixes + 5 pods par niveau.
CHARACTER_BASE_PODS_FIXED     = 1000
CHARACTER_PODS_PER_LEVEL      = 5
# Niveau à partir duquel un PA supplémentaire est accordé (mécanique Dofus 3).
LEVEL_PA_BONUS_THRESHOLD = 100


def _formatted_effects_at_tier(bonus_effects: dict[str, Any] | None, piece_count: int) -> list[str]:
    """Retourne les effets formatés du palier le plus haut atteint (non cumulatif)."""
    if not bonus_effects:
        return []
    # Cherche le palier exact ou le plus proche en dessous.
    for tier in range(piece_count, 1, -1):
        raw = bonus_effects.get(str(tier))
        if raw and isinstance(raw, list):
            return [
                eff["formatted"]
                for eff in raw
                if isinstance(eff, dict) and eff.get("formatted")
            ]
    return []


_ONLINE_WINDOW = timedelta(minutes=2)


@router.get("/community", response_model=CommunityStatsResponse)
async def community_stats(db: AsyncSession = Depends(get_db)) -> CommunityStatsResponse:
    """Compteurs live pour la page d'accueil (communauté + meta dofusdu)."""
    members = await db.scalar(select(func.count()).select_from(User)) or 0
    cutoff = datetime.utcnow() - _ONLINE_WINDOW
    online_users = (
        await db.scalar(
            select(func.count()).select_from(User).where(User.last_seen_at >= cutoff)
        )
        or 0
    )
    builds_total = await db.scalar(select(func.count()).select_from(Build)) or 0
    builds_public = (
        await db.scalar(
            select(func.count()).select_from(Build).where(Build.is_public.is_(True))
        )
        or 0
    )
    craft_lists = await db.scalar(select(func.count()).select_from(CraftList)) or 0
    items = await db.scalar(select(func.count()).select_from(Item)) or 0
    item_sets = await db.scalar(select(func.count()).select_from(ItemSet)) or 0

    game_meta_raw = await fetch_dofusdu_game_meta()
    game_data = DofusduGameMeta(**game_meta_raw) if game_meta_raw else None

    return CommunityStatsResponse(
        members=members,
        online_users=online_users,
        builds_total=builds_total,
        builds_public=builds_public,
        craft_lists=craft_lists,
        items=items,
        item_sets=item_sets,
        game_data=game_data,
    )


@router.post("/aggregate", response_model=AggregateStatsResponse)
async def aggregate_equipment_stats(
    body: AggregateStatsRequest,
    db: AsyncSession = Depends(get_db),
) -> AggregateStatsResponse:
    """Somme base_stats + bonus de panoplie + base PA/PM personnage + bonus de niveau."""
    # Normalise les anciens noms de slots (trophy1/2 → dofus5/6).
    normalized_slots: dict[str, int | None] = {}
    for k, v in body.slots.items():
        canonical = LEGACY_SLOT_ALIASES.get(k, k)
        normalized_slots[canonical] = v

    chosen: list[Item] = []
    ids_needed: list[int] = []
    for slot in SLOT_ORDER:
        aid = normalized_slots.get(slot)
        if aid is None or is_excluded_item_id(aid):
            continue
        ids_needed.append(aid)

    if not ids_needed:
        base_stats: dict[str, int] = {}
        base_stats["pa"] = CHARACTER_BASE_PA + (1 if body.level >= LEVEL_PA_BONUS_THRESHOLD else 0)
        base_stats["pm"] = CHARACTER_BASE_PM
        base_stats["vitality"] = (
            CHARACTER_BASE_VITALITY_FIXED + CHARACTER_VITALITY_PER_LEVEL * body.level
        )
        base_stats["prospecting"] = CHARACTER_BASE_PROSPECTING
        base_stats["pods"] = CHARACTER_BASE_PODS_FIXED + CHARACTER_PODS_PER_LEVEL * body.level
        return AggregateStatsResponse(
            total_stats=base_stats,
            active_set_bonuses=[],
            active_set_details=[],
        )

    result = await db.execute(select(Item).where(Item.ankama_id.in_(ids_needed)))
    rows = list(result.scalars().all())
    by_id = {it.ankama_id: it for it in rows}
    missing = [i for i in ids_needed if i not in by_id]
    if missing:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Objet(s) introuvable(s): {missing}",
        )

    for slot in SLOT_ORDER:
        aid = normalized_slots.get(slot)
        if aid is None:
            continue
        chosen.append(by_id[aid])

    set_ids = {it.parent_set_id for it in chosen if it.parent_set_id is not None}
    sets_by_id: dict[int, ItemSet] = {}
    if set_ids:
        r2 = await db.execute(select(ItemSet).where(ItemSet.ankama_id.in_(set_ids)))
        sets_by_id = {s.ankama_id: s for s in r2.scalars().all()}

    totals, active_names = aggregate_totals(chosen, sets_by_id)

    # ── Bases personnage ──
    totals["pa"] = totals.get("pa", 0) + CHARACTER_BASE_PA
    totals["pm"] = totals.get("pm", 0) + CHARACTER_BASE_PM
    totals["vitality"] = (
        totals.get("vitality", 0)
        + CHARACTER_BASE_VITALITY_FIXED
        + CHARACTER_VITALITY_PER_LEVEL * body.level
    )
    totals["prospecting"] = totals.get("prospecting", 0) + CHARACTER_BASE_PROSPECTING
    totals["pods"] = (
        totals.get("pods", 0)
        + CHARACTER_BASE_PODS_FIXED
        + CHARACTER_PODS_PER_LEVEL * body.level
    )
    if body.level >= LEVEL_PA_BONUS_THRESHOLD:
        totals["pa"] += 1

    # ── Détails des panoplies actives ──
    per_set: dict[int, list[int]] = {}
    for it in chosen:
        if it.parent_set_id is not None:
            per_set.setdefault(it.parent_set_id, []).append(it.ankama_id)

    active_details: list[ActiveSetDetail] = []
    for sid, piece_ids in per_set.items():
        st = sets_by_id.get(sid)
        if not st or not st.name:
            continue
        n = len(piece_ids)
        if n < 2:
            continue
        total_pieces = len(st.equipment_ids) if st.equipment_ids else 0
        effects = _formatted_effects_at_tier(st.bonus_effects, n)
        active_details.append(
            ActiveSetDetail(
                name=st.name,
                set_id=sid,
                piece_count=n,
                total_pieces=total_pieces,
                effects=effects,
            )
        )

    return AggregateStatsResponse(
        total_stats=totals,
        active_set_bonuses=active_names,
        active_set_details=active_details,
    )
