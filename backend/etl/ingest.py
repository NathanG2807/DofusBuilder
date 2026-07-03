"""
Ingest Dofus 3 equipment, item sets and mounts from api.dofusdu.de.

Locale for labels (item/set names, effect `formatted`, etc.): `DOFUSDU_LOCALE` in `.env`
(default **fr**). Solver slot matching uses stable `type.id` → slug, not the localized name.

Usage (from backend/):
    python -m etl.ingest
    python -m etl.ingest --only items
    python -m etl.ingest --only sets
    python -m etl.ingest --only mounts
    python -m etl.ingest --only resources
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from typing import Any, Optional

import asyncpg
import httpx

from app.config import get_settings
from etl.effect_mapping import (
    flatten_effects_to_base_stats,
    pick_image_url,
    type_name_id_from_item_type,
)

logger = logging.getLogger(__name__)

API_BASE = "https://api.dofusdu.de/dofus3/v1"


def _locale() -> str:
    code = get_settings().dofusdu_locale.strip().lower()[:2]
    return code if code in ("en", "fr", "de", "es", "pt") else "fr"
# Detail fields merged into list responses (see OpenAPI fields[item]).
ITEM_EXTRA_FIELDS = (
    "effects,is_weapon,pods,conditions,parent_set,description,recipe,"
    "ap_cost,range,max_cast_per_turn,"
    "critical_hit_probability,critical_hit_bonus"
)
RESOURCE_EXTRA_FIELDS = "effects,description,recipe,conditions"


def _db_dsn() -> str:
    url = get_settings().database_url
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + url.split("postgresql+asyncpg://", 1)[1]
    return url


def _json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)


async def fetch_item_page(
    client: httpx.AsyncClient,
    category: str,
    page: int,
    page_size: int,
    *,
    extra_fields: str,
) -> dict[str, Any]:
    r = await client.get(
        f"{API_BASE}/{_locale()}/items/{category}",
        params={
            "page[number]": page,
            "page[size]": page_size,
            "fields[item]": extra_fields,
        },
        headers={"Accept-Encoding": "gzip"},
        timeout=120.0,
    )
    r.raise_for_status()
    return r.json()


async def fetch_equipment_page(
    client: httpx.AsyncClient, page: int, page_size: int
) -> dict[str, Any]:
    return await fetch_item_page(
        client, "equipment", page, page_size, extra_fields=ITEM_EXTRA_FIELDS
    )


async def fetch_resources_page(
    client: httpx.AsyncClient, page: int, page_size: int
) -> dict[str, Any]:
    return await fetch_item_page(
        client, "resources", page, page_size, extra_fields=RESOURCE_EXTRA_FIELDS
    )


async def fetch_all_sets(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    r = await client.get(
        f"{API_BASE}/{_locale()}/sets/all",
        headers={"Accept-Encoding": "gzip"},
        timeout=180.0,
    )
    r.raise_for_status()
    data = r.json()
    return data.get("sets") or []


async def fetch_all_mounts(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    r = await client.get(
        f"{API_BASE}/{_locale()}/mounts/all",
        headers={"Accept-Encoding": "gzip"},
        timeout=180.0,
    )
    r.raise_for_status()
    data = r.json()
    return data.get("mounts") or []


def mount_row_from_api(raw: dict[str, Any]) -> tuple[Any, ...]:
    """Convertit une monture en ligne items.

    Les montures n'ont pas de niveau — on utilise level=1 pour qu'elles soient
    toujours disponibles dans l'optimiseur quel que soit le niveau demandé.
    type_name_id='mount' → slot 'pet' (familier/monture).
    """
    effects = raw.get("effects") or []
    base_stats = flatten_effects_to_base_stats(effects if isinstance(effects, list) else [])
    return (
        int(raw["ankama_id"]),
        raw["name"],
        1,          # level=1 : toujours éligible
        "mount",    # type_name_id → slot pet
        False,      # is_weapon
        pick_image_url(raw.get("image_urls")),
        _json(effects),
        None,       # conditions
        None,       # parent_set_id
        None,       # pods
        _json(base_stats),
        None,       # description
        None,       # weapon_detail
        None,       # recipe
    )


def _weapon_detail_from_api(raw: dict[str, Any]) -> Optional[dict[str, Any]]:
    if not raw.get("is_weapon"):
        return None
    out: dict[str, Any] = {}
    for k in (
        "ap_cost",
        "range",
        "critical_hit_probability",
        "critical_hit_bonus",
        "max_cast_per_turn",
        "cast_in_line",
        "cast_in_diagonal",
        "cast_test_los",
    ):
        if raw.get(k) is not None:
            out[k] = raw[k]
    return out or None


def resource_row_from_api(raw: dict[str, Any]) -> tuple[Any, ...]:
    """Ressources de craft (bois, minerais, etc.) — pas de parent_set ni weapon_detail."""
    effects = raw.get("effects") or []
    conditions = raw.get("conditions")
    base_stats = flatten_effects_to_base_stats(effects if isinstance(effects, list) else [])
    desc = raw.get("description")
    if isinstance(desc, str) and len(desc) > 12000:
        desc = desc[:12000]
    recipe = raw.get("recipe")
    recipe_json = _json(recipe) if isinstance(recipe, list) and recipe else None
    level_raw = raw.get("level")
    level = int(level_raw) if level_raw is not None else 1
    return (
        int(raw["ankama_id"]),
        raw["name"],
        level,
        type_name_id_from_item_type(raw.get("type")),
        False,
        pick_image_url(raw.get("image_urls")),
        _json(effects),
        _json(conditions) if conditions is not None else None,
        None,
        raw.get("pods"),
        _json(base_stats),
        desc if isinstance(desc, str) else None,
        None,
        recipe_json,
    )


def item_row_from_api(raw: dict[str, Any]) -> tuple[Any, ...]:
    effects = raw.get("effects") or []
    conditions = raw.get("conditions")
    parent = raw.get("parent_set")
    parent_id: Optional[int] = None
    if isinstance(parent, dict) and parent.get("id") is not None:
        parent_id = int(parent["id"])

    base_stats = flatten_effects_to_base_stats(effects if isinstance(effects, list) else [])
    desc = raw.get("description")
    if isinstance(desc, str) and len(desc) > 12000:
        desc = desc[:12000]

    wd = _weapon_detail_from_api(raw)
    recipe = raw.get("recipe")
    recipe_json = _json(recipe) if isinstance(recipe, list) and recipe else None
    level_raw = raw.get("level")
    level = int(level_raw) if level_raw is not None else 1
    return (
        int(raw["ankama_id"]),
        raw["name"],
        level,
        type_name_id_from_item_type(raw.get("type")),
        bool(raw.get("is_weapon")) if raw.get("is_weapon") is not None else False,
        pick_image_url(raw.get("image_urls")),
        _json(effects),
        _json(conditions) if conditions is not None else None,
        parent_id,
        raw.get("pods"),
        _json(base_stats),
        desc if isinstance(desc, str) else None,
        _json(wd) if wd is not None else None,
        recipe_json,
    )


async def upsert_items(conn: asyncpg.Connection, rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    await conn.executemany(
        """
        INSERT INTO items (
            ankama_id, name, level, type_name_id, is_weapon, image_url_icon,
            effects, conditions, parent_set_id, pods, base_stats, description, weapon_detail, recipe
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11::jsonb, $12, $13::jsonb, $14::jsonb
        )
        ON CONFLICT (ankama_id) DO UPDATE SET
            name = EXCLUDED.name,
            level = EXCLUDED.level,
            type_name_id = EXCLUDED.type_name_id,
            is_weapon = EXCLUDED.is_weapon,
            image_url_icon = EXCLUDED.image_url_icon,
            effects = EXCLUDED.effects,
            conditions = EXCLUDED.conditions,
            parent_set_id = EXCLUDED.parent_set_id,
            pods = EXCLUDED.pods,
            base_stats = EXCLUDED.base_stats,
            description = EXCLUDED.description,
            weapon_detail = EXCLUDED.weapon_detail,
            recipe = EXCLUDED.recipe
        """,
        rows,
    )


def set_row_from_api(raw: dict[str, Any]) -> tuple[Any, ...]:
    eids = raw.get("equipment_ids") or []
    bonus = raw.get("effects") or {}
    return (
        int(raw["ankama_id"]),
        raw.get("name") or "",
        [int(x) for x in eids],
        _json(bonus),
    )


async def upsert_sets(conn: asyncpg.Connection, rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    await conn.executemany(
        """
        INSERT INTO item_sets (ankama_id, name, equipment_ids, bonus_effects)
        VALUES ($1, $2, $3::integer[], $4::jsonb)
        ON CONFLICT (ankama_id) DO UPDATE SET
            name = EXCLUDED.name,
            equipment_ids = EXCLUDED.equipment_ids,
            bonus_effects = EXCLUDED.bonus_effects
        """,
        rows,
    )


async def run_ingest(*, only: str, page_size: int) -> None:
    dsn = _db_dsn()
    async with httpx.AsyncClient() as client:
        conn = await asyncpg.connect(dsn)
        try:
            if only in ("all", "items"):
                page = 1
                total = 0
                while True:
                    payload = await fetch_equipment_page(client, page, page_size)
                    items = payload.get("items") or []
                    if not items:
                        break
                    rows = [item_row_from_api(i) for i in items]
                    await upsert_items(conn, rows)
                    total += len(rows)
                    logger.info("Equipment page %s: %s items (total %s)", page, len(rows), total)
                    links = payload.get("_links") or {}
                    if not links.get("next"):
                        break
                    page += 1
                logger.info("Equipment ingest finished: %s rows", total)

            if only in ("all", "resources"):
                page = 1
                total = 0
                while True:
                    payload = await fetch_resources_page(client, page, page_size)
                    items = payload.get("items") or []
                    if not items:
                        break
                    rows = [resource_row_from_api(i) for i in items]
                    await upsert_items(conn, rows)
                    total += len(rows)
                    logger.info("Resources page %s: %s items (total %s)", page, len(rows), total)
                    links = payload.get("_links") or {}
                    if not links.get("next"):
                        break
                    page += 1
                logger.info("Resources ingest finished: %s rows", total)

            if only in ("all", "sets"):
                raw_sets = await fetch_all_sets(client)
                rows = [set_row_from_api(s) for s in raw_sets]
                await upsert_sets(conn, rows)
                logger.info("Sets ingest finished: %s rows", len(rows))

            if only in ("all", "mounts"):
                raw_mounts = await fetch_all_mounts(client)
                rows = [mount_row_from_api(m) for m in raw_mounts]
                await upsert_items(conn, rows)
                logger.info("Mounts ingest finished: %s rows", len(rows))
        finally:
            await conn.close()


def main() -> None:
    # asyncpg + asyncio Proactor on Windows can be flaky; Selector is reliable for TCP.
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    p = argparse.ArgumentParser(description="DIA ETL — dofusdu.de → PostgreSQL")
    p.add_argument(
        "--only",
        choices=("all", "items", "sets", "mounts", "resources"),
        default="all",
        help="Restrict to equipment, resources, sets or mounts only",
    )
    p.add_argument(
        "--page-size",
        type=int,
        default=120,
        help="Equipment list page size (with fields[item])",
    )
    args = p.parse_args()
    try:
        asyncio.run(run_ingest(only=args.only, page_size=args.page_size))
    except httpx.HTTPStatusError as e:
        logger.error("HTTP error: %s", e)
        sys.exit(1)
    except Exception:
        logger.exception("Ingest failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
