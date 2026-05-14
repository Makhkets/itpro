from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.handlers._helpers import safe_edit
from app.keyboards.main import main_menu_kb
from app.services.message_format import truncate
from app.services.session_store import UserSession

router = Router(name="start")

WELCOME_AUTH = (
    "🎓 <b>SmartCampus</b>\n\n"
    "Привет, {name}! Чем помочь?"
)

WELCOME_GUEST = (
    "🎓 <b>SmartCampus</b>\n\n"
    "Привет! Я помогу с расписанием, бронированием аудиторий, "
    "поиском книг и вопросами абитуриентов.\n\n"
    "Войдите, чтобы открыть все возможности, или загляните в FAQ."
)


def _greet_text(session: UserSession | None) -> str:
    if session:
        name = session.user.get("fullName") or session.user.get("email") or "студент"
        return WELCOME_AUTH.format(name=name.split()[0] if isinstance(name, str) else name)
    return WELCOME_GUEST


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, session: UserSession | None) -> None:
    await state.clear()
    await message.answer(
        truncate(_greet_text(session)),
        reply_markup=main_menu_kb(authorized=session is not None),
        parse_mode="HTML",
    )


@router.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext, session: UserSession | None) -> None:
    await state.clear()
    await message.answer(
        truncate(_greet_text(session)),
        reply_markup=main_menu_kb(authorized=session is not None),
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message, session: UserSession | None) -> None:
    text = (
        "ℹ️ <b>Помощь</b>\n\n"
        "/start — главное меню\n"
        "/menu — открыть меню\n"
        "/login — войти\n"
        "/logout — выйти\n"
        "/help — эта справка"
    )
    await message.answer(
        text,
        reply_markup=main_menu_kb(authorized=session is not None),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "menu:home")
async def cb_home(cb: CallbackQuery, state: FSMContext, session: UserSession | None) -> None:
    await state.clear()
    await safe_edit(
        cb,
        _greet_text(session),
        reply_markup=main_menu_kb(authorized=session is not None),
    )


@router.callback_query(F.data == "nav:back")
async def cb_back(cb: CallbackQuery, state: FSMContext, session: UserSession | None) -> None:
    await state.clear()
    await safe_edit(
        cb,
        _greet_text(session),
        reply_markup=main_menu_kb(authorized=session is not None),
    )


@router.callback_query(F.data == "menu:about")
async def cb_about(cb: CallbackQuery) -> None:
    text = (
        "ℹ️ <b>О проекте SmartCampus</b>\n\n"
        "Единая платформа кампуса: расписание, аудитории, бронирования, "
        "AI-ассистент, библиотека и FAQ для абитуриентов."
    )
    from app.keyboards.common import back_home_kb

    await safe_edit(cb, text, back_home_kb())


@router.callback_query(F.data == "menu:settings")
async def cb_settings(cb: CallbackQuery) -> None:
    from app.keyboards.common import back_home_kb

    text = "⚙️ <b>Настройки</b>\n\nЗдесь скоро появятся параметры уведомлений и языка."
    await safe_edit(cb, text, back_home_kb())


@router.callback_query(F.data == "noop")
async def cb_noop(cb: CallbackQuery) -> None:
    await cb.answer()
