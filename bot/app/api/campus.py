from __future__ import annotations

from typing import Any

from app.api.client import ApiClient


class CampusApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def list_buildings(self, token: str | None = None) -> list[dict[str, Any]]:
        data = await self._client.get("/buildings", token=token)
        return _as_list(data)

    async def get_building(self, building_id: str, token: str | None = None) -> dict[str, Any]:
        return await self._client.get(f"/buildings/{building_id}", token=token)

    async def list_floors(self, building_id: str, token: str | None = None) -> list[dict[str, Any]]:
        data = await self._client.get(f"/buildings/{building_id}/floors", token=token)
        return _as_list(data)

    async def routes(
        self,
        token: str | None = None,
        from_building_id: str | None = None,
        to_building_id: str | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/navigation/routes",
            token=token,
            params={"fromBuildingId": from_building_id, "toBuildingId": to_building_id},
        )
        return _as_list(data)

    async def room_navigation(self, room_id: str, token: str | None = None) -> dict[str, Any]:
        return await self._client.get(f"/navigation/room/{room_id}", token=token)


def _as_list(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("items", "data", "results"):
            if isinstance(data.get(key), list):
                return data[key]
    return []
