from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, pagination_row, styled_button


def bookings_menu_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button("📋 Все", callback_data="bookings:filter:all:1"),
        styled_button("🟡 Ожидают", callback_data="bookings:filter:pending:1"),
    )
    kb.row(
        styled_button("🟢 Подтверждённые", callback_data="bookings:filter:approved:1", style="success"),
        styled_button("🔴 Отклонённые", callback_data="bookings:filter:rejected:1", style="danger"),
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
            styled_button(
                f"{emoji} {title}",
                callback_data=f"bookings:view:{b.get('id')}",
            )
        )
    pg = pagination_row(f"bookings:filter:{filter_key}", page, has_prev, has_next)
    if pg:
        kb.row(*pg)
    kb.row(styled_button("⬅️ Фильтры", callback_data="menu:bookings"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def booking_detail_kb(booking_id: str, status: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if status == "pending":
        kb.row(
            styled_button(
                "❌ Отменить",
                callback_data=f"bookings:cancel:{booking_id}",
                style="danger",
            )
        )
    kb.row(styled_button("⬅️ К списку", callback_data="bookings:filter:all:1"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def booking_confirm_kb(room_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button("✅ Подтвердить", callback_data="bookings:create:confirm", style="success"),
        styled_button("❌ Отмена", callback_data=f"rooms:view:{room_id}", style="danger"),
    )
    return kb.as_markup()
