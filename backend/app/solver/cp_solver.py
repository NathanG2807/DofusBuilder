from __future__ import annotations

from collections import defaultdict

from ortools.sat.python import cp_model

from app.models.item import Item
from app.models.item_set import ItemSet
from app.schemas import FullBuild, OptimizationRequest
from app.solver.slots import SLOT_ORDER
from app.solver.stats import (
    STAT_BUILD_CAPS,
    aggregate_totals,
    objective_score,
    set_tier_bonus_stats,
    stat_int,
    stat_mult,
)


class SolverError(Exception):
    """Domain error (infeasible, empty slot, etc.)."""


def _incremental_set_scores(
    bonus_effects: dict,
    max_pieces: int,
    elements: list[str],
    focus: list[str],
) -> dict[int, int]:
    """
    Pour chaque palier t (2..max_pieces), retourne le score INCRÉMENTAL
    apporté par le palier t par rapport au palier t-1.
    Seuls les paliers dont le delta est non-nul sont inclus.
    """
    scores: dict[int, int] = {}
    prev_stats: dict[str, int] = {}
    for tier in range(2, max_pieces + 1):
        cur_stats = set_tier_bonus_stats(bonus_effects, tier)
        if not cur_stats:
            continue
        delta = {k: cur_stats.get(k, 0) - prev_stats.get(k, 0) for k in cur_stats}
        # Ajoute aussi les stats qui disparaissent (delta négatif)
        for k in prev_stats:
            if k not in cur_stats:
                delta[k] = -prev_stats[k]
        sc = objective_score(delta, elements, focus)
        if sc != 0:
            scores[tier] = sc
        prev_stats = cur_stats
    return scores


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

    # Exo FM variables (0 or 1, at most one PA exo and one PM exo)
    use_exo_pa = model.NewBoolVar("use_exo_pa") if request.allow_exo_pa else None
    use_exo_pm = model.NewBoolVar("use_exo_pm") if request.allow_exo_pm else None

    # PA / PM (gear only in base_stats keys pa / pm)
    pa_terms = []
    pm_terms = []
    for slot in SLOT_ORDER:
        for j, it in enumerate(candidates[slot]):
            bs = it.base_stats or {}
            pa_terms.append(stat_int(bs, "pa") * x_vars[(slot, j)])
            pm_terms.append(stat_int(bs, "pm") * x_vars[(slot, j)])

    pa_base = sum(pa_terms) + character_base_pa if pa_terms else character_base_pa
    pm_base = sum(pm_terms) + character_base_pm if pm_terms else character_base_pm

    if use_exo_pa is not None:
        model.Add(pa_base + use_exo_pa >= request.min_pa)
        model.Add(pa_base + use_exo_pa <= STAT_BUILD_CAPS["pa"])
    else:
        model.Add(pa_base >= request.min_pa)
        model.Add(pa_base <= STAT_BUILD_CAPS["pa"])

    if use_exo_pm is not None:
        model.Add(pm_base + use_exo_pm >= request.min_pm)
        model.Add(pm_base + use_exo_pm <= STAT_BUILD_CAPS["pm"])
    else:
        model.Add(pm_base >= request.min_pm)
        model.Add(pm_base <= STAT_BUILD_CAPS["pm"])

    # ── Bonus de panoplie dans l'objectif ─────────────────────────────────────
    set_indices: dict[int, list[tuple[str, int]]] = defaultdict(list)
    for slot in SLOT_ORDER:
        for j, it in enumerate(candidates[slot]):
            if it.parent_set_id is not None:
                set_indices[it.parent_set_id].append((slot, j))

    # Stats dont le scoring est plafonné au niveau build (ex: PA ≤ 12, PM ≤ 6)
    capped_focus = {f: STAT_BUILD_CAPS[f] for f in focus if f in STAT_BUILD_CAPS}
    uncapped_focus = [f for f in focus if f not in capped_focus]

    def score_item_uncapped(it: Item) -> int:
        return objective_score(it.base_stats or {}, elements, uncapped_focus)

    # Objective : items individuels (stats non-capées uniquement)
    obj_terms = []
    for slot in SLOT_ORDER:
        for j, it in enumerate(candidates[slot]):
            sc = score_item_uncapped(it)
            if sc:
                obj_terms.append(sc * x_vars[(slot, j)])

    # Objective : stats capées au niveau build (PA/PM)
    # L'exo n'est PAS inclus dans le scoring — il n'intervient que dans la
    # contrainte min_pa/min_pm (relâchement optionnel). Cela garantit que
    # l'exo est autorisé mais jamais forcé par l'objectif.
    for stat_key, cap_val in capped_focus.items():
        item_terms = []
        for slot in SLOT_ORDER:
            for j, it in enumerate(candidates[slot]):
                v = stat_int(it.base_stats or {}, stat_key)
                if v:
                    item_terms.append(v * x_vars[(slot, j)])
        base = character_base_pa if stat_key == "pa" else character_base_pm

        raw_sum = (sum(item_terms) if item_terms else 0) + base
        total_var = model.NewIntVar(0, cap_val + 20, f"total_{stat_key}")
        model.Add(total_var == raw_sum)
        capped_var = model.NewIntVar(0, cap_val, f"capped_{stat_key}")
        model.AddMinEquality(capped_var, [total_var, cap_val])
        obj_terms.append(stat_mult(stat_key) * capped_var)

    # Objective : bonus incrémentaux de panoplies
    for set_id, idx_list in set_indices.items():
        st = sets_by_id.get(set_id)
        if not st or not st.bonus_effects:
            continue
        # Nombre max de pièces de la panoplie présentes dans les candidats
        # (plafonné par le nombre de slots uniques représentés)
        unique_slots = {slot for slot, _ in idx_list}
        max_achievable = len(unique_slots)
        if max_achievable < 2:
            continue

        incremental = _incremental_set_scores(
            st.bonus_effects, max_achievable, elements, focus
        )
        if not incremental:
            continue

        # pieces_S = nombre d'items de cette panoplie sélectionnés
        pieces_S = sum(x_vars[(slot, j)] for slot, j in idx_list if (slot, j) in x_vars)

        for tier, delta_score in incremental.items():
            if tier > max_achievable:
                continue
            at_least = model.NewBoolVar(f"set_{set_id}_ge_{tier}")
            model.Add(pieces_S >= tier).OnlyEnforceIf(at_least)
            model.Add(pieces_S < tier).OnlyEnforceIf(at_least.Not())
            if delta_score != 0:
                obj_terms.append(delta_score * at_least)

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

    exo_pa_used = use_exo_pa is not None and solver.Value(use_exo_pa) == 1
    exo_pm_used = use_exo_pm is not None and solver.Value(use_exo_pm) == 1

    totals, active_sets = aggregate_totals(chosen, sets_by_id)
    return FullBuild(
        slots=slots_out,
        total_stats=totals,
        active_set_bonuses=active_sets,
        exo_pa=exo_pa_used,
        exo_pm=exo_pm_used,
    )
