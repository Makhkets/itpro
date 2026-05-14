from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if isinstance(event, Message):
            logger.info(
                "msg user=%s text=%r",
                event.from_user.id if event.from_user else "?",
                (event.text or "")[:80],
            )
        elif isinstance(event, CallbackQuery):
            logger.info(
                "cb user=%s data=%s",
                event.from_user.id if event.from_user else "?",
                event.data,
            )
        return await handler(event, data)
