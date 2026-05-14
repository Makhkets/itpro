from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.api import NotificationsApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.common import back_home_kb, login_required_kb
from app.services.message_format import notification_card, success_text
from app.services.session_store import UserSession

router = Router(name="notifications")


def _list_kb(items: list[dict], unread_only: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for n in items[:8]:
        title = n.get("title") or "Уведомление"
        if len(title) > 40:
            title = title[:37] + "…"
        icon = "📭" if n.get("isRead") or n.get("read") else "📬"
        kb.row(
            InlineKeyboardButton(
                text=f"{icon} {title}",
                callback_data=f"notif:read:{n.get('id')}",
            )
        )
    kb.row(
        InlineKeyboardButton(
            text="📖 Только непрочитанные" if not unread_only else "📋 Все",
            callback_data=f"notif:toggle:{'all' if unread_only else 'unread'}",
        ),
        InlineKeyboardButton(text="✅ Прочитать все", callback_data="notif:read_all"),
    )
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    return kb.as_markup()


@router.callback_query(F.data == "menu:notifications")
async def cb_notifs(cb: CallbackQuery, notifications_api: NotificationsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    await _show(cb, notifications_api, session, unread_only=False)


@router.callback_query(F.data.startswith("notif:toggle:"))
async def cb_toggle(cb: CallbackQuery, notifications_api: NotificationsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    mode = (cb.data or "").split(":")[-1]
    await _show(cb, notifications_api, session, unread_only=(mode == "unread"))


async def _show(
    cb: CallbackQuery,
    notifications_api: NotificationsApi,
    session: UserSession,
    unread_only: bool,
) -> None:
    try:
        items = await notifications_api.list(session.token, unread_only=unread_only)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not items:
        await safe_edit(
            cb,
            "🔵 Уведомлений нет." if not unread_only else "🟢 Все уведомления прочитаны.",
            back_home_kb(),
        )
        return
    lines = ["🔔 <b>Уведомления</b>", ""]
    for n in items[:5]:
        lines.append(notification_card(n))
        lines.append("")
    await safe_edit(cb, "\n".join(lines).strip(), _list_kb(items, unread_only))


@router.callback_query(F.data.startswith("notif:read:"))
async def cb_read(cb: CallbackQuery, notifications_api: NotificationsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    nid = (cb.data or "").split(":")[-1]
    try:
        await notifications_api.mark_read(session.token, nid)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await cb.answer("Отмечено как прочитанное", show_alert=False)
    await _show(cb, notifications_api, session, unread_only=False)


@router.callback_query(F.data == "notif:read_all")
async def cb_read_all(cb: CallbackQuery, notifications_api: NotificationsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    try:
        await notifications_api.mark_all_read(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, success_text("Все уведомления прочитаны."), back_home_kb())
