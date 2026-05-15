from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, styled_button


def schedule_menu_kb(has_group: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if has_group:
        kb.row(styled_button("📅 Моё расписание", callback_data="schedule:mine", style="success"))
    kb.row(styled_button("🔎 Расписание группы", callback_data="schedule:group", style="standard"))
    kb.row(styled_button("⏰ Сейчас / следующая пара", callback_data="schedule:current", style="standard"))
    kb.row(*back_home_row())
    return kb.as_markup()
