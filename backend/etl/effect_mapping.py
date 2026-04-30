from __future__ import annotations

import re
from typing import Any, Optional

from etl.equipment_type_ids import EQUIPMENT_TYPE_ID_TO_SLUG

# Canonical keys align with DIA_SPEC OptimizationRequest (elements, focus_stats) and solver needs.
_DIRECT_NAME_TO_KEY: dict[str, str] = {
    "vitality": "vitality",
    "strength": "strength",
    "intelligence": "intelligence",
    "chance": "chance",
    "agility": "agility",
    "wisdom": "wisdom",
    "ap": "pa",
    "mp": "pm",  # movement points (API English label)
    "power": "power",
    "initiative": "initiative",
    "prospecting": "prospecting",
    "dodge": "dodge",
    "lock": "lock",
    "summons": "summons",
    "range": "range",
    "pods": "pods",
    "heals": "heals",
}

# Prefer stable Ankama effect type ids when names vary (case, wording).
# IDs verified from live DB (French locale).
_EFFECT_ID_TO_KEY: dict[int, str] = {
    # Caractéristiques primaires
    8:   "pm",
    9:   "vitality",
    10:  "wisdom",
    12:  "pa",
    13:  "intelligence",
    22:  "chance",
    24:  "initiative",
    25:  "prospecting",
    26:  "lock",
    28:  "summons",
    29:  "critical_percent",
    30:  "damage",
    31:  "range",
    32:  "power",
    36:  "agility",
    45:  "strength",
    59:  "dodge",
    75:  "dodge_pa",
    39:  "dodge_pm",
    64:  "trap_pa",
    50:  "trap_pm",
    121: "heals",
    220: "pods",
    179: "pa",   # PA alternatif
    238: "pm",   # PM alternatif
    # Dommages
    27:  "damage_water",
    47:  "damage_air",
    48:  "damage_earth",
    49:  "damage_neutral",
    61:  "damage_fire",
    62:  "damage_push",
    38:  "critical_damage",
    71:  "distance_damage",
    41:  "damage_weapon_percent",
    93:  "damage_spell_percent",
    189: "damage_air",    # variante "dommages Air"
    194: "damage_earth",  # variante "dommages Terre"
    195: "damage_neutral",# variante "dommages Neutre"
    198: "damage_fire",   # variante "dommages Feu"
    214: "damage_water",  # variante "dommages Eau"
    # Résistances fixes
    14:  "resistance_fire",
    15:  "resistance_earth",
    33:  "resistance_neutral",
    60:  "resistance_air",
    70:  "resistance_push",
    82:  "resistance_water",
    46:  "resistance_critical",
    # Résistances %
    16:  "resistance_air_percent",
    17:  "resistance_water_percent",
    34:  "resistance_neutral_percent",
    37:  "resistance_fire_percent",
    63:  "resistance_earth_percent",
    65:  "resistance_melee_percent",
    108: "resistance_distance_percent",
}


def _normalize_effect_name(name: str) -> str:
    return name.strip().lower()


def _pattern_key(normalized: str) -> Optional[str]:
    if normalized in _DIRECT_NAME_TO_KEY:
        return _DIRECT_NAME_TO_KEY[normalized]
    if normalized.endswith(" damage"):
        elem = normalized[: -len(" damage")].strip()
        if elem in ("earth", "fire", "water", "air", "neutral"):
            return f"damage_{elem}"
    m = re.match(r"^(.+) damage$", normalized)
    if m:
        elem = m.group(1).strip()
        if elem in ("earth", "fire", "water", "air", "neutral"):
            return f"damage_{elem}"
    m = re.match(r"^%\s*(.+)\s+resistance$", normalized)
    if m:
        return f"resistance_{m.group(1).strip().lower().replace(' ', '_')}_percent"
    if normalized == "% critical":
        return "critical_percent"
    return None


def effect_type_to_stat_key(effect_type: dict[str, Any]) -> Optional[str]:
    """Map an API EffectType (or full effect.type) to a canonical base_stats key."""
    if not effect_type:
        return None
    if effect_type.get("is_meta"):
        return None
    eid = effect_type.get("id")
    if isinstance(eid, int) and eid in _EFFECT_ID_TO_KEY:
        return _EFFECT_ID_TO_KEY[eid]
    name = effect_type.get("name")
    if not name:
        return None
    norm = _normalize_effect_name(name)
    pk = _pattern_key(norm)
    if pk:
        return pk
    if norm in _DIRECT_NAME_TO_KEY:
        return _DIRECT_NAME_TO_KEY[norm]
    return None


def effect_numeric_max(effect: dict[str, Any]) -> Optional[int]:
    """Best roll (upper bound) for numeric effects; None if not applicable."""
    et = effect.get("type") or {}
    if et.get("is_meta"):
        return None
    ignore_max = bool(effect.get("ignore_int_max"))
    ignore_min = bool(effect.get("ignore_int_min"))
    if ignore_min and ignore_max:
        return None
    imin = effect.get("int_minimum")
    imax = effect.get("int_maximum")
    if imin is None:
        imin = 0
    if imax is None:
        imax = 0
    if ignore_max:
        return int(imin)
    return int(max(imin, imax))


def flatten_effects_to_base_stats(effects: list[dict[str, Any]] | None) -> dict[str, int]:
    """Aggregate mapped effects into non-negative integer totals (max roll per line)."""
    out: dict[str, int] = {}
    for eff in effects or []:
        key = effect_type_to_stat_key(eff.get("type") or {})
        if not key:
            continue
        val = effect_numeric_max(eff)
        if val is None:
            continue
        out[key] = out.get(key, 0) + val
    return out


def type_name_id_from_item_type(type_obj: dict[str, Any] | None) -> Optional[str]:
    """Canonical slug for solver (`slots.py`): English-like slug, not localized label.

    dofusdu `type.name` follows the URL language (`fr` → « Anneau », etc.). We map
    stable `type.id` to the same slugs as the former English-only ETL.
    """
    if not type_obj:
        return None
    tid = type_obj.get("id")
    if isinstance(tid, int) and tid in EQUIPMENT_TYPE_ID_TO_SLUG:
        return EQUIPMENT_TYPE_ID_TO_SLUG[tid]
    name = type_obj.get("name")
    if not name:
        return str(tid) if tid is not None else None
    slug = name.strip().lower().replace("'", "").replace(" ", "-")
    return slug or None


def pick_image_url(image_urls: dict[str, Any] | None) -> Optional[str]:
    if not image_urls:
        return None
    return (
        image_urls.get("hq")
        or image_urls.get("hd")
        or image_urls.get("sd")
        or image_urls.get("icon")
    )
