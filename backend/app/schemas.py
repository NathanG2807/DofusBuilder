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
    locked_slots: dict[str, int] = Field(
        default_factory=dict,
        description=(
            "Slots verrouillés : emplacement → ankama_id. "
            "Ces items seront conservés dans le build optimisé (le solver les pique comme seul candidat du slot)."
        ),
    )


# --- HTTP payloads ---


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: EmailStr
    created_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=100)


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


class MessageResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    password: str = Field(min_length=8, max_length=128)


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
    recipe: Optional[list[Any]] = None
    created_at: Optional[datetime] = None


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
    locked_slots: Optional[dict[str, int]] = None
    is_public: bool = True
    tags: Optional[list[str]] = None
    slots_preview: Optional[dict[str, Optional[str]]] = None


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
    locked_slots: Optional[dict[str, int]] = None
    is_public: Optional[bool] = None
    tags: Optional[list[str]] = None
    slots_preview: Optional[dict[str, Optional[str]]] = None


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
    locked_slots: Optional[dict[str, int]] = None
    is_public: bool = True
    tags: Optional[list[str]] = None
    slots_preview: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PublicBuildOut(BaseModel):
    """Lightweight build for the public stuffs catalog (no private stats data)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    class_id: Optional[int] = None
    level: Optional[int] = None
    sex: Optional[str] = None
    is_public: bool = True
    tags: Optional[list[str]] = None
    slots_preview: Optional[dict[str, Any]] = None
    slots: Optional[dict[str, Any]] = None
    exo_fm: Optional[dict[str, str]] = None
    username: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CraftEntry(BaseModel):
    id: str
    entry_type: str = Field(description="item | set | build")
    ref_id: str
    quantity: int = Field(default=1, ge=1)
    label: Optional[str] = None
    slots: Optional[dict[str, Optional[int]]] = None


class IngredientProgress(BaseModel):
    owned: int = Field(default=0, ge=0)
    validated: int = Field(default=0, ge=0)


class CraftListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    entries: list[CraftEntry] = Field(default_factory=list)
    progress: dict[str, IngredientProgress] = Field(default_factory=dict)


class CraftListUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    entries: Optional[list[CraftEntry]] = None
    progress: Optional[dict[str, IngredientProgress]] = None


class CraftListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    entries: list[Any]
    progress: dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CommunityStatsResponse(BaseModel):
    """Compteurs agrégés de l'activité communautaire (page d'accueil)."""

    members: int = Field(description="Nombre de comptes inscrits")
    online_users: int = Field(description="Membres actifs dans les 2 dernières minutes")
    builds_total: int = Field(description="Builds enregistrés (publics + privés)")
    builds_public: int = Field(description="Builds partagés publiquement")
    craft_lists: int = Field(description="Listes d'atelier créées")
    items: int = Field(description="Objets référencés dans la base locale")
    item_sets: int = Field(description="Panoplies référencées dans la base locale")
    game_data: Optional["DofusduGameMeta"] = Field(
        default=None,
        description="Métadonnées Dofus 3 depuis api.dofusdu.de",
    )


class DofusduGameMeta(BaseModel):
    """Meta Dofus 3 (version jeu et fraîcheur des données)."""

    game_version: str
    data_updated_at: Optional[datetime] = None
