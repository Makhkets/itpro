from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, styled_button


def ai_menu_kb(has_session: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="💬 Задать вопрос", callback_data="ai:ask"))
    if has_session:
        kb.row(
            InlineKeyboardButton(text="🔄 Продолжить", callback_data="ai:continue"),
            InlineKeyboardButton(text="🆕 Новый чат", callback_data="ai:new"),
        )
    kb.row(InlineKeyboardButton(text="🗂 История", callback_data="ai:history"))
    kb.row(*back_home_row())
    return kb.as_markup()


def ai_after_answer_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        InlineKeyboardButton(text="💬 Продолжить диалог", callback_data="ai:ask"),
        InlineKeyboardButton(text="🆕 Новый чат", callback_data="ai:new"),
    )
    kb.row(
        InlineKeyboardButton(text="📅 Открыть расписание", callback_data="menu:schedule"),
        InlineKeyboardButton(text="🚪 Найти аудиторию", callback_data="menu:rooms"),
    )
    kb.row(*back_home_row())
    return kb.as_markup()


def ai_history_kb(sessions: Sequence[dict[str, Any]]) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for s in sessions[:10]:
        sid = s.get("id")
        if not sid:
            continue
        title = s.get("title") or s.get("firstMessage") or str(sid)
        if isinstance(title, str) and len(title) > 35:
            title = title[:32] + "…"
        kb.row(
            InlineKeyboardButton(text=f"📖 {title}", callback_data=f"ai:session:{sid}"),
            styled_button("🗑", callback_data=f"ai:session:delete:{sid}", style="danger"),
        )
    kb.row(InlineKeyboardButton(text="⬅️ К AI", callback_data="menu:ai"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


def ai_session_view_kb(session_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button(
            "💬 Продолжить",
            callback_data=f"ai:session:resume:{session_id}",
            style="success",
        ),
        styled_button(
            "🗑 Удалить",
            callback_data=f"ai:session:delete:{session_id}",
            style="danger",
        ),
    )
    kb.row(InlineKeyboardButton(text="⬅️ К истории", callback_data="ai:history"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
