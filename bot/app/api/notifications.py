from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class NotificationsApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def list(
        self,
        token: str,
        unread_only: bool = False,
        page: int = 1,
        page_size: int = 10,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/notifications",
            token=token,
            params={
                "unreadOnly": "true" if unread_only else None,
                "page": page,
                "pageSize": page_size,
            },
        )
        return _as_list(data)

    async def mark_read(self, token: str, notification_id: str) -> dict[str, Any]:
        return await self._client.patch(
            f"/notifications/{notification_id}/read",
            token=token,
        )

    async def mark_all_read(self, token: str) -> dict[str, Any]:
        return await self._client.patch("/notifications/read-all", token=token)
