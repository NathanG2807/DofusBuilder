from __future__ import annotations

import ssl as _ssl_mod
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()


def _connect_args(url: str) -> dict:
    """SSL chiffré sans vérification stricte pour les hôtes distants (Supabase, etc.).

    Le certificat Supabase n'est pas dans le magasin local Windows ; on garde le
    chiffrement TLS sans imposer la vérification de la chaîne.
    """
    if "supabase.com" in url or "supabase.co" in url:
        ctx = _ssl_mod.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = _ssl_mod.CERT_NONE
        return {"ssl": ctx}
    return {}


engine = create_async_engine(
    settings.database_url, echo=False, connect_args=_connect_args(settings.database_url)
)
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
