from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


# Default uploads directory: apps/api/uploads/
# In production, override with the UPLOADS_DIR env var (e.g.
# /var/www/kiwi-os/uploads). Resolved here so other modules can import
# the constants without re-deriving the path.
_DEFAULT_UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"


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
    jwt_access_ttl_minutes: int = Field(default=15)
    jwt_refresh_ttl_days: int = Field(default=30)

    admin_email: str = Field(default="mathias@kiwi.local")
    admin_password: str = Field(default="change-me-in-production")

    cookie_secure: bool = Field(default=False)
    cookie_samesite: str = Field(default="lax")

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    github_token: SecretStr | None = Field(default=None)
    github_username: str = Field(default="Kiwi6212")
    github_cache_ttl_seconds: int = Field(default=900)

    uploads_dir: Path = Field(default=_DEFAULT_UPLOADS_DIR)


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Convenience constants for upload paths. Call get_settings() to ensure
# env-based overrides are honored, then derive the portfolio sub-tree.
UPLOADS_DIR: Path = get_settings().uploads_dir
PORTFOLIO_UPLOADS: Path = UPLOADS_DIR / "portfolio"
