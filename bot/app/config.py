from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    bot_token: str = Field(..., alias="BOT_TOKEN")
    telegram_proxy_url: str = Field(default="", alias="TELEGRAM_PROXY_URL")
    telegram_request_timeout_seconds: int = Field(default=30, alias="TELEGRAM_REQUEST_TIMEOUT_SECONDS")
    api_base_url: str = Field(
        default="http://localhost:8080/api/v1",
        alias="SMARTCAMPUS_API_BASE_URL",
    )
    bot_mode: Literal["polling", "webhook"] = Field(default="polling", alias="BOT_MODE")
    webhook_url: str = Field(default="", alias="WEBHOOK_URL")
    webhook_secret: str = Field(default="", alias="WEBHOOK_SECRET")
    drop_pending_updates: bool = Field(default=False, alias="DROP_PENDING_UPDATES")
    session_ttl_hours: int = Field(default=24, alias="SESSION_TTL_HOURS")
    request_timeout_seconds: int = Field(default=30, alias="REQUEST_TIMEOUT_SECONDS")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
