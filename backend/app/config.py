from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


def _env_truthy(name: str) -> bool:
    v = os.environ.get(name)
    if v is None:
        return False
    return v.strip().lower() in ("1", "true", "yes", "on")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: Optional[str] = None

    def database_configured(self) -> bool:
        # Kad je postavljeno (npr. dev\backend-mock.ps1), uvijek ugrađeni mock,
        # čak i ako backend\.env sadrži DATABASE_URL — inače često ostane jedna sezona iz stare baze.
        if _env_truthy("BIH_PREMIER_FORCE_MOCK"):
            return False
        return bool(self.database_url and self.database_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
