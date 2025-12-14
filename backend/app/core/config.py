"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Clean Energy Intelligence Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # API
    API_PREFIX: str = "/api"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cleanenergy"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # Stripe (for payments)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""  # Stripe price ID for $19.99
    STRIPE_PRICE_PROFESSIONAL: str = ""  # Stripe price ID for $99
    STRIPE_PRICE_DISCOVERY: str = ""  # Stripe price ID for $499

    # Claude AI (for insights)
    ANTHROPIC_API_KEY: str = ""

    # Materials Project API (for Discovery tier)
    # Get API key at: https://materialsproject.org/api
    # License: CC-BY 4.0 (commercial use allowed with attribution)
    MATERIALS_PROJECT_API_KEY: str = ""

    # Open Catalyst Project (for Discovery tier)
    # License: MIT (fully open for commercial use)
    OPEN_CATALYST_API_URL: str = "https://opencatalystproject.org/api"

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = [".csv", ".xlsx", ".xls"]
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
