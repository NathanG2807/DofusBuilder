from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ItemSet(Base):
    __tablename__ = "item_sets"

    ankama_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    equipment_ids: Mapped[Optional[list[int]]] = mapped_column(ARRAY(Integer), nullable=True)
    bonus_effects: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
