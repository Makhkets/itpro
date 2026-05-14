from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, pagination_row


def faq_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="📋 Все вопросы", callback_data="faq:list:1"))
    kb.row(InlineKeyboardButton(text="🔎 Поиск", callback_data="faq:search"))
    kb.row(*back_home_row())
    return kb.as_markup()


def faq_list_kb(items: Sequence[dict[str, Any]], page: int, has_prev: bool, has_next: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for f in items:
        text = f.get("question") or f.get("title") or "—"
        if len(text) > 50:
            text = text[:47] + "…"
        kb.row(
            InlineKeyboardButton(
                text=f"❓ {text}",
                callback_data=f"faq:view:{f.get('id')}",
            )
        )
    pg = pagination_row("faq:list", page, has_prev, has_next)
    if pg:
        kb.row(*pg)
    kb.row(InlineKeyboardButton(text="⬅️ К FAQ", callback_data="menu:faq"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
