from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Kiwi OS API"
    app_version: str = "0.1.0"

    database_url: str = Field(
        default="postgresql+asyncpg://kiwi:kiwi_dev_password@localhost:5432/kiwios",
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    jwt_secret: str = Field(default="change-me-in-production")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration_minutes: int = Field(default=60)

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    github_token: SecretStr | None = Field(default=None)
    github_username: str = Field(default="Kiwi6212")
    github_cache_ttl_seconds: int = Field(default=900)


@lru_cache
def get_settings() -> Settings:
    return Settings()
