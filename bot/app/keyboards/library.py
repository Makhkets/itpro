from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import ButtonStyleName, back_home_row, pagination_row, styled_button


def library_menu_kb(authorized: bool, role: str | None = None) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🔎 Поиск книг", callback_data="library:search", style="standard"))
    if authorized:
        kb.row(styled_button("📖 Мои выдачи", callback_data="library:my"))
        if (role or "").lower() in {"librarian", "admin"}:
            kb.row(styled_button("📚 Все выдачи", callback_data="library:loans"))
    kb.row(*back_home_row())
    return kb.as_markup()


def books_list_kb(
    books: Sequence[dict[str, Any]],
    page: int,
    has_prev: bool,
    has_next: bool,
) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for b in books:
        title = b.get("title") or "Книга"
        if len(title) > 45:
            title = title[:42] + "…"
        kb.row(
            styled_button(f"📖 {title}", callback_data=f"library:view:{b.get('id')}")
        )
    pg = pagination_row("library:results", page, has_prev, has_next)
    if pg:
        kb.row(*pg)
    kb.row(styled_button("⬅️ К библиотеке", callback_data="menu:library"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def book_view_kb(
    book_id: str,
    *,
    can_borrow: bool,
    available: bool,
) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if can_borrow and available:
        kb.row(
            styled_button(
                "📥 Взять книгу",
                callback_data=f"library:borrow:{book_id}",
                style="success",
            )
        )
    kb.row(styled_button("⬅️ К библиотеке", callback_data="menu:library"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def loans_admin_list_kb(
    loans: Sequence[dict[str, Any]],
    status: str | None,
) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    statuses = [("active", "🟢 Активные"), ("overdue", "🔴 Просрочка"), ("returned", "⚪ Возвращ.")]
    row = []
    for s, label in statuses:
        text = ("• " + label) if status == s else label
        style: ButtonStyleName = (
            "success" if s == "active" else "danger" if s == "overdue" else "standard"
        )
        row.append(styled_button(text, callback_data=f"library:loans:filter:{s}", style=style))
    kb.row(*row)
    if status:
        kb.row(styled_button("🧹 Сброс фильтра", callback_data="library:loans:filter:all"))
    for ln in loans[:10]:
        book = ln.get("book") or {}
        title = book.get("title") or ln.get("bookTitle") or "Выдача"
        if len(title) > 35:
            title = title[:32] + "…"
        st = (ln.get("status") or "").lower()
        if st == "active" or st == "overdue":
            kb.row(
                styled_button(
                    f"↩️ Вернуть: {title}",
                    callback_data=f"library:return:{ln.get('id')}",
                    style="success",
                )
            )
    kb.row(styled_button("⬅️ К библиотеке", callback_data="menu:library"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
