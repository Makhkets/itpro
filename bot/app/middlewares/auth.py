from __future__ import annotations

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject

from app.services.session_store import SessionStore, UserSession


class SessionInjectMiddleware(BaseMiddleware):
    """Inject ``session`` (UserSession | None) into handler data."""

    def __init__(self, store: SessionStore) -> None:
        self._store = store

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user_id: int | None = None
        if isinstance(event, (Message, CallbackQuery)) and event.from_user:
            user_id = event.from_user.id

        session: UserSession | None = None
        if user_id is not None:
            session = await self._store.get(user_id)

        data["session"] = session
        data["session_store"] = self._store
        return await handler(event, data)
