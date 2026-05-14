from __future__ import annotations

from typing import Any

from app.api.client import ApiClient


class AuthApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def login(self, email: str, password: str) -> dict[str, Any]:
        return await self._client.post(
            "/auth/login",
            json={"email": email, "password": password},
        )

    async def register(
        self,
        full_name: str,
        email: str,
        password: str,
        role: str,
        group_name: str | None = None,
        department: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "fullName": full_name,
            "email": email,
            "password": password,
            "role": role,
        }
        if group_name:
            payload["groupName"] = group_name
        if department:
            payload["department"] = department
        return await self._client.post("/auth/register", json=payload)

    async def me(self, token: str) -> dict[str, Any]:
        return await self._client.get("/users/me", token=token)

    async def update_consent(self, token: str, consent: bool) -> dict[str, Any]:
        """Returns User fields + fresh `token`. Caller must replace stored JWT."""
        return await self._client.patch(
            "/users/me/personal-data-consent",
            token=token,
            json={"consent": consent},
        )

    async def update_telegram(
        self,
        token: str,
        chat_id: int,
        username: str | None = None,
    ) -> dict[str, Any]:
        return await self._client.patch(
            "/users/me/telegram",
            token=token,
            json={"chatId": chat_id, "username": username},
        )

    async def link_start(self, token: str) -> dict[str, Any]:
        return await self._client.post("/telegram/link/start", token=token)

    async def link_verify(
        self,
        token: str,
        chat_id: int,
        username: str | None,
        code: str,
    ) -> dict[str, Any]:
        return await self._client.post(
            "/telegram/link/verify",
            token=token,
            json={"chatId": chat_id, "username": username, "code": code},
        )
