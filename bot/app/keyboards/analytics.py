from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, styled_button


def analytics_menu_kb(role: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if role == "student":
        kb.row(styled_button("📈 Моя посещаемость", callback_data="analytics:my", style="success"))
    if role in {"teacher", "admin"}:
        kb.row(styled_button("👥 Студенты и риски", callback_data="analytics:students"))
    if role == "admin":
        kb.row(styled_button("📊 Сводка кампуса", callback_data="analytics:summary"))
    kb.row(styled_button("📋 Правила допуска", callback_data="analytics:policy"))
    kb.row(*back_home_row())
    return kb.as_markup()


def analytics_back_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("📊 Аналитика", callback_data="menu:analytics"))
    kb.row(*back_home_row())
    return kb.as_markup()
