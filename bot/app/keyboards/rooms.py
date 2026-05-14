from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, pagination_row


def rooms_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="🔎 Поиск аудитории", callback_data="rooms:search"))
    kb.row(*back_home_row())
    return kb.as_markup()


def rooms_list_kb(rooms: Sequence[dict[str, Any]], page: int, has_prev: bool, has_next: bool, prefix: str = "rooms:list") -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for r in rooms:
        label = r.get("number") or r.get("name") or "Аудитория"
        kb.row(
            InlineKeyboardButton(
                text=f"🚪 {label}",
                callback_data=f"rooms:view:{r.get('id')}",
            )
        )
    pg = pagination_row(prefix, page, has_prev, has_next)
    if pg:
        kb.row(*pg)
    kb.row(*back_home_row())
    return kb.as_markup()


def room_detail_kb(room_id: str, authorized: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        InlineKeyboardButton(text="🧭 Навигация", callback_data=f"rooms:nav:{room_id}"),
        InlineKeyboardButton(text="📅 Расписание", callback_data=f"rooms:sched:{room_id}"),
    )
    if authorized:
        kb.row(
            InlineKeyboardButton(text="🕒 Свободные окна", callback_data=f"rooms:avail:{room_id}"),
            InlineKeyboardButton(text="📌 Забронировать", callback_data=f"rooms:book:{room_id}"),
        )
    kb.row(*back_home_row())
    return kb.as_markup()
