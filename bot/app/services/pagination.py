from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

T = TypeVar("T")


@dataclass
class Page(Generic[T]):
    items: Sequence[T]
    page: int
    page_size: int
    total: int

    @property
    def total_pages(self) -> int:
        if self.page_size <= 0:
            return 1
        return max(1, (self.total + self.page_size - 1) // self.page_size)

    @property
    def has_prev(self) -> bool:
        return self.page > 1

    @property
    def has_next(self) -> bool:
        return self.page < self.total_pages


def paginate(items: Sequence[T], page: int, page_size: int = 5) -> Page[T]:
    page = max(1, page)
    page_size = max(1, page_size)
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return Page(items=list(items[start:end]), page=page, page_size=page_size, total=total)
