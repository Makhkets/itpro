from __future__ import annotations

import time
from collections import defaultdict
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject


class ThrottlingMiddleware(BaseMiddleware):
    """Simple per-user rate limit on Message and CallbackQuery events."""

    def __init__(self, rate: float = 0.4) -> None:
        self._rate = rate
        self._last: dict[int, float] = defaultdict(float)

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user_id: int | None = None
        if isinstance(event, (Message, CallbackQuery)) and event.from_user:
            user_id = event.from_user.id

        if user_id is not None:
            now = time.monotonic()
            last = self._last[user_id]
            if now - last < self._rate:
                if isinstance(event, CallbackQuery):
                    await event.answer("Не так быстро, секунду…", show_alert=False)
                return None
            self._last[user_id] = now

        return await handler(event, data)
