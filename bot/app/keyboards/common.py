from __future__ import annotations

from typing import Any

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def styled_button(
    text: str,
    *,
    callback_data: str | None = None,
    url: str | None = None,
    style: str | None = None,
) -> InlineKeyboardButton:
    """InlineKeyboardButton with optional `style` (success/danger).

    Falls back gracefully if running against an aiogram build that doesn't
    accept the kwarg, so older Telegram clients still see a regular button.
    """
    kwargs: dict[str, Any] = {"text": text}
    if callback_data is not None:
        kwargs["callback_data"] = callback_data
    if url is not None:
        kwargs["url"] = url
    if style is not None:
        try:
            return InlineKeyboardButton(**kwargs, style=style)
        except TypeError:
            pass
    return InlineKeyboardButton(**kwargs)


def back_home_row() -> list[InlineKeyboardButton]:
    return [
        InlineKeyboardButton(text="⬅️ Назад", callback_data="nav:back"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"),
    ]


def home_only() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def back_home_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(*back_home_row())
    return kb.as_markup()


def pagination_row(
    prefix: str,
    page: int,
    has_prev: bool,
    has_next: bool,
) -> list[InlineKeyboardButton]:
    buttons: list[InlineKeyboardButton] = []
    if has_prev:
        buttons.append(
            InlineKeyboardButton(text="◀️", callback_data=f"{prefix}:page:{page - 1}")
        )
    buttons.append(InlineKeyboardButton(text=f"· {page} ·", callback_data="noop"))
    if has_next:
        buttons.append(
            InlineKeyboardButton(text="▶️", callback_data=f"{prefix}:page:{page + 1}")
        )
    return buttons


def retry_kb(retry_cb: str = "noop") -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="🔄 Повторить", callback_data=retry_cb))
    kb.row(*back_home_row())
    return kb.as_markup()


def login_required_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🔑 Войти", callback_data="auth:login", style="success"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def consent_required_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("✅ Дать согласие", callback_data="profile:consent:yes", style="success"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
