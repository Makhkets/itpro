from __future__ import annotations

import logging
import re

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import ApiError, AuthApi
from app.handlers._helpers import handle_api_error, safe_edit, send_or_edit
from app.keyboards.auth import (
    auth_cancel_kb,
    post_login_kb,
    role_choice_kb,
    skip_or_cancel_kb,
)
from app.keyboards.main import main_menu_kb
from app.services.message_format import error_text, success_text
from app.services.session_store import SessionStore, UserSession
from app.states.auth import AuthFlow, RegisterFlow

logger = logging.getLogger(__name__)
router = Router(name="auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.callback_query(F.data == "auth:login")
async def cb_login_start(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AuthFlow.waiting_email)
    await safe_edit(
        cb,
        "🔑 <b>Вход в SmartCampus</b>\n\nВведите email:",
        reply_markup=auth_cancel_kb(),
    )


@router.message(Command("login"))
async def cmd_login(message: Message, state: FSMContext) -> None:
    await state.set_state(AuthFlow.waiting_email)
    await message.answer(
        "🔑 <b>Вход в SmartCampus</b>\n\nВведите email:",
        reply_markup=auth_cancel_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "auth:cancel")
async def cb_login_cancel(cb: CallbackQuery, state: FSMContext, session: UserSession | None) -> None:
    await state.clear()
    await safe_edit(
        cb,
        "Отменено.",
        reply_markup=main_menu_kb(authorized=session is not None),
    )


@router.message(AuthFlow.waiting_email)
async def on_email(message: Message, state: FSMContext) -> None:
    email = (message.text or "").strip()
    if not EMAIL_RE.match(email):
        await message.answer(
            error_text("Это не похоже на email. Попробуйте ещё раз."),
            reply_markup=auth_cancel_kb(),
            parse_mode="HTML",
        )
        return
    await state.update_data(email=email)
    await state.set_state(AuthFlow.waiting_password)
    await message.answer(
        "🔒 Введите пароль (сообщение будет удалено сразу после проверки):",
        reply_markup=auth_cancel_kb(),
        parse_mode="HTML",
    )


@router.message(AuthFlow.waiting_password)
async def on_password(
    message: Message,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    password = message.text or ""
    data = await state.get_data()
    email = data.get("email", "")

    try:
        await message.delete()
    except Exception:
        pass

    if not password:
        await message.answer(
            error_text("Пароль пустой. Попробуйте снова."),
            reply_markup=auth_cancel_kb(),
            parse_mode="HTML",
        )
        return

    try:
        result = await auth_api.login(email, password)
    except ApiError as e:
        await state.clear()
        if e.status == 401:
            await message.answer(
                error_text("Неверный email или пароль.", "401"),
                reply_markup=main_menu_kb(False),
                parse_mode="HTML",
            )
            return
        await handle_api_error(message, e)
        return
    except Exception as e:
        await state.clear()
        await handle_api_error(message, e)
        return

    token = result.get("token") or ""
    user = result.get("user") or {}
    if not token or not user:
        await state.clear()
        await message.answer(
            error_text("Backend вернул некорректный ответ."),
            reply_markup=main_menu_kb(False),
            parse_mode="HTML",
        )
        return

    user_id = message.from_user.id if message.from_user else 0
    await session_store.set(user_id, token=token, user=user)
    await state.clear()

    await _try_link_telegram(message, auth_api, token, user_id, message.from_user.username if message.from_user else None)

    name = user.get("fullName") or user.get("email") or "пользователь"
    await message.answer(
        success_text(f"Добро пожаловать, {name}!"),
        reply_markup=post_login_kb(),
        parse_mode="HTML",
    )


async def _try_link_telegram(
    message: Message,
    auth_api: AuthApi,
    token: str,
    chat_id: int,
    username: str | None,
) -> None:
    try:
        start_resp = await auth_api.link_start(token)
        code = start_resp.get("code") if isinstance(start_resp, dict) else None
        if code:
            await auth_api.link_verify(token, chat_id=chat_id, username=username, code=str(code))
            await message.answer(success_text("Telegram привязан к аккаунту."), parse_mode="HTML")
        else:
            await auth_api.update_telegram(token, chat_id=chat_id, username=username)
    except Exception as e:
        logger.info("telegram link best-effort failed: %s", e)


@router.message(Command("logout"))
async def cmd_logout(message: Message, session_store: SessionStore) -> None:
    user_id = message.from_user.id if message.from_user else 0
    await session_store.clear(user_id)
    await message.answer(
        success_text("Вы вышли из аккаунта."),
        reply_markup=main_menu_kb(False),
        parse_mode="HTML",
    )


# ──────────────────────────── Registration ────────────────────────────


ROLE_LABELS = {
    "student": "🎓 Студент",
    "teacher": "👨‍🏫 Преподаватель",
    "applicant": "📝 Абитуриент",
    "librarian": "📚 Библиотекарь",
}


@router.callback_query(F.data == "auth:register")
async def cb_register_start(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(RegisterFlow.waiting_full_name)
    await safe_edit(
        cb,
        "🆕 <b>Регистрация в SmartCampus</b>\n"
        "━━━━━━━━━━━━━━━\n\n"
        "Шаг <b>1/4</b> — введите ваше <b>ФИО</b>:",
        reply_markup=auth_cancel_kb(),
    )


@router.message(Command("register"))
async def cmd_register(message: Message, state: FSMContext) -> None:
    await state.set_state(RegisterFlow.waiting_full_name)
    await message.answer(
        "🆕 <b>Регистрация в SmartCampus</b>\n"
        "━━━━━━━━━━━━━━━\n\n"
        "Шаг <b>1/4</b> — введите ваше <b>ФИО</b>:",
        reply_markup=auth_cancel_kb(),
        parse_mode="HTML",
    )


@router.message(RegisterFlow.waiting_full_name)
async def on_reg_full_name(message: Message, state: FSMContext) -> None:
    full_name = (message.text or "").strip()
    if len(full_name) < 2:
        await message.answer(
            error_text("ФИО слишком короткое. Введите полное имя."),
            reply_markup=auth_cancel_kb(),
            parse_mode="HTML",
        )
        return
    await state.update_data(full_name=full_name)
    await state.set_state(RegisterFlow.waiting_email)
    await message.answer(
        "Шаг <b>2/4</b> — введите <b>email</b>:",
        reply_markup=auth_cancel_kb(),
        parse_mode="HTML",
    )


@router.message(RegisterFlow.waiting_email)
async def on_reg_email(message: Message, state: FSMContext) -> None:
    email = (message.text or "").strip()
    if not EMAIL_RE.match(email):
        await message.answer(
            error_text("Это не похоже на email. Попробуйте ещё раз."),
            reply_markup=auth_cancel_kb(),
            parse_mode="HTML",
        )
        return
    await state.update_data(email=email)
    await state.set_state(RegisterFlow.waiting_password)
    await message.answer(
        "Шаг <b>3/4</b> — придумайте <b>пароль</b>\n"
        "<i>(минимум 8 символов; сообщение будет удалено сразу после проверки)</i>:",
        reply_markup=auth_cancel_kb(),
        parse_mode="HTML",
    )


@router.message(RegisterFlow.waiting_password)
async def on_reg_password(message: Message, state: FSMContext) -> None:
    password = message.text or ""
    try:
        await message.delete()
    except Exception:
        pass
    if len(password) < 8:
        await message.answer(
            error_text("Пароль должен быть не короче 8 символов."),
            reply_markup=auth_cancel_kb(),
            parse_mode="HTML",
        )
        return
    await state.update_data(password=password)
    await state.set_state(RegisterFlow.waiting_role)
    await message.answer(
        "Шаг <b>4/4</b> — выберите вашу <b>роль</b>:",
        reply_markup=role_choice_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("register:role:"))
async def cb_reg_role(
    cb: CallbackQuery,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    role = (cb.data or "").split(":")[-1]
    if role not in {"student", "teacher", "applicant", "librarian"}:
        await cb.answer("Неизвестная роль", show_alert=True)
        return
    await state.update_data(role=role)
    if role == "student":
        await state.set_state(RegisterFlow.waiting_group)
        await safe_edit(
            cb,
            f"Роль: <b>{ROLE_LABELS[role]}</b>\n\n"
            "Введите <b>название группы</b> (например, <code>BSE-201</code>):",
            reply_markup=skip_or_cancel_kb("register:skip:group"),
        )
        return
    if role == "teacher":
        await state.set_state(RegisterFlow.waiting_department)
        await safe_edit(
            cb,
            f"Роль: <b>{ROLE_LABELS[role]}</b>\n\n"
            "Введите <b>кафедру</b>:",
            reply_markup=skip_or_cancel_kb("register:skip:department"),
        )
        return
    await _do_register(cb, state, auth_api, session_store)


@router.message(RegisterFlow.waiting_group)
async def on_reg_group(
    message: Message,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    group = (message.text or "").strip()
    if group:
        await state.update_data(group_name=group)
    await _do_register(message, state, auth_api, session_store)


@router.message(RegisterFlow.waiting_department)
async def on_reg_department(
    message: Message,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    dept = (message.text or "").strip()
    if dept:
        await state.update_data(department=dept)
    await _do_register(message, state, auth_api, session_store)


@router.callback_query(F.data == "register:skip:group")
async def cb_reg_skip_group(
    cb: CallbackQuery,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    await _do_register(cb, state, auth_api, session_store)


@router.callback_query(F.data == "register:skip:department")
async def cb_reg_skip_department(
    cb: CallbackQuery,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    await _do_register(cb, state, auth_api, session_store)


async def _do_register(
    target: Message | CallbackQuery,
    state: FSMContext,
    auth_api: AuthApi,
    session_store: SessionStore,
) -> None:
    data = await state.get_data()
    full_name = data.get("full_name") or ""
    email = data.get("email") or ""
    password = data.get("password") or ""
    role = data.get("role") or ""
    group_name = data.get("group_name")
    department = data.get("department")

    try:
        await auth_api.register(
            full_name=full_name,
            email=email,
            password=password,
            role=role,
            group_name=group_name,
            department=department,
        )
    except ApiError as e:
        await state.clear()
        if e.status == 400:
            await send_or_edit(
                target,
                error_text(e.message or "Некорректные данные регистрации.", str(e.status)),
                main_menu_kb(False),
            )
            return
        await handle_api_error(target, e)
        return
    except Exception as e:
        await state.clear()
        await handle_api_error(target, e)
        return

    # Auto-login after registration
    try:
        result = await auth_api.login(email, password)
    except Exception as e:
        await state.clear()
        await send_or_edit(
            target,
            success_text("Аккаунт создан. Войдите с помощью /login."),
            main_menu_kb(False),
        )
        logger.info("auto-login after register failed: %s", e)
        return

    token = result.get("token") or ""
    user = result.get("user") or {}
    user_obj = target.from_user
    chat_id = user_obj.id if user_obj else None
    username = user_obj.username if user_obj else None

    if token and user and chat_id is not None:
        await session_store.set(chat_id, token=token, user=user)
        bot_message = target.message if isinstance(target, CallbackQuery) else target
        if isinstance(bot_message, Message):
            await _try_link_telegram(bot_message, auth_api, token, chat_id, username)

    name = (user.get("fullName") or email or "пользователь").split()[0]
    await state.clear()
    await send_or_edit(
        target,
        success_text(f"Регистрация завершена. Добро пожаловать, {name}!"),
        post_login_kb(),
    )
