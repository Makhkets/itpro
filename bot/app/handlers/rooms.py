from __future__ import annotations

from datetime import date

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import CampusApi, RoomsApi, ScheduleApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.common import back_home_kb, login_required_kb
from app.keyboards.rooms import room_detail_kb, rooms_list_kb
from app.services.message_format import (
    esc,
    fmt_time,
    room_card,
    schedule_item,
)
from app.services.session_store import UserSession
from app.states.search import RoomSearch

router = Router(name="rooms")

PAGE_SIZE = 5


@router.callback_query(F.data == "rooms:search")
async def cb_rooms_search(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(RoomSearch.waiting_query)
    await safe_edit(
        cb,
        "🔎 Введите номер или название аудитории, например <code>305</code> или <code>A-305</code>:",
        back_home_kb(),
    )


@router.message(RoomSearch.waiting_query)
async def on_search_query(
    message: Message,
    state: FSMContext,
    rooms_api: RoomsApi,
    session: UserSession | None,
) -> None:
    q = (message.text or "").strip()
    if not q:
        await message.answer("Введите запрос, например <code>305</code>.", parse_mode="HTML")
        return

    await state.clear()
    try:
        rooms = await rooms_api.search(token=session.token if session else None, q=q)
    except Exception as e:
        await handle_api_error(message, e)
        return

    if not rooms:
        await message.answer(
            f"🔵 По запросу <b>{esc(q)}</b> ничего не найдено.",
            reply_markup=back_home_kb(),
            parse_mode="HTML",
        )
        return

    if len(rooms) == 1:
        await _show_room(message, rooms_api, rooms[0]["id"], session)
        return

    lines = [f"🔎 По запросу <b>{esc(q)}</b> найдено: <b>{len(rooms)}</b>"]
    await message.answer(
        "\n".join(lines),
        reply_markup=rooms_list_kb(rooms[:PAGE_SIZE], page=1, has_prev=False, has_next=len(rooms) > PAGE_SIZE),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("rooms:view:"))
async def cb_room_view(cb: CallbackQuery, rooms_api: RoomsApi, session: UserSession | None) -> None:
    room_id = (cb.data or "").split(":")[-1]
    try:
        room = await rooms_api.get(room_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(
        cb,
        room_card(room),
        room_detail_kb(room_id, authorized=session is not None),
    )


async def _show_room(message: Message, rooms_api: RoomsApi, room_id: str, session: UserSession | None) -> None:
    try:
        room = await rooms_api.get(room_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(message, e)
        return
    await message.answer(
        room_card(room),
        reply_markup=room_detail_kb(room_id, authorized=session is not None),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("rooms:nav:"))
async def cb_room_nav(cb: CallbackQuery, campus_api: CampusApi, session: UserSession | None) -> None:
    room_id = (cb.data or "").split(":")[-1]
    try:
        nav = await campus_api.room_navigation(room_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return

    hint = nav.get("navigationHint") or nav.get("hint") or "Маршрут пока не описан."
    landmarks = nav.get("nearbyLandmarks") or nav.get("landmarks") or []
    lines = ["🧭 <b>Навигация</b>", "", esc(hint)]
    if landmarks:
        lines.append("")
        lines.append("<b>Ориентиры:</b>")
        for lm in landmarks[:5]:
            if isinstance(lm, dict):
                lines.append(f"• {esc(lm.get('name') or lm.get('title'))}")
            else:
                lines.append(f"• {esc(lm)}")

    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
    from aiogram.utils.keyboard import InlineKeyboardBuilder

    kb = InlineKeyboardBuilder()
    kb.row(
        InlineKeyboardButton(text="⬅️ К аудитории", callback_data=f"rooms:view:{room_id}"),
        InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"),
    )
    await safe_edit(cb, "\n".join(lines), kb.as_markup())


@router.callback_query(F.data.startswith("rooms:sched:"))
async def cb_room_schedule(cb: CallbackQuery, schedule_api: ScheduleApi, session: UserSession | None) -> None:
    room_id = (cb.data or "").split(":")[-1]
    try:
        items = await schedule_api.room_schedule(room_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return

    if not items:
        from aiogram.types import InlineKeyboardButton
        from aiogram.utils.keyboard import InlineKeyboardBuilder

        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="⬅️ К аудитории", callback_data=f"rooms:view:{room_id}"))
        kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
        await safe_edit(cb, "🔵 Занятий не запланировано.", kb.as_markup())
        return

    lines = ["📅 <b>Расписание аудитории</b>"]
    for s in items[:8]:
        lines.append("")
        lines.append(schedule_item(s))

    from aiogram.types import InlineKeyboardButton
    from aiogram.utils.keyboard import InlineKeyboardBuilder

    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="⬅️ К аудитории", callback_data=f"rooms:view:{room_id}"))
    kb.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu:home"))
    await safe_edit(cb, "\n".join(lines), kb.as_markup())


@router.callback_query(F.data.startswith("rooms:avail:"))
async def cb_room_avail(cb: CallbackQuery, rooms_api: RoomsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите, чтобы видеть доступные окна.", login_required_kb())
        return
    room_id = (cb.data or "").split(":")[-1]
    today = date.today().isoformat()
    try:
        data = await rooms_api.availability(room_id, date=today, token=session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return

    slots = data.get("slots") or data.get("availability") or []
    if not slots:
        from aiogram.types import InlineKeyboardButton
        from aiogram.utils.keyboard import InlineKeyboardBuilder

        kb = InlineKeyboardBuilder()
        kb.row(InlineKeyboardButton(text="📌 Забронировать", callback_data=f"rooms:book:{room_id}"))
        kb.row(InlineKeyboardButton(text="⬅️ К аудитории", callback_data=f"rooms:view:{room_id}"))
        await safe_edit(cb, "🔵 Свободных окон нет.", kb.as_markup())
        return

    lines = [f"🕒 <b>Свободные окна на {today}</b>", ""]
    for s in slots[:12]:
        start = fmt_time(s.get("from") or s.get("startsAt"))
        end = fmt_time(s.get("to") or s.get("endsAt"))
        emoji = "🟢" if s.get("available", True) else "🔴"
        lines.append(f"{emoji} {start} — {end}")

    from aiogram.types import InlineKeyboardButton
    from aiogram.utils.keyboard import InlineKeyboardBuilder

    kb = InlineKeyboardBuilder()
    kb.row(InlineKeyboardButton(text="📌 Забронировать", callback_data=f"rooms:book:{room_id}"))
    kb.row(InlineKeyboardButton(text="⬅️ К аудитории", callback_data=f"rooms:view:{room_id}"))
    await safe_edit(cb, "\n".join(lines), kb.as_markup())
