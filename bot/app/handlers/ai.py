from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import AIApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.ai import (
    ai_after_answer_kb,
    ai_history_kb,
    ai_menu_kb,
    ai_session_view_kb,
)
from app.keyboards.common import back_home_kb, login_required_kb
from app.services.message_format import ai_answer, esc, success_text, truncate
from app.services.session_store import SessionStore, UserSession
from app.states.ai import AIChat

router = Router(name="ai")


@router.callback_query(F.data == "ai:ask")
async def cb_ask(cb: CallbackQuery, state: FSMContext, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    await state.set_state(AIChat.waiting_message)
    await safe_edit(
        cb,
        "🟣 <b>AI-ассистент</b>\n\nЗадайте вопрос одним сообщением:",
        back_home_kb(),
    )


@router.callback_query(F.data == "ai:new")
async def cb_new(
    cb: CallbackQuery,
    state: FSMContext,
    session: UserSession | None,
    session_store: SessionStore,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    user_id = cb.from_user.id if cb.from_user else 0
    await session_store.set_ai_session(user_id, None)
    await state.set_state(AIChat.waiting_message)
    await safe_edit(
        cb,
        success_text("Новый чат с AI начат.") + "\n\nЗадайте вопрос:",
        back_home_kb(),
    )


@router.callback_query(F.data == "ai:continue")
async def cb_continue(cb: CallbackQuery, state: FSMContext, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    await state.set_state(AIChat.waiting_message)
    await safe_edit(
        cb,
        "🟣 Продолжаем диалог. Задайте следующий вопрос:",
        back_home_kb(),
    )


@router.callback_query(F.data == "ai:history")
async def cb_history(cb: CallbackQuery, ai_api: AIApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    try:
        sessions = await ai_api.sessions(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not sessions:
        await safe_edit(
            cb,
            "🗂 <b>История диалогов с AI</b>\n━━━━━━━━━━━━━━━\n\n🔵 Истории пока нет.",
            ai_menu_kb(has_session=session.ai_session_id is not None),
        )
        return
    lines = ["🗂 <b>История диалогов с AI</b>", "━━━━━━━━━━━━━━━", ""]
    for s in sessions[:10]:
        title = s.get("title") or s.get("firstMessage") or s.get("id") or "—"
        if isinstance(title, str) and len(title) > 60:
            title = title[:57] + "…"
        marker = "🟣" if s.get("id") == session.ai_session_id else "•"
        lines.append(f"{marker} {esc(title)}")
    await safe_edit(cb, "\n".join(lines), ai_history_kb(sessions))


@router.callback_query(F.data.regexp(r"^ai:session:[^:]+$"))
async def cb_session_view(cb: CallbackQuery, ai_api: AIApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    session_id = (cb.data or "").split(":")[-1]
    try:
        messages = await ai_api.session_messages(session.token, session_id)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not messages:
        await safe_edit(
            cb,
            "🔵 В этой сессии пока нет сообщений.",
            ai_session_view_kb(session_id),
        )
        return
    lines = ["🗂 <b>Сессия с AI</b>", "━━━━━━━━━━━━━━━", ""]
    for m in messages[-20:]:
        role = (m.get("role") or "").lower()
        body = m.get("content") or m.get("message") or m.get("text") or ""
        if role == "user":
            lines.append(f"👤 <b>Вы:</b>\n<blockquote>{esc(body)}</blockquote>")
        else:
            lines.append(f"🟣 <b>AI:</b>\n<blockquote>{esc(body)}</blockquote>")
        lines.append("")
    await safe_edit(cb, truncate("\n".join(lines)), ai_session_view_kb(session_id))


@router.callback_query(F.data.startswith("ai:session:resume:"))
async def cb_session_resume(
    cb: CallbackQuery,
    state: FSMContext,
    session: UserSession | None,
    session_store: SessionStore,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    session_id = (cb.data or "").split(":")[-1]
    user_id = cb.from_user.id if cb.from_user else 0
    await session_store.set_ai_session(user_id, session_id)
    await state.set_state(AIChat.waiting_message)
    await safe_edit(
        cb,
        success_text("Возвращаемся в сессию.") + "\n\nЗадайте следующий вопрос:",
        back_home_kb(),
    )


@router.callback_query(F.data.startswith("ai:session:delete:"))
async def cb_session_delete(
    cb: CallbackQuery,
    ai_api: AIApi,
    session: UserSession | None,
    session_store: SessionStore,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    session_id = (cb.data or "").split(":")[-1]
    try:
        await ai_api.delete_session(session.token, session_id)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    user_id = cb.from_user.id if cb.from_user else 0
    if session.ai_session_id == session_id:
        await session_store.set_ai_session(user_id, None)
    # Refresh list
    try:
        sessions = await ai_api.sessions(session.token)
    except Exception:
        sessions = []
    if not sessions:
        await safe_edit(
            cb,
            success_text("Сессия удалена.") + "\n\n🔵 История пуста.",
            ai_menu_kb(has_session=False),
        )
        return
    lines = [success_text("Сессия удалена."), "", "🗂 <b>История диалогов с AI</b>", "━━━━━━━━━━━━━━━", ""]
    for s in sessions[:10]:
        title = s.get("title") or s.get("firstMessage") or s.get("id") or "—"
        if isinstance(title, str) and len(title) > 60:
            title = title[:57] + "…"
        lines.append(f"• {esc(title)}")
    has_active = any(s.get("id") == session.ai_session_id for s in sessions) and session.ai_session_id is not None
    if has_active:
        await safe_edit(cb, "\n".join(lines), ai_history_kb(sessions))
    else:
        # if we just removed the active one, refetch and keep history view
        await safe_edit(cb, "\n".join(lines), ai_history_kb(sessions))


@router.message(AIChat.waiting_message)
async def on_ai_question(
    message: Message,
    state: FSMContext,
    ai_api: AIApi,
    session: UserSession | None,
    session_store: SessionStore,
) -> None:
    if not session:
        await state.clear()
        await message.answer("🔒 Войдите.", reply_markup=login_required_kb())
        return
    q = (message.text or "").strip()
    if not q:
        await message.answer("Пустой вопрос. Попробуйте снова.")
        return

    await state.clear()
    placeholder = await message.answer("🟣 Думаю над ответом…", parse_mode="HTML")

    try:
        resp = await ai_api.chat(
            token=session.token,
            message=q,
            session_id=session.ai_session_id,
        )
    except Exception as e:
        try:
            await placeholder.delete()
        except Exception:
            pass
        await handle_api_error(message, e)
        return

    new_session_id = resp.get("sessionId")
    if new_session_id:
        user_id = message.from_user.id if message.from_user else 0
        await session_store.set_ai_session(user_id, str(new_session_id))

    try:
        await placeholder.edit_text(
            ai_answer(resp),
            reply_markup=ai_after_answer_kb(),
            parse_mode="HTML",
            disable_web_page_preview=True,
        )
    except Exception:
        await message.answer(
            ai_answer(resp),
            reply_markup=ai_after_answer_kb(),
            parse_mode="HTML",
            disable_web_page_preview=True,
        )
