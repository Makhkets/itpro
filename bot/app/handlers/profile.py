from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.api import AuthApi, PrivacyApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.common import back_home_kb, login_required_kb
from app.keyboards.main import main_menu_kb
from app.keyboards.profile import profile_kb
from app.services.message_format import esc, success_text
from app.services.session_store import SessionStore, UserSession

router = Router(name="profile")


@router.callback_query(F.data == "menu:profile")
async def cb_profile(cb: CallbackQuery, auth_api: AuthApi, session: UserSession | None, session_store: SessionStore) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    try:
        me = await auth_api.me(session.token)
    except Exception as e:
        await handle_api_error(cb, e, user_id=cb.from_user.id if cb.from_user else None, session_store=session_store)
        return
    user_id = cb.from_user.id if cb.from_user else 0
    await session_store.update_user(user_id, me)

    full = me.get("fullName") or "—"
    email = me.get("email") or "—"
    role = me.get("role") or "—"
    group = me.get("groupName") or "—"
    dept = me.get("department") or "—"
    consent = bool(me.get("personalDataConsent"))
    tg_linked = bool(me.get("telegramChatId") or me.get("telegramUsername"))

    consent_str = "🟢 дано" if consent else "🟡 не дано"
    tg_str = "🟢 привязан" if tg_linked else "🟡 не привязан"

    text = (
        "👤 <b>Профиль</b>\n\n"
        f"<b>ФИО:</b> {esc(full)}\n"
        f"<b>Email:</b> {esc(email)}\n"
        f"<b>Роль:</b> {esc(role)}\n"
        f"<b>Группа:</b> {esc(group)}\n"
        f"<b>Кафедра:</b> {esc(dept)}\n\n"
        f"Согласие на обработку данных: {consent_str}\n"
        f"Telegram: {tg_str}"
    )
    await safe_edit(cb, text, profile_kb(consent=consent, telegram_linked=tg_linked))


@router.callback_query(F.data.startswith("profile:consent:"))
async def cb_consent(
    cb: CallbackQuery,
    auth_api: AuthApi,
    session: UserSession | None,
    session_store: SessionStore,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    value = (cb.data or "").split(":")[-1] == "yes"
    try:
        resp = await auth_api.update_consent(session.token, value)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    user_id = cb.from_user.id if cb.from_user else 0
    # Response contains User fields + fresh JWT in `token`.
    # Replace the stored JWT so subsequent requests carry the updated consent claim.
    new_token = resp.get("token") if isinstance(resp, dict) else None
    user_payload = {k: v for k, v in resp.items() if k != "token"} if isinstance(resp, dict) else resp
    await session_store.update_user(user_id, user_payload)
    if isinstance(new_token, str) and new_token:
        await session_store.set_token(user_id, new_token)
    await safe_edit(
        cb,
        success_text("Согласие обновлено." if value else "Согласие отозвано."),
        back_home_kb(),
    )


@router.callback_query(F.data == "profile:tg:link")
async def cb_link(
    cb: CallbackQuery,
    auth_api: AuthApi,
    session: UserSession | None,
    session_store: SessionStore,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    user = cb.from_user
    if not user:
        return
    try:
        start_resp = await auth_api.link_start(session.token)
        code = start_resp.get("code") if isinstance(start_resp, dict) else None
        if not code:
            await safe_edit(cb, "🔵 Backend не вернул код привязки.", back_home_kb())
            return
        me = await auth_api.link_verify(session.token, chat_id=user.id, username=user.username, code=str(code))
        await session_store.update_user(user.id, me)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, success_text("Telegram успешно привязан."), back_home_kb())


@router.callback_query(F.data == "profile:export")
async def cb_export(
    cb: CallbackQuery,
    privacy_api: PrivacyApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    try:
        await privacy_api.export(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(
        cb,
        success_text("Запрос на экспорт принят. Backend пришлёт результат отдельно."),
        back_home_kb(),
    )


@router.callback_query(F.data == "profile:delete")
async def cb_delete(
    cb: CallbackQuery,
    privacy_api: PrivacyApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    try:
        await privacy_api.delete_request(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(
        cb,
        success_text("Запрос на удаление зарегистрирован. Администратор обработает его."),
        back_home_kb(),
    )


@router.callback_query(F.data == "profile:logout")
async def cb_logout(cb: CallbackQuery, session_store: SessionStore) -> None:
    user_id = cb.from_user.id if cb.from_user else 0
    await session_store.clear(user_id)
    await safe_edit(cb, success_text("Вы вышли из аккаунта."), main_menu_kb(False))
