from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str = "",
        message: str = "",
        details: dict[str, Any] | None = None,
    ) -> None:
        self.status = status
        self.code = code
        self.message = message or f"HTTP {status}"
        self.details = details or {}
        super().__init__(f"[{status}] {self.code}: {self.message}")


class AuthRequired(ApiError):
    pass


class Forbidden(ApiError):
    pass


class ApiUnavailable(ApiError):
    pass


class ApiClient:
    """Thin async REST client for SmartCampus backend."""

    def __init__(self, base_url: str, timeout_seconds: int = 15) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = aiohttp.ClientTimeout(total=timeout_seconds)
        self._session: aiohttp.ClientSession | None = None

    async def start(self) -> None:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self._timeout)

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    @property
    def session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            raise RuntimeError("ApiClient is not started")
        return self._session

    def _url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        return f"{self._base_url}/{path.lstrip('/')}"

    async def request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        params: dict[str, Any] | None = None,
        json: Any | None = None,
    ) -> Any:
        headers: dict[str, str] = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        cleaned_params: dict[str, Any] | None = None
        if params:
            cleaned_params = {k: v for k, v in params.items() if v is not None and v != ""}

        url = self._url(path)
        logger.debug("API %s %s", method, url)

        try:
            async with self.session.request(
                method,
                url,
                params=cleaned_params,
                json=json,
                headers=headers,
            ) as resp:
                body: Any = None
                text = await resp.text()
                if text:
                    try:
                        body = await self._parse_json(text)
                    except ValueError:
                        body = {"raw": text}

                if resp.status == 401:
                    raise AuthRequired(
                        401, *_extract_error(body, "Authentication required")
                    )
                if resp.status == 403:
                    raise Forbidden(
                        403, *_extract_error(body, "Forbidden")
                    )
                if resp.status >= 500:
                    raise ApiUnavailable(
                        resp.status,
                        *_extract_error(body, "Backend unavailable"),
                    )
                if resp.status >= 400:
                    code, msg, details = _extract_error_full(body, f"HTTP {resp.status}")
                    raise ApiError(resp.status, code, msg, details)

                return body
        except (asyncio.TimeoutError, aiohttp.ClientConnectorError) as e:
            logger.warning("API connection error %s %s: %s", method, url, e)
            raise ApiUnavailable(503, "network_error", "Backend is unreachable") from e
        except aiohttp.ClientError as e:
            logger.warning("API client error %s %s: %s", method, url, e)
            raise ApiUnavailable(503, "client_error", str(e)) from e

    @staticmethod
    async def _parse_json(text: str) -> Any:
        import json as _json
        return _json.loads(text)

    async def get(self, path: str, *, token: str | None = None, params: dict | None = None) -> Any:
        return await self.request("GET", path, token=token, params=params)

    async def post(self, path: str, *, token: str | None = None, json: Any = None) -> Any:
        return await self.request("POST", path, token=token, json=json)

    async def patch(self, path: str, *, token: str | None = None, json: Any = None) -> Any:
        return await self.request("PATCH", path, token=token, json=json)

    async def delete(self, path: str, *, token: str | None = None) -> Any:
        return await self.request("DELETE", path, token=token)


def _extract_error(body: Any, default_msg: str) -> tuple[str, str]:
    code, msg, _ = _extract_error_full(body, default_msg)
    return code, msg


def _extract_error_full(body: Any, default_msg: str) -> tuple[str, str, dict[str, Any]]:
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):
            return (
                str(err.get("code") or ""),
                str(err.get("message") or default_msg),
                dict(err.get("details") or {}),
            )
        if "message" in body:
            return "", str(body["message"]), {}
    return "", default_msg, {}
