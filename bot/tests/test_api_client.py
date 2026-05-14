from __future__ import annotations

import pytest
from aioresponses import aioresponses

from app.api.client import ApiClient, ApiError, AuthRequired, Forbidden

BASE = "http://api.test/api/v1"


@pytest.fixture
async def client():
    c = ApiClient(BASE, timeout_seconds=5)
    await c.start()
    try:
        yield c
    finally:
        await c.close()


async def test_get_success(client):
    with aioresponses() as m:
        m.get(f"{BASE}/buildings", payload=[{"id": "1", "name": "A"}])
        data = await client.get("/buildings")
        assert data == [{"id": "1", "name": "A"}]


async def test_post_with_token_sets_auth_header(client):
    with aioresponses() as m:
        m.post(f"{BASE}/auth/login", payload={"token": "t", "user": {}})
        result = await client.post("/auth/login", json={"email": "a", "password": "b"}, token="X")
        assert result["token"] == "t"
        req = list(m.requests.values())[0][0]
        assert req.kwargs["headers"]["Authorization"] == "Bearer X"


async def test_401_raises_auth_required(client):
    with aioresponses() as m:
        m.get(
            f"{BASE}/users/me",
            status=401,
            payload={"error": {"code": "auth.invalid", "message": "Invalid token"}},
        )
        with pytest.raises(AuthRequired) as exc:
            await client.get("/users/me", token="bad")
        assert exc.value.code == "auth.invalid"


async def test_403_raises_forbidden(client):
    with aioresponses() as m:
        m.get(f"{BASE}/ai/chat", status=403, payload={"error": {"message": "No consent"}})
        with pytest.raises(Forbidden):
            await client.get("/ai/chat", token="t")


async def test_400_raises_api_error(client):
    with aioresponses() as m:
        m.post(
            f"{BASE}/bookings",
            status=400,
            payload={"error": {"code": "validation", "message": "bad"}},
        )
        with pytest.raises(ApiError) as exc:
            await client.post("/bookings", token="t", json={})
        assert exc.value.status == 400
        assert exc.value.code == "validation"


async def test_query_params_drop_none(client):
    with aioresponses() as m:
        m.get(f"{BASE}/rooms?q=305", payload=[])
        await client.get("/rooms", params={"q": "305", "buildingId": None, "type": ""})
