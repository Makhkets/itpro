from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class AIApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def chat(
        self,
        token: str,
        message: str,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"message": message}
        if session_id:
            payload["sessionId"] = session_id
        return await self._client.post("/ai/chat", token=token, json=payload)

    async def sessions(self, token: str) -> list[dict[str, Any]]:
        data = await self._client.get("/ai/sessions", token=token)
        return _as_list(data)

    async def session_messages(self, token: str, session_id: str) -> list[dict[str, Any]]:
        data = await self._client.get(f"/ai/sessions/{session_id}/messages", token=token)
        return _as_list(data)

    async def delete_session(self, token: str, session_id: str) -> None:
        await self._client.delete(f"/ai/sessions/{session_id}", token=token)
