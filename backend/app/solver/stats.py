"""Aggregate stats from chosen items + set bonuses."""

from __future__ import annotations

from typing import Any

from etl.effect_mapping import flatten_effects_to_base_stats
from app.models.item import Item
from app.models.item_set import ItemSet


def stat_int(stats: dict[str, Any] | None, key: str) -> int:
    if not stats:
        return 0
    v = stats.get(key)
    if v is None:
        return 0
    return int(v)


def objective_score(
    stats: dict[str, Any] | None,
    elements: list[str],
    focus_stats: list[str],
) -> int:
    """Higher is better (integer, for CP-SAT linear objective)."""
    if not stats:
        stats = {}
    total = 0
    for e in elements:
        total += 1000 * stat_int(stats, e)
    for f in focus_stats:
        total += stat_int(stats, f)
    return total


def merge_stats(a: dict[str, int], b: dict[str, int]) -> dict[str, int]:
    out = dict(a)
    for k, v in b.items():
        out[k] = out.get(k, 0) + v
    return out


def set_tier_bonus_stats(
    bonus_effects: dict[str, Any] | None, piece_count: int
) -> dict[str, int]:
    """Retourne les stats du palier le plus haut atteint (non cumulatif).
    Chaque clé de bonus_effects représente le bonus TOTAL pour ce nombre de pièces.
    On prend uniquement le palier == piece_count (en redescendant si la clé est absente)."""
    if not bonus_effects:
        return {}
    # Cherche le palier exact ou le plus proche en dessous.
    for tier in range(piece_count, 1, -1):
        raw = bonus_effects.get(str(tier))
        if raw and isinstance(raw, list):
            return flatten_effects_to_base_stats(raw)
    return {}


def aggregate_totals(
    chosen: list[Item],
    sets_by_id: dict[int, ItemSet],
) -> tuple[dict[str, int], list[str]]:
    """Sum item base_stats + set bonuses; return (totals, active set names)."""
    totals: dict[str, int] = {}
    for it in chosen:
        bs = it.base_stats or {}
        for k, v in bs.items():
            totals[k] = totals.get(k, 0) + int(v)

    # Count pieces per set (parent_set_id on items)
    per_set: dict[int, list[int]] = {}
    for it in chosen:
        if it.parent_set_id is None:
            continue
        per_set.setdefault(it.parent_set_id, []).append(it.ankama_id)

    active_names: list[str] = []
    for sid, piece_ids in per_set.items():
        st = sets_by_id.get(sid)
        if not st or not st.name:
            continue
        n = len(piece_ids)
        if n < 2:
            continue
        active_names.append(st.name)
        bonus = set_tier_bonus_stats(st.bonus_effects, n)
        totals = merge_stats(totals, bonus)

    return totals, active_names
