from __future__ import annotations

from typing import Any, Literal

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

ButtonStyleName = Literal["standard", "primary", "success", "danger"]

_STYLE_ALIASES: dict[str, str] = {
    "standard": "primary",
    "primary": "primary",
    "success": "success",
    "danger": "danger",
}


def styled_button(
    text: str,
    *,
    callback_data: str | None = None,
    url: str | None = None,
    style: ButtonStyleName | None = None,
) -> InlineKeyboardButton:
    """InlineKeyboardButton with Bot API colors and a `standard` alias.

    Telegram Bot API calls the blue standard button `primary`; the alias keeps
    keyboard code closer to product language. Keep style explicit so neutral
    navigation and list buttons don't become visually loud by default. Falls
    back gracefully if aiogram doesn't accept the kwarg.
    """
    kwargs: dict[str, Any] = {"text": text}
    if callback_data is not None:
        kwargs["callback_data"] = callback_data
    if url is not None:
        kwargs["url"] = url
    if style is not None:
        try:
            return InlineKeyboardButton(**kwargs, style=_STYLE_ALIASES.get(style, style))
        except (TypeError, ValueError):
            pass
    return InlineKeyboardButton(**kwargs)


def back_home_row() -> list[InlineKeyboardButton]:
    return [
        styled_button("⬅️ Назад", callback_data="nav:back"),
        styled_button("🏠 Главное меню", callback_data="menu:home"),
    ]


def home_only() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
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
            styled_button("◀️", callback_data=f"{prefix}:page:{page - 1}")
        )
    buttons.append(styled_button(f"· {page} ·", callback_data="noop"))
    if has_next:
        buttons.append(
            styled_button("▶️", callback_data=f"{prefix}:page:{page + 1}")
        )
    return buttons


def retry_kb(retry_cb: str = "noop") -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🔄 Повторить", callback_data=retry_cb, style="success"))
    kb.row(*back_home_row())
    return kb.as_markup()


def login_required_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("🔑 Войти", callback_data="auth:login", style="success"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def consent_required_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button(
            "✅ Дать согласие",
            callback_data="profile:consent:yes",
            style="success",
        )
    )
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
