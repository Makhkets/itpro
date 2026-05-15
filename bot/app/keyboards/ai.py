from __future__ import annotations

from typing import Any, Sequence

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, styled_button


def ai_menu_kb(has_session: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(styled_button("💬 Задать вопрос", callback_data="ai:ask", style="success"))
    if has_session:
        kb.row(
            styled_button("🔄 Продолжить", callback_data="ai:continue", style="success"),
            styled_button("🆕 Новый чат", callback_data="ai:new"),
        )
    kb.row(styled_button("🗂 История", callback_data="ai:history"))
    kb.row(*back_home_row())
    return kb.as_markup()


def ai_after_answer_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.row(
        styled_button("💬 Продолжить диалог", callback_data="ai:ask", style="success"),
        styled_button("🆕 Новый чат", callback_data="ai:new"),
    )
    kb.row(
        styled_button("📅 Открыть расписание", callback_data="menu:schedule"),
        styled_button("🚪 Найти аудиторию", callback_data="menu:rooms"),
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
            styled_button(f"📖 {title}", callback_data=f"ai:session:{sid}"),
            styled_button("🗑", callback_data=f"ai:session:delete:{sid}", style="danger"),
        )
    kb.row(styled_button("⬅️ К AI", callback_data="menu:ai"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
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
    kb.row(styled_button("⬅️ К истории", callback_data="ai:history"))
    kb.row(styled_button("🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()
