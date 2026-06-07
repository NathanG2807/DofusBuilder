from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.item_set import ItemSet
from app.schemas import FullBuild, OptimizationRequest
from app.solver.candidates import build_slot_candidates, load_items_for_solver, load_locked_items
from app.solver.cp_solver import SolverError, solve_optimization
from app.solver.stats import objective_score


async def run_optimization_job(
    session: AsyncSession,
    request: OptimizationRequest,
    settings: Settings,
) -> FullBuild:
    items = await load_items_for_solver(session, request.level)

    rsets = await session.execute(select(ItemSet))
    sets_by_id = {s.ankama_id: s for s in rsets.scalars().all()}

    # Charge les items verrouillés (bypass du filtre conditions/niveau)
    locked_ankama_ids = list(request.locked_slots.values()) if request.locked_slots else []
    locked_items = await load_locked_items(session, locked_ankama_ids)
    locked_items_by_id = {it.ankama_id: it for it in locked_items}

    # Ajoute les items lockés à la liste générale s'ils n'y sont pas déjà
    # (ils pourraient avoir des conditions ou un niveau > max)
    existing_ids = {it.ankama_id for it in items}
    for it in locked_items:
        if it.ankama_id not in existing_ids:
            items.append(it)

    def score_fn(it) -> int:
        return objective_score(
            it.base_stats or {}, request.elements, request.focus_stats,
            request.stat_weights or None,
        )

    candidates = build_slot_candidates(
        items,
        score_fn,
        max_per_slot=settings.solver_max_candidates_per_slot,
        allow_dofus=request.allow_dofus,
        allow_prysmaradite=request.allow_prysmaradite,
        locked_slots=request.locked_slots or {},
        locked_items_by_id=locked_items_by_id,
    )

    def _sync_solve():
        return solve_optimization(
            request,
            candidates,
            sets_by_id,
            character_base_pa=settings.character_base_pa,
            character_base_pm=settings.character_base_pm,
            time_limit_s=settings.solver_time_limit_seconds,
        )

    return await asyncio.to_thread(_sync_solve)


__all__ = ("run_optimization_job",)
