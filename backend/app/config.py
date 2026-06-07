from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/dofusbuilder"
    )
    jwt_secret: str = "dev-only-change-me-use-env"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 10080  # 7 days; override via JWT_ACCESS_TOKEN_EXPIRE_MINUTES

    # Solver (module 3): approximate character base PA/PM before gear (tune for Dofus 3 meta).
    character_base_pa: int = 6
    character_base_pm: int = 3
    solver_max_candidates_per_slot: int = 250
    solver_time_limit_seconds: float = 30.0

    # ETL: dofusdu path language (en, fr, de, es, pt). Item names follow this locale;
    # equipment type slugs in DB stay canonical via `etl/equipment_type_ids.py`.
    dofusdu_locale: str = "fr"
    # CORS origins as comma-separated URLs.
    cors_origins: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "https://zaap-builder.vercel.app"
    )
    # Regex matching Vercel preview deployments and any *.vercel.app subdomain.
    cors_origin_regex: str = r"https://.*\.vercel\.app$"


@lru_cache
def get_settings() -> Settings:
    return Settings()
