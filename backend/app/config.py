from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: Optional[str] = None

    def database_configured(self) -> bool:
        return bool(self.database_url and self.database_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
