from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db.session import engine
from app.routers import auth, builds, craft_lists, items, optimize, sets, stats


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


_settings = get_settings()
_cors_origins = [
    o.strip()
    for o in _settings.cors_origins.replace("\n", ",").split(",")
    if o.strip()
]
_cors_origin_regex = _settings.cors_origin_regex.strip() or None

app = FastAPI(
    title="Dofus Intelligence Architect API",
    lifespan=lifespan,
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["authorization", "content-type", "accept", "x-requested-with"],
    expose_headers=["*"],
)


@app.get("/debug/cors")
async def debug_cors():
    return {
        "allow_origins": _cors_origins,
        "allow_origin_regex": _cors_origin_regex,
    }

app.include_router(auth.router, prefix="/api/v1")
app.include_router(items.router, prefix="/api/v1")
app.include_router(sets.router, prefix="/api/v1")
app.include_router(builds.router, prefix="/api/v1")
app.include_router(craft_lists.router, prefix="/api/v1")
app.include_router(optimize.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/health/db")
async def health_db():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
