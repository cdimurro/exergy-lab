"""
Configuration Management for Exergy Lab Backend

Loads environment variables and provides centralized configuration.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Configuration
    app_name: str = "Exergy Lab"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    # Server Configuration
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_reload: bool = True

    # Database Configuration
    database_url: str = "postgresql://postgres:postgres@localhost:5432/exergy_lab"

    # Anthropic API
    anthropic_api_key: str

    # Classifier Configuration
    classifier_model: str = "claude-3-haiku-20240307"
    classifier_temperature: float = 0.0

    # Agent Configuration
    agent_model: str = "claude-3-5-sonnet-20241022"
    agent_temperature: float = 0.3

    # Literature Search Defaults
    max_arxiv_results: int = 10
    max_pubmed_results: int = 10

    # Cache TTL (seconds)
    arxiv_cache_ttl: int = 604800  # 7 days
    pubchem_cache_ttl: int = 2592000  # 30 days
    materials_cache_ttl: int = 2592000  # 30 days

    # CORS Origins
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60

    # Optional API Keys
    materials_project_api_key: Optional[str] = None
    nrel_api_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Singleton instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get application settings (singleton pattern)."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
