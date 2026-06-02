from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "NBA Analytics Platform"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/nba_analytics"
    database_url_sync: str = "postgresql://postgres:password@localhost:5432/nba_analytics"

    # Redis
    redis_url: str = "redis://localhost:6379"
    cache_ttl_seconds: int = 3600

    # Anthropic — required for all AI features
    anthropic_api_key: str = ""

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    allowed_origins: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
