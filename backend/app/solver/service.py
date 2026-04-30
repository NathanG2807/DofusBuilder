from __future__ import annotations

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.item_set import ItemSet
from app.schemas import FullBuild, OptimizationRequest
from app.solver.candidates import build_slot_candidates, load_items_for_solver
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

    def score_fn(it) -> int:
        return objective_score(
            it.base_stats or {}, request.elements, request.focus_stats
        )

    candidates = build_slot_candidates(
        items,
        score_fn,
        max_per_slot=settings.solver_max_candidates_per_slot,
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
