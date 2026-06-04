"""Equipment slot definitions (`type_name_id` = canonical slug from Ankama `type.id`, see `etl/equipment_type_ids.py`)."""

from __future__ import annotations

from app.models.item import Item

# Slots used in the MIP (one item chosen per slot).
SLOT_ORDER: list[str] = [
    "hat",
    "cloak",
    "amulet",
    "ring1",
    "ring2",
    "belt",
    "boots",
    "weapon",
    "shield",
    "dofus1",
    "dofus2",
    "dofus3",
    "dofus4",
    "dofus5",
    "dofus6",
    "pet",
]

# Anciens noms acceptés en entrée (migration/rétrocompatibilité).
LEGACY_SLOT_ALIASES: dict[str, str] = {
    "trophy1": "dofus5",
    "trophy2": "dofus6",
}


def _excluded(item: Item) -> bool:
    t = item.type_name_id or ""
    if "certificate" in t or t.startswith("perceptor-"):
        return True
    if t in {"tool", "sidekick", "prysmaradite"}:
        return True
    return False


def item_fits_slot(slot: str, item: Item) -> bool:
    if _excluded(item):
        return False
    t = item.type_name_id
    if not t and slot not in ("weapon",):
        return False
    if slot in ("hat", "cloak", "amulet", "belt", "boots"):
        return t == slot
    if slot in ("ring1", "ring2"):
        return t == "ring"
    if slot == "weapon":
        return bool(item.is_weapon)
    if slot == "shield":
        return t == "shield"
    if slot.startswith("dofus"):
        # Les 6 emplacements dofus acceptent les dofus ET les trophées.
        return t in ("dofus", "trophy")
    if slot == "pet":
        return t in ("pet", "mount")
    return False
