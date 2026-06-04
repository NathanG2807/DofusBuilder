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

from app.config import get_settings
from etl.effect_mapping import flatten_effects_to_base_stats


# Priorité à DATABASE_URL explicite, sinon la base configurée (.env via get_settings),
# pour cibler la même base que l'application (ex. Render) et non le défaut local.
DATABASE_URL = os.getenv("DATABASE_URL") or get_settings().database_url


async def main() -> None:
    connect_args: dict = {}
    if "supabase.com" in DATABASE_URL or "supabase.co" in DATABASE_URL:
        import ssl as _ssl_mod

        ctx = _ssl_mod.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = _ssl_mod.CERT_NONE
        connect_args = {"ssl": ctx}
    engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
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
