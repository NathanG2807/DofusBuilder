from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Build(Base):
    __tablename__ = "builds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    class_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    slots: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    total_stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    active_set_bonuses: Mapped[Optional[list[Any]]] = mapped_column(JSONB, nullable=True)
    char_stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    parcho_stats: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    exo_fm: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="builds")
