"""Filtres SQL réutilisables sur `Item.name`."""

from __future__ import annotations

from sqlalchemy import and_, not_, or_

from app.models.item import Item

# Items exclus manuellement (ankama_id).
_EXCLUDED_ITEM_IDS: set[int] = {
    9031,  # Annobusé de Maître Jarbo
    2155,  # Amulette de Jiva
    6713,  # Lorsotheuses
}


def is_excluded_item_id(ankama_id: int) -> bool:
    return ankama_id in _EXCLUDED_ITEM_IDS

# Panoplies exclues manuellement (parent_set_id).
_EXCLUDED_SET_IDS: set[int] = {
    505,  # Panoplie Ankarton (items de tutoriel sans stats réelles)
}


def sql_exclude_gm_items():
    """Exclut les items MJ et les items blacklistés manuellement."""
    not_mj = or_(Item.name.is_(None), not_(Item.name.ilike("%(MJ)%")))
    not_excluded_ids = Item.ankama_id.not_in(_EXCLUDED_ITEM_IDS) if _EXCLUDED_ITEM_IDS else True
    not_excluded_sets = (
        or_(Item.parent_set_id.is_(None), Item.parent_set_id.not_in(_EXCLUDED_SET_IDS))
        if _EXCLUDED_SET_IDS
        else True
    )
    return and_(not_mj, not_excluded_ids, not_excluded_sets)
