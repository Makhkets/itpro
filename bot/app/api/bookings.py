from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class BookingsApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def create(
        self,
        token: str,
        room_id: str,
        title: str,
        purpose: str,
        starts_at: str,
        ends_at: str,
        booking_type: str = "personal",
    ) -> dict[str, Any]:
        return await self._client.post(
            "/bookings",
            token=token,
            json={
                "roomId": room_id,
                "title": title,
                "purpose": purpose,
                "bookingType": booking_type,
                "startsAt": starts_at,
                "endsAt": ends_at,
            },
        )

    async def my(
        self,
        token: str,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/bookings/my",
            token=token,
            params={"status": status, "page": page, "pageSize": page_size},
        )
        return _as_list(data)

    async def get(self, token: str, booking_id: str) -> dict[str, Any]:
        return await self._client.get(f"/bookings/{booking_id}", token=token)

    async def cancel(self, token: str, booking_id: str) -> dict[str, Any]:
        return await self._client.patch(f"/bookings/{booking_id}/cancel", token=token)
