"""One-off script to apply db/migrate_009_build_upvotes.sql."""
from __future__ import annotations

import asyncio
from pathlib import Path

from sqlalchemy import text

from app.db.session import engine


def _statements(sql: str) -> list[str]:
    out: list[str] = []
    for chunk in sql.split(";"):
        lines = [ln for ln in chunk.splitlines() if ln.strip() and not ln.strip().startswith("--")]
        stmt = "\n".join(lines).strip()
        if stmt:
            out.append(stmt)
    return out


async def main() -> None:
    sql_path = Path(__file__).resolve().parents[2] / "db" / "migrate_009_build_upvotes.sql"
    sql = sql_path.read_text(encoding="utf-8")
    async with engine.begin() as conn:
        for stmt in _statements(sql):
            await conn.execute(text(stmt))
    print("Migration 009 applied successfully")


if __name__ == "__main__":
    asyncio.run(main())
