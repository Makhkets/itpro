from __future__ import annotations

from datetime import datetime, timedelta, timezone

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import BookingsApi, RoomsApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.bookings import (
    booking_confirm_kb,
    booking_detail_kb,
    bookings_list_kb,
    bookings_menu_kb,
)
from app.keyboards.common import back_home_kb, login_required_kb
from app.services.message_format import (
    booking_card,
    error_text,
    esc,
    room_card,
    success_text,
)
from app.services.session_store import UserSession
from app.states.booking import BookingFlow

router = Router(name="bookings")

PAGE_SIZE = 5


@router.callback_query(F.data.startswith("bookings:filter:"))
async def cb_filter(cb: CallbackQuery, bookings_api: BookingsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    parts = (cb.data or "").split(":")
    filter_key = parts[2] if len(parts) > 2 else "all"
    try:
        page = int(parts[3]) if len(parts) > 3 else 1
    except ValueError:
        page = 1

    status = None if filter_key == "all" else filter_key
    try:
        items = await bookings_api.my(
            token=session.token, status=status, page=page, page_size=PAGE_SIZE
        )
    except Exception as e:
        await handle_api_error(cb, e)
        return

    if not items:
        await safe_edit(
            cb,
            f"🔵 Бронирований ({filter_key}) не найдено.",
            bookings_menu_kb(),
        )
        return

    lines = [f"📌 <b>Бронирования · {filter_key}</b>", "", f"Найдено на странице: <b>{len(items)}</b>"]
    await safe_edit(
        cb,
        "\n".join(lines),
        bookings_list_kb(
            items,
            page,
            has_prev=page > 1,
            has_next=len(items) >= PAGE_SIZE,
            filter_key=filter_key,
        ),
    )


@router.callback_query(F.data.startswith("bookings:view:"))
async def cb_view(cb: CallbackQuery, bookings_api: BookingsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    booking_id = (cb.data or "").split(":")[-1]
    try:
        b = await bookings_api.get(session.token, booking_id)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(
        cb,
        booking_card(b),
        booking_detail_kb(booking_id, b.get("status") or ""),
    )


@router.callback_query(F.data.startswith("bookings:cancel:"))
async def cb_cancel(cb: CallbackQuery, bookings_api: BookingsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    booking_id = (cb.data or "").split(":")[-1]
    try:
        b = await bookings_api.cancel(session.token, booking_id)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(
        cb,
        success_text("Бронирование отменено.") + "\n\n" + booking_card(b),
        booking_detail_kb(booking_id, b.get("status") or "cancelled"),
    )


@router.callback_query(F.data.startswith("rooms:book:"))
async def cb_start_booking(cb: CallbackQuery, state: FSMContext, rooms_api: RoomsApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    room_id = (cb.data or "").split(":")[-1]
    try:
        room = await rooms_api.get(room_id, token=session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return

    await state.set_state(BookingFlow.waiting_title)
    await state.update_data(room_id=room_id, room=room)
    await safe_edit(
        cb,
        room_card(room) + "\n\n📝 Введите название бронирования:",
        back_home_kb(),
    )


@router.message(BookingFlow.waiting_title)
async def on_title(message: Message, state: FSMContext) -> None:
    title = (message.text or "").strip()
    if not title:
        await message.answer("Название не может быть пустым.")
        return
    await state.update_data(title=title)
    await state.set_state(BookingFlow.waiting_purpose)
    await message.answer("📋 Опишите цель бронирования (одним сообщением):")


@router.message(BookingFlow.waiting_purpose)
async def on_purpose(message: Message, state: FSMContext) -> None:
    purpose = (message.text or "").strip()
    if not purpose:
        await message.answer("Цель не может быть пустой.")
        return
    await state.update_data(purpose=purpose)
    await state.set_state(BookingFlow.waiting_date)
    await message.answer(
        "📅 Введите дату в формате <code>ГГГГ-ММ-ДД</code>:",
        parse_mode="HTML",
    )


@router.message(BookingFlow.waiting_date)
async def on_date(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    try:
        d = datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        await message.answer(
            error_text("Неверный формат. Используйте ГГГГ-ММ-ДД, например 2026-05-20."),
            parse_mode="HTML",
        )
        return
    await state.update_data(date=d.isoformat())
    await state.set_state(BookingFlow.waiting_time)
    await message.answer(
        "🕒 Введите время в формате <code>HH:MM-HH:MM</code>, например <code>14:00-15:30</code>:",
        parse_mode="HTML",
    )


@router.message(BookingFlow.waiting_time)
async def on_time(
    message: Message,
    state: FSMContext,
    bookings_api: BookingsApi,
    session: UserSession | None,
) -> None:
    text = (message.text or "").strip()
    if "-" not in text:
        await message.answer(
            error_text("Неверный формат. Пример: 14:00-15:30."),
            parse_mode="HTML",
        )
        return
    start_s, end_s = [p.strip() for p in text.split("-", 1)]
    try:
        start_t = datetime.strptime(start_s, "%H:%M").time()
        end_t = datetime.strptime(end_s, "%H:%M").time()
    except ValueError:
        await message.answer(
            error_text("Неверный формат времени. Пример: 14:00-15:30."),
            parse_mode="HTML",
        )
        return

    data = await state.get_data()
    date_iso = data.get("date")
    if not date_iso or not session:
        await state.clear()
        await message.answer(error_text("Сессия истекла."), parse_mode="HTML")
        return

    day = datetime.strptime(date_iso, "%Y-%m-%d").date()
    starts_at = datetime.combine(day, start_t, tzinfo=timezone.utc)
    ends_at = datetime.combine(day, end_t, tzinfo=timezone.utc)
    if ends_at <= starts_at:
        ends_at = ends_at + timedelta(days=0)
        await message.answer(error_text("Время окончания должно быть позже начала."), parse_mode="HTML")
        return

    await state.update_data(
        starts_at=starts_at.isoformat(),
        ends_at=ends_at.isoformat(),
    )

    room = data.get("room") or {}
    summary = (
        "📌 <b>Подтвердите бронирование</b>\n\n"
        f"🚪 {esc(room.get('number') or room.get('name') or 'Аудитория')}\n"
        f"📝 {esc(data.get('title'))}\n"
        f"📋 {esc(data.get('purpose'))}\n"
        f"🕓 {starts_at.strftime('%d.%m.%Y %H:%M')} — {ends_at.strftime('%H:%M')}"
    )
    await message.answer(
        summary,
        reply_markup=booking_confirm_kb(data.get("room_id") or ""),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "bookings:create:confirm")
async def cb_confirm(
    cb: CallbackQuery,
    state: FSMContext,
    bookings_api: BookingsApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return

    data = await state.get_data()
    await state.clear()
    room_id = data.get("room_id")
    if not room_id:
        await safe_edit(cb, error_text("Данные бронирования утеряны."), back_home_kb())
        return

    try:
        b = await bookings_api.create(
            token=session.token,
            room_id=room_id,
            title=data.get("title") or "Бронирование",
            purpose=data.get("purpose") or "",
            starts_at=data.get("starts_at") or "",
            ends_at=data.get("ends_at") or "",
        )
    except Exception as e:
        await handle_api_error(cb, e)
        return

    await safe_edit(
        cb,
        success_text("Заявка отправлена.") + "\n\n" + booking_card(b),
        booking_detail_kb(b.get("id") or "", b.get("status") or "pending"),
    )
