"""
Recalcule base_stats pour tous les items depuis leur champ `effects` déjà en DB.
À relancer chaque fois que le mapping effect_mapping.py est mis à jour.

Usage (depuis le dossier backend/) :
    python -m scripts.recompute_base_stats
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

# Permet d'importer les modules du projet sans installation
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from etl.effect_mapping import flatten_effects_to_base_stats


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/dofusbuilder",
)


async def main() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            sa.text("SELECT ankama_id, effects FROM items")
        )
        rows = result.fetchall()
        print(f"{len(rows)} items à traiter…")

        updated = 0
        for row in rows:
            ankama_id, effects_raw = row
            if effects_raw is None:
                continue
            effects = effects_raw if isinstance(effects_raw, list) else json.loads(effects_raw)
            new_stats = flatten_effects_to_base_stats(effects)
            if not new_stats:
                continue
            await session.execute(
                sa.text(
                    "UPDATE items SET base_stats = :stats WHERE ankama_id = :aid"
                ),
                {"stats": json.dumps(new_stats), "aid": ankama_id},
            )
            updated += 1

        await session.commit()
        print(f"✓ {updated} items mis à jour.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
