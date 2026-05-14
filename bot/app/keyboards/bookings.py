from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, pagination_row


def bookings_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        InlineKeyboardButton(text="📋 Все", callback_data="bookings:filter:all:1"),
        InlineKeyboardButton(text="🟡 Ожидают", callback_data="bookings:filter:pending:1"),
    )
    kb.row(
        InlineKeyboardButton(text="🟢 Подтверждённые", callback_data="bookings:filter:approved:1"),
        InlineKeyboardButton(text="🔴 Отклонённые", callback_data="bookings:filter:rejected:1"),
    )
    kb.row(*back_home_row())
    return kb.as_markup()


def bookings_list_kb(
    bookings: Sequence[dict[str, Any]],
    page: int,
    has_prev: bool,
    has_next: bool,
    filter_key: str = "all",
) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for b in bookings:
        title = b.get("title") or "Бронирование"
        status = b.get("status") or ""
        emoji = {"approved": "🟢", "pending": "🟡", "rejected": "🔴", "cancelled": "⚪"}.get(status, "📌")
        kb.row(
            InlineKeyboardButton(
                text=f"{emoji} {title}",
                callback_data=f"bookings:view:{b.get('id')}",
            )
        )
    pg = pagination_row(f"bookings:filter:{filter_key}", page, has_prev, has_next)
    if pg:
        kb.row(*pg)
    kb.row(InlineKeyboardButton(text="⬅️ Фильтры", callback_data="menu:bookings"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def booking_detail_kb(booking_id: str, status: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if status == "pending":
        kb.row(
            InlineKeyboardButton(
                text="❌ Отменить",
                callback_data=f"bookings:cancel:{booking_id}",
            )
        )
    kb.row(InlineKeyboardButton(text="⬅️ К списку", callback_data="bookings:filter:all:1"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def booking_confirm_kb(room_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        InlineKeyboardButton(text="✅ Подтвердить", callback_data="bookings:create:confirm"),
        InlineKeyboardButton(text="❌ Отмена", callback_data=f"rooms:view:{room_id}"),
    )
    return kb.as_markup()
