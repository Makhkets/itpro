import pytest
from aioresponses import aioresponses

from app.api.ai import AIApi
from app.api.client import ApiClient

BASE = "http://api.test/api/v1"


@pytest.fixture
async def api():
    c = ApiClient(BASE, timeout_seconds=5)
    await c.start()
    try:
        yield AIApi(c), c
    finally:
        await c.close()


async def test_chat_sends_message_and_session(api):
    ai, _c = api
    with aioresponses() as m:
        m.post(
            f"{BASE}/ai/chat",
            payload={"sessionId": "s1", "answer": "ok", "sources": []},
        )
        result = await ai.chat(token="t", message="hi", session_id="s1")
        assert result["sessionId"] == "s1"
        req = list(m.requests.values())[0][0]
        assert req.kwargs["json"] == {"message": "hi", "sessionId": "s1"}


async def test_chat_without_session(api):
    ai, _c = api
    with aioresponses() as m:
        m.post(f"{BASE}/ai/chat", payload={"sessionId": "new", "answer": "a"})
        await ai.chat(token="t", message="hi")
        req = list(m.requests.values())[0][0]
        assert "sessionId" not in req.kwargs["json"]
