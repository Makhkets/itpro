from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import styled_button


def main_menu_kb(authorized: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if authorized:
        kb.row(
            InlineKeyboardButton(text="🏛 Кампус", callback_data="menu:campus"),
            InlineKeyboardButton(text="📅 Расписание", callback_data="menu:schedule"),
        )
        kb.row(
            InlineKeyboardButton(text="🚪 Аудитории", callback_data="menu:rooms"),
            InlineKeyboardButton(text="📌 Бронирования", callback_data="menu:bookings"),
        )
        kb.row(
            InlineKeyboardButton(text="🤖 AI-ассистент", callback_data="menu:ai"),
            InlineKeyboardButton(text="❓ FAQ", callback_data="menu:faq"),
        )
        kb.row(
            InlineKeyboardButton(text="📚 Библиотека", callback_data="menu:library"),
            InlineKeyboardButton(text="🔔 Уведомления", callback_data="menu:notifications"),
        )
        kb.row(
            InlineKeyboardButton(text="👤 Профиль", callback_data="menu:profile"),
            InlineKeyboardButton(text="⚙️ Настройки", callback_data="menu:settings"),
        )
        kb.row(styled_button("🚪 Выйти", callback_data="profile:logout", style="danger"))
    else:
        kb.row(
            styled_button("🔑 Войти", callback_data="auth:login", style="success"),
            InlineKeyboardButton(text="🆕 Регистрация", callback_data="auth:register"),
        )
        kb.row(
            InlineKeyboardButton(text="❓ FAQ абитуриента", callback_data="menu:faq"),
            InlineKeyboardButton(text="🏛 Кампус", callback_data="menu:campus"),
        )
        kb.row(InlineKeyboardButton(text="ℹ️ О проекте", callback_data="menu:about"))
    return kb.as_markup()
