"""Fetch Dofus 3 version metadata from api.dofusdu.de."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from datetime import datetime
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

API_BASE = "https://api.dofusdu.de"
GAME = "dofus3"
_CACHE_TTL_SECONDS = 300.0

_cache: Optional[tuple[float, dict[str, Any]]] = None
_cache_lock = asyncio.Lock()


def _parse_update_stamp(raw: Any) -> datetime | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    s = raw.strip().replace("Z", "+00:00")
    s = re.sub(r"(\.\d{6})\d+", r"\1", s)
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


async def fetch_dofusdu_game_meta() -> dict[str, Any] | None:
    """Return cached Dofus 3 version and data update date."""
    global _cache

    now = time.monotonic()
    async with _cache_lock:
        if _cache is not None and now - _cache[0] < _CACHE_TTL_SECONDS:
            return _cache[1]

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{API_BASE}/{GAME}/v1/meta/version",
                headers={"Accept-Encoding": "gzip"},
                timeout=12.0,
            )
            r.raise_for_status()
            version_raw = r.json()

        if not isinstance(version_raw, dict) or not version_raw.get("version"):
            return None

        payload: dict[str, Any] = {
            "game_version": str(version_raw["version"]),
            "data_updated_at": _parse_update_stamp(version_raw.get("update_stamp")),
        }

        async with _cache_lock:
            _cache = (time.monotonic(), payload)
        return payload
    except Exception as exc:
        logger.warning("dofusdu meta fetch failed: %s", exc)
        return None
