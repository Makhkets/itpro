from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from app.api import (
    AIApi,
    ApiClient,
    AuthApi,
    BookingsApi,
    CampusApi,
    FaqApi,
    LibraryApi,
    NotificationsApi,
    PrivacyApi,
    RoomsApi,
    ScheduleApi,
)
from app.config import Settings
from app.handlers import build_root_router
from app.middlewares.auth import SessionInjectMiddleware
from app.middlewares.logging import LoggingMiddleware
from app.middlewares.throttling import ThrottlingMiddleware
from app.services.session_store import SessionStore

logger = logging.getLogger(__name__)


@asynccontextmanager
async def build_app(settings: Settings) -> AsyncIterator[tuple[Bot, Dispatcher]]:
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    api_client = ApiClient(
        base_url=settings.api_base_url,
        timeout_seconds=settings.request_timeout_seconds,
    )
    await api_client.start()

    session_store = SessionStore(ttl_seconds=settings.session_ttl_hours * 3600)

    dp = Dispatcher(storage=MemoryStorage())

    dp["auth_api"] = AuthApi(api_client)
    dp["campus_api"] = CampusApi(api_client)
    dp["rooms_api"] = RoomsApi(api_client)
    dp["schedule_api"] = ScheduleApi(api_client)
    dp["bookings_api"] = BookingsApi(api_client)
    dp["notifications_api"] = NotificationsApi(api_client)
    dp["faq_api"] = FaqApi(api_client)
    dp["ai_api"] = AIApi(api_client)
    dp["library_api"] = LibraryApi(api_client)
    dp["privacy_api"] = PrivacyApi(api_client)
    dp["session_store"] = session_store

    session_mw = SessionInjectMiddleware(session_store)
    log_mw = LoggingMiddleware()
    throttle_mw = ThrottlingMiddleware()
    for observer in (dp.message, dp.callback_query):
        observer.outer_middleware(log_mw)
        observer.outer_middleware(throttle_mw)
        observer.outer_middleware(session_mw)

    dp.include_router(build_root_router())

    try:
        yield bot, dp
    finally:
        await api_client.close()
        await bot.session.close()
