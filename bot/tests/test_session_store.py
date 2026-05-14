import time

import pytest

from app.services.session_store import SessionStore


async def test_set_and_get():
    s = SessionStore(ttl_seconds=60)
    await s.set(1, "tok", {"id": "u1"})
    sess = await s.get(1)
    assert sess and sess.token == "tok"
    assert sess.user["id"] == "u1"


async def test_clear():
    s = SessionStore(ttl_seconds=60)
    await s.set(2, "t", {})
    await s.clear(2)
    assert await s.get(2) is None


async def test_expired_session_returns_none(monkeypatch):
    s = SessionStore(ttl_seconds=1)
    await s.set(3, "t", {})
    real_time = time.time
    monkeypatch.setattr(time, "time", lambda: real_time() + 10)
    assert await s.get(3) is None


async def test_get_token_shortcut():
    s = SessionStore(ttl_seconds=60)
    await s.set(4, "abc", {})
    assert await s.get_token(4) == "abc"
    assert await s.get_token(999) is None


async def test_ai_session_setter():
    s = SessionStore(ttl_seconds=60)
    await s.set(5, "t", {})
    await s.set_ai_session(5, "sess-1")
    sess = await s.get(5)
    assert sess and sess.ai_session_id == "sess-1"


@pytest.mark.parametrize("user_id", [1, 100, 99999])
async def test_update_user(user_id):
    s = SessionStore()
    await s.set(user_id, "t", {"name": "old"})
    await s.update_user(user_id, {"name": "new"})
    sess = await s.get(user_id)
    assert sess and sess.user["name"] == "new"
