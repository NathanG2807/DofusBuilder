"""Filtres SQL réutilisables sur `Item.name`."""

from __future__ import annotations

from sqlalchemy import and_, not_, or_

from app.models.item import Item

# Items exclus manuellement (ankama_id).
_EXCLUDED_ITEM_IDS: set[int] = {
    9031,  # Annobusé de Maître Jarbo
    2155,  # Amulette de Jiva
}


def sql_exclude_gm_items():
    """Exclut les items MJ et les items blacklistés manuellement."""
    not_mj = or_(Item.name.is_(None), not_(Item.name.ilike("%(MJ)%")))
    if not _EXCLUDED_ITEM_IDS:
        return not_mj
    return and_(not_mj, Item.ankama_id.not_in(_EXCLUDED_ITEM_IDS))
