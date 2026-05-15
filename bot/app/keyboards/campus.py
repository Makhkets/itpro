from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, pagination_row, styled_button


def buildings_kb(
    buildings: Sequence[dict[str, Any]],
    page: int,
    has_prev: bool,
    has_next: bool,
) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for b in buildings:
        name = b.get("name") or b.get("title") or "Корпус"
        kb.row(
            styled_button(
                f"🏛 {name}",
                callback_data=f"campus:building:{b.get('id')}",
            )
        )
    pg = pagination_row("campus:buildings", page, has_prev, has_next)
    if pg:
        kb.row(*pg)
    kb.row(*back_home_row())
    return kb.as_markup()


def building_detail_kb(building_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button("🪜 Этажи", callback_data=f"campus:floors:{building_id}"),
        styled_button("🚪 Аудитории", callback_data=f"campus:rooms:{building_id}:1"),
    )
    kb.row(styled_button("🧭 Маршруты", callback_data="campus:routes"))
    kb.row(*back_home_row())
    return kb.as_markup()


def floors_kb(building_id: str, floors: Sequence[dict[str, Any]]) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for f in floors:
        label = f.get("name") or f.get("number") or f.get("floor") or "Этаж"
        kb.row(
            styled_button(
                f"🪜 {label}",
                callback_data=f"campus:floor:{building_id}:{f.get('id')}",
            )
        )
    kb.row(
        styled_button("⬅️ К корпусу", callback_data=f"campus:building:{building_id}")
    )
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
