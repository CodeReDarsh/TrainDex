from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://traindex@localhost:5432/traindex"
    reference_root: Path = Path("data/references")
    match_color_delta_e: float = Field(default=35, gt=0)
    match_max_candidates: int = Field(default=5000, ge=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
