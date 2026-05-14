from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class RoomsApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def search(
        self,
        token: str | None = None,
        q: str | None = None,
        building_id: str | None = None,
        room_type: str | None = None,
        equipment: str | None = None,
        capacity_min: int | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/rooms/search",
            token=token,
            params={
                "q": q,
                "buildingId": building_id,
                "type": room_type,
                "equipment": equipment,
                "capacityMin": capacity_min,
            },
        )
        return _as_list(data)

    async def list(
        self,
        token: str | None = None,
        building_id: str | None = None,
        floor_id: str | None = None,
        room_type: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/rooms",
            token=token,
            params={
                "buildingId": building_id,
                "floorId": floor_id,
                "type": room_type,
                "page": page,
                "pageSize": page_size,
            },
        )
        return _as_list(data)

    async def get(self, room_id: str, token: str | None = None) -> dict[str, Any]:
        return await self._client.get(f"/rooms/{room_id}", token=token)

    async def availability(
        self,
        room_id: str,
        date: str,
        token: str | None = None,
    ) -> dict[str, Any]:
        return await self._client.get(
            f"/rooms/{room_id}/availability",
            token=token,
            params={"date": date},
        )
