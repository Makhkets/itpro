from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import styled_button


def auth_cancel_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("❌ Отмена", callback_data="auth:cancel", style="danger"))
    return kb.as_markup()


def post_login_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def auth_start_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🔑 Войти", callback_data="auth:login", style="success"))
    kb.row(InlineKeyboardButton(text="🆕 Регистрация", callback_data="auth:register"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def role_choice_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        InlineKeyboardButton(text="🎓 Студент", callback_data="register:role:student"),
        InlineKeyboardButton(text="👨‍🏫 Преподаватель", callback_data="register:role:teacher"),
    )
    kb.row(
        InlineKeyboardButton(text="📝 Абитуриент", callback_data="register:role:applicant"),
        InlineKeyboardButton(text="📚 Библиотекарь", callback_data="register:role:librarian"),
    )
    kb.row(styled_button("❌ Отмена", callback_data="auth:cancel", style="danger"))
    return kb.as_markup()


def skip_or_cancel_kb(skip_cb: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="⏭ Пропустить", callback_data=skip_cb))
    kb.row(styled_button("❌ Отмена", callback_data="auth:cancel", style="danger"))
    return kb.as_markup()
