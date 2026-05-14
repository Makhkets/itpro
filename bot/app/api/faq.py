from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class FaqApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def list(self) -> list[dict[str, Any]]:
        data = await self._client.get("/applicant-faq")
        return _as_list(data)

    async def search(self, q: str) -> list[dict[str, Any]]:
        data = await self._client.get("/applicant-faq/search", params={"q": q})
        return _as_list(data)
