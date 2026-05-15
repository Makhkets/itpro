from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import styled_button


def auth_cancel_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("❌ Отмена", callback_data="auth:cancel", style="danger"))
    return kb.as_markup()


def post_login_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def auth_start_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🔑 Войти", callback_data="auth:login", style="success"))
    kb.row(styled_button("🆕 Регистрация", callback_data="auth:register", style="success"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def role_choice_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button("🎓 Студент", callback_data="register:role:student"),
        styled_button("👨‍🏫 Преподаватель", callback_data="register:role:teacher"),
    )
    kb.row(
        styled_button("📝 Абитуриент", callback_data="register:role:applicant"),
        styled_button("📚 Библиотекарь", callback_data="register:role:librarian"),
    )
    kb.row(styled_button("❌ Отмена", callback_data="auth:cancel", style="danger"))
    return kb.as_markup()


def skip_or_cancel_kb(skip_cb: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("⏭ Пропустить", callback_data=skip_cb))
    kb.row(styled_button("❌ Отмена", callback_data="auth:cancel", style="danger"))
    return kb.as_markup()
