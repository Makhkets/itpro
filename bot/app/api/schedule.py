from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class ScheduleApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def room_schedule(
        self,
        room_id: str,
        token: str | None = None,
        from_: str | None = None,
        to: str | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            f"/rooms/{room_id}/schedule",
            token=token,
            params={"from": from_, "to": to},
        )
        return _as_list(data)

    async def group_schedule(
        self,
        group_name: str,
        token: str | None = None,
        from_: str | None = None,
        to: str | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            f"/schedule/group/{group_name}",
            token=token,
            params={"from": from_, "to": to},
        )
        return _as_list(data)

    async def teacher_schedule(
        self,
        teacher_id: str,
        token: str | None = None,
        from_: str | None = None,
        to: str | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            f"/schedule/teacher/{teacher_id}",
            token=token,
            params={"from": from_, "to": to},
        )
        return _as_list(data)

    async def current(
        self,
        token: str | None = None,
        building_id: str | None = None,
        room_id: str | None = None,
        group_name: str | None = None,
    ) -> dict[str, Any]:
        return await self._client.get(
            "/schedule/current",
            token=token,
            params={
                "buildingId": building_id,
                "roomId": room_id,
                "groupName": group_name,
            },
        )
