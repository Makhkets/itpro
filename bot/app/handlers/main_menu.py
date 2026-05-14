from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.handlers._helpers import safe_edit
from app.keyboards.ai import ai_menu_kb
from app.keyboards.bookings import bookings_menu_kb
from app.keyboards.common import login_required_kb
from app.keyboards.faq import faq_menu_kb
from app.keyboards.library import library_menu_kb
from app.keyboards.rooms import rooms_menu_kb
from app.keyboards.schedule import schedule_menu_kb
from app.services.session_store import UserSession

router = Router(name="main_menu")


@router.callback_query(F.data == "menu:bookings")
async def cb_bookings(cb: CallbackQuery, session: UserSession | None) -> None:
    if not session:
        await safe_edit(
            cb,
            "🔒 Для бронирований нужно войти.",
            login_required_kb(),
        )
        return
    await safe_edit(
        cb,
        "📌 <b>Бронирования</b>\n\nВыберите фильтр:",
        bookings_menu_kb(),
    )


@router.callback_query(F.data == "menu:rooms")
async def cb_rooms(cb: CallbackQuery) -> None:
    await safe_edit(
        cb,
        "🚪 <b>Аудитории</b>\n\nНайдите аудиторию по номеру или названию.",
        rooms_menu_kb(),
    )


@router.callback_query(F.data == "menu:schedule")
async def cb_schedule(cb: CallbackQuery, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Для расписания нужно войти.", login_required_kb())
        return
    has_group = bool(session.user.get("groupName"))
    await safe_edit(
        cb,
        "📅 <b>Расписание</b>",
        schedule_menu_kb(has_group=has_group),
    )


@router.callback_query(F.data == "menu:faq")
async def cb_faq(cb: CallbackQuery) -> None:
    await safe_edit(
        cb,
        "❓ <b>FAQ абитуриента</b>\n\nЛистайте список или ищите по ключевому слову.",
        faq_menu_kb(),
    )


@router.callback_query(F.data == "menu:ai")
async def cb_ai(cb: CallbackQuery, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Для AI-ассистента нужно войти.", login_required_kb())
        return
    await safe_edit(
        cb,
        "🟣 <b>AI-ассистент SmartCampus</b>\n\n"
        "Спросите про расписание, аудитории, бронирования или общие вопросы.",
        ai_menu_kb(has_session=session.ai_session_id is not None),
    )


@router.callback_query(F.data == "menu:library")
async def cb_library(cb: CallbackQuery, session: UserSession | None) -> None:
    role = (session.user.get("role") if session else "") or ""
    await safe_edit(
        cb,
        "📚 <b>Библиотека SmartCampus</b>\n"
        "━━━━━━━━━━━━━━━\n\n"
        "Найдите книги, проверьте свои выдачи и сроки возврата.",
        library_menu_kb(authorized=session is not None, role=role),
    )
