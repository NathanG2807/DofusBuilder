"""Aggregate stats from chosen items + set bonuses."""

from __future__ import annotations

from typing import Any

from etl.effect_mapping import flatten_effects_to_base_stats
from app.models.item import Item
from app.models.item_set import ItemSet


def stat_mult(key: str) -> int:
    """Multiplicateur objectif pour une stat donnée."""
    return _STAT_MULT.get(key, _DEFAULT_MULT)


# PA/PM ne servent à rien au-delà de ces seuils
STAT_BUILD_CAPS: dict[str, int] = {"pa": 12, "pm": 6}


def stat_int(stats: dict[str, Any] | None, key: str) -> int:
    if not stats:
        return 0
    v = stats.get(key)
    if v is None:
        return 0
    return int(v)


# ── Multiplicateurs par stat ──────────────────────────────────────────────────
# Normalisés pour que la "meilleure pièce slot 200" contribue ~10 000 pts.
# Plages typiques niveau 200 : force/intel/chance/agi ~80, cc% ~7,
# dmg élément ~15, vitalité ~150, pa/pm ~1, prosp ~25.
_STAT_MULT: dict[str, int] = {
    # Caractéristiques élémentaires
    "strength":           125,
    "intelligence":       125,
    "chance":             125,
    "agility":            125,
    # Coups critiques — valeur très faible (1-7/slot), multiplicateur élevé
    "critical_percent":  1500,
    "critical_damage":    800,
    # Dommages élémentaires passifs
    "damage_earth":       650,
    "damage_fire":        650,
    "damage_water":       650,
    "damage_air":         650,
    "damage_neutral":     650,
    "damage":             650,
    "power":             1200,
    # Vitalité (valeurs grandes, mult faible)
    "vitality":            65,
    # PA / PM — extrêmement précieux
    "pa":               10000,
    "pm":                8000,
    # Divers
    "prospecting":        400,
    "wisdom":             200,
    "heals":              250,
    "initiative":           5,
    "range":             1500,
    "summons":           2000,
    "dodge":              100,
    "lock":               100,
    "dodge_pa":           300,
    "dodge_pm":           300,
    "trap_pa":            300,
    "trap_pm":            300,
    "pods":                 1,
    # Résistances passives
    "resistance_fire":    200,
    "resistance_earth":   200,
    "resistance_water":   200,
    "resistance_air":     200,
    "resistance_neutral": 200,
    "resistance_critical":150,
    "resistance_push":    100,
}
_DEFAULT_MULT = 50

# Valeurs typiques « max par slot » au niveau 200 — sert uniquement au mode poids custom
# pour mettre les stats sélectionnées sur un pied d'égalité (voir objective_score).
_STAT_REF: dict[str, int] = {
    "strength": 80,
    "intelligence": 80,
    "chance": 80,
    "agility": 80,
    "critical_percent": 7,
    "critical_damage": 40,
    "damage_earth": 15,
    "damage_fire": 15,
    "damage_water": 15,
    "damage_air": 15,
    "damage_neutral": 15,
    "damage": 15,
    "damage_push": 15,
    "damage_spell_percent": 10,
    "damage_weapon_percent": 10,
    "power": 80,
    "vitality": 150,
    "pa": 1,
    "pm": 1,
    "prospecting": 25,
    "wisdom": 30,
    "heals": 20,
    "initiative": 400,
    "range": 1,
    "summons": 1,
    "dodge": 50,
    "lock": 50,
    "dodge_pa": 10,
    "dodge_pm": 10,
    "trap_pa": 10,
    "trap_pm": 10,
    "pods": 100,
    "resistance_fire": 15,
    "resistance_earth": 15,
    "resistance_water": 15,
    "resistance_air": 15,
    "resistance_neutral": 15,
    "resistance_critical": 15,
    "resistance_push": 15,
}
_STAT_REF_DEFAULT = 80
# Échelle entière pour le score custom (compatible CP-SAT).
_CUSTOM_SCORE_SCALE = 1000

# Les stats élément principaux ont un bonus de priorité (×3) pour rester primaires.
_ELEMENT_PRIORITY = 3
# Les stats focus sélectionnées ont un bonus ×2 pour avoir un impact réel sur le build.
_FOCUS_PRIORITY = 2


def _custom_stat_contribution(key: str, value: int, weight: int) -> int:
    """Score normalisé : à valeur typique max, seul ``weight`` (1-10) discrimine."""
    if value == 0:
        return 0
    ref = _STAT_REF.get(key, _STAT_REF_DEFAULT)
    return weight * (_CUSTOM_SCORE_SCALE * value // ref)


def capped_stat_objective_coeff(
    key: str, stat_weights: dict[str, int] | None
) -> int:
    """Coefficient objectif pour PA/PM plafonnés (cp_solver)."""
    if stat_weights and key in stat_weights:
        ref = _STAT_REF.get(key, _STAT_REF_DEFAULT)
        return stat_weights[key] * (_CUSTOM_SCORE_SCALE // max(ref, 1))
    return stat_mult(key)


def objective_score(
    stats: dict[str, Any] | None,
    elements: list[str],
    focus_stats: list[str],
    stat_weights: dict[str, int] | None = None,
) -> int:
    """Higher is better (integer, for CP-SAT linear objective).

    Mode par défaut (``stat_weights`` absent) : multiplicateurs calibrés niveau 200,
    éléments ×3, focus ×2.

    Mode poids custom (``stat_weights`` fourni pour une stat) : les stats listées
    sont normalisées sur leur valeur typique max ; seul le slider (1-10) fixe
    la priorité relative entre elles. ``_STAT_MULT`` et les bonus ×3/×2 ne
    s'appliquent pas à ces stats.
    """
    if not stats:
        stats = {}
    total = 0
    for e in elements:
        v = stat_int(stats, e)
        if stat_weights and e in stat_weights:
            total += _custom_stat_contribution(e, v, stat_weights[e])
        else:
            mult = _STAT_MULT.get(e, _DEFAULT_MULT) * _ELEMENT_PRIORITY
            total += mult * v
    for f in focus_stats:
        v = stat_int(stats, f)
        if stat_weights and f in stat_weights:
            total += _custom_stat_contribution(f, v, stat_weights[f])
        else:
            mult = _STAT_MULT.get(f, _DEFAULT_MULT) * _FOCUS_PRIORITY
            total += mult * v
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
