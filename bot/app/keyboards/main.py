from __future__ import annotations

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import styled_button


def main_menu_kb(authorized: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if authorized:
        kb.row(
            styled_button("🏛 Кампус", callback_data="menu:campus"),
            styled_button("📅 Расписание", callback_data="menu:schedule"),
        )
        kb.row(
            styled_button("🚪 Аудитории", callback_data="menu:rooms"),
            styled_button("📌 Бронирования", callback_data="menu:bookings"),
        )
        kb.row(
            styled_button("🤖 AI-ассистент", callback_data="menu:ai"),
            styled_button("❓ FAQ", callback_data="menu:faq"),
        )
        kb.row(
            styled_button("📚 Библиотека", callback_data="menu:library"),
            styled_button("🔔 Уведомления", callback_data="menu:notifications"),
        )
        kb.row(
            styled_button("📊 Аналитика", callback_data="menu:analytics"),
            styled_button("👤 Профиль", callback_data="menu:profile"),
        )
        kb.row(
            styled_button("⚙️ Настройки", callback_data="menu:settings"),
        )
        kb.row(styled_button("🚪 Выйти", callback_data="profile:logout", style="danger"))
    else:
        kb.row(
            styled_button("🔑 Войти", callback_data="auth:login", style="success"),
            styled_button("🆕 Регистрация", callback_data="auth:register", style="success"),
        )
        kb.row(
            styled_button("❓ FAQ абитуриента", callback_data="menu:faq"),
            styled_button("🏛 Кампус", callback_data="menu:campus"),
        )
        kb.row(styled_button("ℹ️ О проекте", callback_data="menu:about"))
    return kb.as_markup()
