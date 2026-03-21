from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SokoOdds API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/sokoodds"
    redis_url: str = "redis://localhost:6379/0"
    market_engine_health_url: str = "http://localhost:9000/internal/health"
    require_engine_ready_for_orders: bool = False
    engine_health_mode: Literal["stub", "http"] = "stub"
    engine_health_fallback_status: Literal["ready", "hydrating", "unreachable"] = "ready"
    engine_health_fallback_books_loaded: int = 3
    demo_user_default_wallet_balance: str = "25000.00"
    auth_session_ttl_hours: int = 720
    mpesa_verification_credit_amount: str = "5.00"
    daraja_mode: Literal["stub", "sandbox"] = "stub"
    daraja_consumer_key: str = ""
    daraja_consumer_secret: str = ""
    daraja_shortcode: str = ""
    daraja_passkey: str = ""
    daraja_callback_base_url: str = "http://localhost:8000"
    daraja_callback_token: str = "local-daraja-token"
    daraja_stub_auto_complete: bool = True
    seed_demo_markets_on_startup: bool = False
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
