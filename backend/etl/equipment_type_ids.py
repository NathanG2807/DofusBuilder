"""Ankama equipment `type.id` → canonical slug (same as English `type.name` slugified).

Used so ETL can call dofusdu with `fr` (localized item names) while `items.type_name_id`
stays compatible with `app/solver/slots.py` (English slugs: hat, boots, ring, …).

Source: union of `type` over all `/dofus3/v1/en/items/equipment` pages.
"""

from __future__ import annotations

# id -> slug from English display name (strip, lower, ' -> '', spaces -> -)
EQUIPMENT_TYPE_ID_TO_SLUG: dict[int, str] = {
    1: "pet",
    17: "ring",
    22: "dragoturkey-certificate",
    23: "trophy",
    27: "hat",
    33: "amulet",
    39: "bow",
    42: "hammer",
    43: "cloak",
    45: "boots",
    52: "shovel",
    58: "belt",
    65: "wand",
    71: "rhineetle-certificate",
    73: "axe",
    78: "perceptor-tunic",
    79: "perceptor-armour",
    80: "sword",
    81: "perceptor-daggers",
    87: "shield",
    93: "dagger",
    102: "perceptor-shoes",
    105: "tool",
    111: "lance",
    124: "prysmaradite",
    125: "staff",
    126: "seemyool-certificate",
    157: "sidekick",
    161: "perceptor-banner",
    163: "scythe",
    177: "dofus",
    180: "petsmount",
    182: "magic-weapon",
    190: "perceptor-chests",
    193: "perceptor-bags",
    199: "pickaxe",
    242: "seemyool",
    245: "rhineetle",
    247: "dragoturkey",
}
