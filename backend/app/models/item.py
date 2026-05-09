from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Item(Base):
    __tablename__ = "items"

    ankama_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    type_name_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_weapon: Mapped[bool] = mapped_column(Boolean, default=False)
    image_url_icon: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effects: Mapped[Optional[list[Any]]] = mapped_column(JSONB, nullable=True)
    conditions: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    parent_set_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pods: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    base_stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    weapon_detail: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
