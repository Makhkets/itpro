from __future__ import annotations

from typing import Any

from app.api.client import ApiClient


class PrivacyApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def me(self, token: str) -> dict[str, Any]:
        return await self._client.get("/privacy/me", token=token)

    async def export(self, token: str) -> dict[str, Any]:
        return await self._client.post("/privacy/export", token=token)

    async def delete_request(self, token: str) -> dict[str, Any]:
        return await self._client.post("/privacy/delete-request", token=token)
