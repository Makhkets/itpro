import pytest

from app.bot import normalize_proxy_url


def test_normalize_proxy_url_keeps_full_url():
    proxy = "http://user:pass@127.0.0.1:8080"
    assert normalize_proxy_url(proxy) == proxy


def test_normalize_proxy_url_accepts_compact_http_proxy():
    assert (
        normalize_proxy_url("127.0.0.1:8080:user:pa ss")
        == "http://user:pa%20ss@127.0.0.1:8080"
    )


def test_normalize_proxy_url_empty():
    assert normalize_proxy_url("") == ""


def test_normalize_proxy_url_rejects_invalid_compact_proxy():
    with pytest.raises(ValueError):
        normalize_proxy_url("127.0.0.1:8080")
