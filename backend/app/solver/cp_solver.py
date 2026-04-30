from __future__ import annotations

from ortools.sat.python import cp_model

from app.models.item import Item
from app.models.item_set import ItemSet
from app.schemas import FullBuild, OptimizationRequest
from app.solver.slots import SLOT_ORDER
from app.solver.stats import aggregate_totals, objective_score, stat_int


class SolverError(Exception):
    """Domain error (infeasible, empty slot, etc.)."""


def solve_optimization(
    request: OptimizationRequest,
    candidates: dict[str, list[Item]],
    sets_by_id: dict[int, ItemSet],
    *,
    character_base_pa: int,
    character_base_pm: int,
    time_limit_s: float = 45.0,
) -> FullBuild:
    elements = list(request.elements)
    focus = list(request.focus_stats)

    def score_item(it: Item) -> int:
        return objective_score(it.base_stats or {}, elements, focus)

    # --- Build variables: x[slot][j] = Bool
    model = cp_model.CpModel()
    x_vars: dict[tuple[str, int], cp_model.IntVar] = {}
    for slot in SLOT_ORDER:
        row = candidates.get(slot) or []
        if not row:
            raise SolverError(f"No eligible item for slot '{slot}' at level ≤ {request.level}.")
        for j, _it in enumerate(row):
            x_vars[(slot, j)] = model.NewBoolVar(f"x_{slot}_{j}")

    # Exactly one item per slot
    for slot in SLOT_ORDER:
        row = candidates[slot]
        model.Add(sum(x_vars[(slot, j)] for j in range(len(row))) == 1)

    # Each ankama_id at most once across all slots
    id_to_indices: dict[int, list[tuple[str, int]]] = {}
    for slot in SLOT_ORDER:
        for j, it in enumerate(candidates[slot]):
            id_to_indices.setdefault(it.ankama_id, []).append((slot, j))
    for _aid, idxs in id_to_indices.items():
        if len(idxs) <= 1:
            continue
        model.Add(
            sum(x_vars[(slot, j)] for slot, j in idxs) <= 1
        )

    # PA / PM (gear only in base_stats keys pa / pm)
    pa_terms = []
    pm_terms = []
    for slot in SLOT_ORDER:
        for j, it in enumerate(candidates[slot]):
            bs = it.base_stats or {}
            pa_terms.append(stat_int(bs, "pa") * x_vars[(slot, j)])
            pm_terms.append(stat_int(bs, "pm") * x_vars[(slot, j)])
    if pa_terms:
        model.Add(sum(pa_terms) + character_base_pa >= request.min_pa)
    else:
        model.Add(character_base_pa >= request.min_pa)
    if pm_terms:
        model.Add(sum(pm_terms) + character_base_pm >= request.min_pm)
    else:
        model.Add(character_base_pm >= request.min_pm)

    # Objective
    obj_terms = []
    for slot in SLOT_ORDER:
        for j, it in enumerate(candidates[slot]):
            sc = score_item(it)
            if sc:
                obj_terms.append(sc * x_vars[(slot, j)])
    if obj_terms:
        model.Maximize(sum(obj_terms))
    else:
        # Degenerate: still find a feasible assignment (maximize 0)
        model.Maximize(0)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_s
    solver.parameters.num_search_workers = 4
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise SolverError(
            "No assignment satisfies PA/PM and slot constraints (infeasible or timeout)."
        )

    chosen: list[Item] = []
    slots_out: dict[str, int | None] = {}
    for slot in SLOT_ORDER:
        row = candidates[slot]
        picked: Item | None = None
        for j, it in enumerate(row):
            if solver.Value(x_vars[(slot, j)]) == 1:
                picked = it
                break
        if picked is None:
            raise SolverError(f"Internal: no selection for slot {slot}")
        slots_out[slot] = picked.ankama_id
        chosen.append(picked)

    totals, active_sets = aggregate_totals(chosen, sets_by_id)
    return FullBuild(
        slots=slots_out,
        total_stats=totals,
        active_set_bonuses=active_sets,
    )
