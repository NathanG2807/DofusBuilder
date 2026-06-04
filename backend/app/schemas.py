"""API and domain contracts (DIA_SPEC §3)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- DIA_SPEC contracts ---


class ItemEffect(BaseModel):
    id: int
    min: Optional[int] = None
    max: int
    formatted: str


class FullBuild(BaseModel):
    slots: dict[str, Optional[int]]
    total_stats: dict[str, int]
    active_set_bonuses: list[str]
    exo_pa: bool = False
    exo_pm: bool = False


class AggregateStatsRequest(BaseModel):
    """Slots équipés (ankama_id par emplacement, null si vide)."""

    slots: dict[str, Optional[int]]
    level: int = Field(default=200, ge=1, le=200, description="Niveau du personnage (pour le bonus PA niv. 100+)")


class ActiveSetTierEffect(BaseModel):
    """Un effet formaté dans un palier de panoplie."""
    formatted: str


class ActiveSetDetail(BaseModel):
    """Panoplie active avec ses effets par palier pour le nombre de pièces équipées."""
    name: str
    set_id: int
    piece_count: int
    total_pieces: int
    effects: list[str]  # effets formatés cumulés jusqu'au palier actuel


class AggregateStatsResponse(BaseModel):
    total_stats: dict[str, int]
    active_set_bonuses: list[str]  # noms (rétrocompatibilité)
    active_set_details: list[ActiveSetDetail] = []


class OptimizationRequest(BaseModel):
    level: int = Field(default=200, description="Niveau maximum des équipements")
    class_id: int = Field(description="ID de la classe du personnage")
    elements: list[str] = Field(
        description="Éléments principaux souhaités (ex: ['strength', 'intelligence'])"
    )
    min_pa: int = Field(default=11, description="Nombre minimum de Points d'Action requis")
    min_pm: int = Field(
        default=6, description="Nombre minimum de Points de Mouvement requis"
    )
    focus_stats: list[str] = Field(
        default_factory=list,
        description="Stats annexes à maximiser (ex: ['damage_earth', 'critical_hit'])",
    )
    allow_exo_pa: bool = Field(
        default=False,
        description="Autoriser un exo +1 PA (Forgemagie) — max 1 par build",
    )
    allow_exo_pm: bool = Field(
        default=False,
        description="Autoriser un exo +1 PM (Forgemagie) — max 1 par build",
    )
    allow_dofus: bool = Field(
        default=False,
        description="Autoriser les dofus dans les emplacements dofus (sinon trophées/prysmaradites seulement si autorisés)",
    )
    allow_prysmaradite: bool = Field(
        default=False,
        description="Autoriser les prysmaradites dans les emplacements dofus",
    )
    mode: str = Field(
        default="solver",
        description="'solver' pour l'optimum unique, 'genetic' pour des variantes",
    )
    stat_weights: Optional[dict[str, int]] = Field(
        default=None,
        description=(
            "Poids personnalisés par stat (clé = stat key, valeur = 1-10). "
            "Si fourni, remplace les multiplicateurs par défaut pour les stats concernées. "
            "Les stats non listées gardent leur poids par défaut."
        ),
    )


# --- HTTP payloads ---


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: EmailStr
    created_at: datetime


class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ankama_id: int
    name: str
    level: int
    type_name_id: Optional[str] = None
    is_weapon: bool = False
    image_url_icon: Optional[str] = None
    effects: Optional[list[Any]] = None
    conditions: Optional[dict[str, Any]] = None
    parent_set_id: Optional[int] = None
    pods: Optional[int] = None
    base_stats: Optional[dict[str, Any]] = None
    description: Optional[str] = None
    weapon_detail: Optional[dict[str, Any]] = None
    created_at: datetime


class ItemListResponse(BaseModel):
    items: list[ItemOut]
    total: int
    page: int
    page_size: int


class ItemSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ankama_id: int
    name: Optional[str] = None
    equipment_ids: Optional[list[int]] = None
    bonus_effects: Optional[dict[str, Any]] = None


class ItemSetListResponse(BaseModel):
    sets: list[ItemSetOut]
    total: int
    page: int
    page_size: int


class BuildCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    class_id: Optional[int] = None
    level: Optional[int] = None
    sex: Optional[str] = None
    slots: Optional[dict[str, Optional[int]]] = None
    total_stats: Optional[dict[str, int]] = None
    active_set_bonuses: Optional[list[str]] = None
    char_stats: Optional[dict[str, int]] = None
    parcho_stats: Optional[dict[str, int]] = None
    exo_fm: Optional[dict[str, str]] = None
    is_public: bool = True


class BuildUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    class_id: Optional[int] = None
    level: Optional[int] = None
    sex: Optional[str] = None
    slots: Optional[dict[str, Optional[int]]] = None
    total_stats: Optional[dict[str, int]] = None
    active_set_bonuses: Optional[list[str]] = None
    char_stats: Optional[dict[str, int]] = None
    parcho_stats: Optional[dict[str, int]] = None
    exo_fm: Optional[dict[str, str]] = None
    is_public: Optional[bool] = None


class BuildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    name: str
    description: Optional[str] = None
    class_id: Optional[int] = None
    level: Optional[int] = None
    sex: Optional[str] = None
    slots: Optional[dict[str, Any]] = None
    total_stats: Optional[dict[str, int]] = None
    active_set_bonuses: Optional[list[str]] = None
    char_stats: Optional[dict[str, int]] = None
    parcho_stats: Optional[dict[str, int]] = None
    exo_fm: Optional[dict[str, str]] = None
    is_public: bool = True
    created_at: datetime
    updated_at: datetime
