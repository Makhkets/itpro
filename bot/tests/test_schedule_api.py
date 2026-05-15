from __future__ import annotations

import pytest
from aioresponses import aioresponses

from app.api.client import ApiClient
from app.api.schedule import ScheduleApi

BASE = "http://api.test/api/v1"


@pytest.fixture
async def client():
    c = ApiClient(BASE, timeout_seconds=5)
    await c.start()
    try:
        yield c
    finally:
        await c.close()


async def test_group_schedule_encodes_group_name(client):
    api = ScheduleApi(client)
    with aioresponses() as m:
        m.get(f"{BASE}/schedule/group/%D0%98%D0%A1%D0%98%D0%9F-21", payload=[])
        data = await api.group_schedule(" ИСИП-21 ")

    assert data == []

