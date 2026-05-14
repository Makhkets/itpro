from __future__ import annotations

from typing import Any

from app.api.campus import _as_list
from app.api.client import ApiClient


class LibraryApi:
    def __init__(self, client: ApiClient) -> None:
        self._client = client

    async def search_books(
        self,
        token: str | None = None,
        q: str | None = None,
        author: str | None = None,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/library/books/search",
            token=token,
            params={"q": q, "author": author, "category": category},
        )
        return _as_list(data)

    async def get_book(self, book_id: str, token: str | None = None) -> dict[str, Any]:
        return await self._client.get(f"/library/books/{book_id}", token=token)

    async def create_book(
        self,
        token: str,
        title: str,
        total_copies: int,
        available_copies: int,
        author: str | None = None,
        isbn: str | None = None,
        category: str | None = None,
        description: str | None = None,
        location: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "title": title,
            "totalCopies": total_copies,
            "availableCopies": available_copies,
        }
        if author is not None:
            payload["author"] = author
        if isbn is not None:
            payload["isbn"] = isbn
        if category is not None:
            payload["category"] = category
        if description is not None:
            payload["description"] = description
        if location is not None:
            payload["location"] = location
        return await self._client.post("/library/books", token=token, json=payload)

    async def update_book(
        self,
        token: str,
        book_id: str,
        title: str,
        total_copies: int,
        available_copies: int,
        author: str | None = None,
        isbn: str | None = None,
        category: str | None = None,
        description: str | None = None,
        location: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "title": title,
            "totalCopies": total_copies,
            "availableCopies": available_copies,
        }
        if author is not None:
            payload["author"] = author
        if isbn is not None:
            payload["isbn"] = isbn
        if category is not None:
            payload["category"] = category
        if description is not None:
            payload["description"] = description
        if location is not None:
            payload["location"] = location
        return await self._client.patch(
            f"/library/books/{book_id}", token=token, json=payload
        )

    async def borrow_book(
        self,
        token: str,
        book_id: str,
        due_at: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] | None = None
        if due_at:
            payload = {"dueAt": due_at}
        return await self._client.post(
            f"/library/books/{book_id}/borrow",
            token=token,
            json=payload,
        )

    async def my_loans(self, token: str) -> list[dict[str, Any]]:
        data = await self._client.get("/library/loans/my", token=token)
        return _as_list(data)

    async def list_loans(
        self,
        token: str,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        data = await self._client.get(
            "/library/loans",
            token=token,
            params={"status": status},
        )
        return _as_list(data)

    async def create_loan(
        self,
        token: str,
        book_id: str,
        user_id: str,
        due_at: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"bookId": book_id, "userId": user_id}
        if due_at:
            payload["dueAt"] = due_at
        return await self._client.post(
            "/library/loans",
            token=token,
            json=payload,
        )

    async def return_loan(self, token: str, loan_id: str) -> dict[str, Any]:
        return await self._client.patch(
            f"/library/loans/{loan_id}/return",
            token=token,
        )
