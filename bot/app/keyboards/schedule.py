from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row


def schedule_menu_kb(has_group: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if has_group:
        kb.row(InlineKeyboardButton(text="📅 Моё расписание", callback_data="schedule:mine"))
    kb.row(InlineKeyboardButton(text="🔎 Расписание группы", callback_data="schedule:group"))
    kb.row(InlineKeyboardButton(text="⏰ Сейчас / следующая пара", callback_data="schedule:current"))
    kb.row(*back_home_row())
    return kb.as_markup()
