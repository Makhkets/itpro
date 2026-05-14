from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class UserSession:
    token: str
    user: dict[str, Any]
    expires_at: float
    ai_session_id: str | None = None
    extras: dict[str, Any] = field(default_factory=dict)


class SessionStore:
    """In-memory async session store keyed by telegram_user_id.

    Only JWT + user summary live here. Passwords are never stored.
    """

    def __init__(self, ttl_seconds: int = 24 * 3600) -> None:
        self._ttl = ttl_seconds
        self._sessions: dict[int, UserSession] = {}
        self._lock = asyncio.Lock()

    async def set(self, user_id: int, token: str, user: dict[str, Any]) -> UserSession:
        async with self._lock:
            session = UserSession(
                token=token,
                user=user,
                expires_at=time.time() + self._ttl,
            )
            self._sessions[user_id] = session
            return session

    async def get(self, user_id: int) -> UserSession | None:
        async with self._lock:
            session = self._sessions.get(user_id)
            if not session:
                return None
            if session.expires_at < time.time():
                self._sessions.pop(user_id, None)
                return None
            return session

    async def clear(self, user_id: int) -> None:
        async with self._lock:
            self._sessions.pop(user_id, None)

    async def update_user(self, user_id: int, user: dict[str, Any]) -> None:
        async with self._lock:
            if user_id in self._sessions:
                self._sessions[user_id].user = user

    async def set_token(self, user_id: int, token: str) -> None:
        async with self._lock:
            if user_id in self._sessions:
                self._sessions[user_id].token = token
                self._sessions[user_id].expires_at = time.time() + self._ttl

    async def set_ai_session(self, user_id: int, session_id: str | None) -> None:
        async with self._lock:
            if user_id in self._sessions:
                self._sessions[user_id].ai_session_id = session_id

    async def get_token(self, user_id: int) -> str | None:
        session = await self.get(user_id)
        return session.token if session else None
