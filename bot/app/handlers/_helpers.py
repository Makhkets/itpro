from __future__ import annotations

import logging
from typing import Any

from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from app.api.client import ApiError, ApiUnavailable, AuthRequired, Forbidden
from app.keyboards.common import (
    consent_required_kb,
    home_only,
    login_required_kb,
    retry_kb,
)
from app.services.message_format import error_text, truncate
from app.services.session_store import SessionStore

logger = logging.getLogger(__name__)


async def safe_edit(
    cb: CallbackQuery,
    text: str,
    reply_markup: InlineKeyboardMarkup | None = None,
    parse_mode: str = "HTML",
) -> None:
    if not isinstance(cb.message, Message):
        await cb.answer()
        return
    try:
        await cb.message.edit_text(
            truncate(text),
            reply_markup=reply_markup,
            parse_mode=parse_mode,
            disable_web_page_preview=True,
        )
    except TelegramBadRequest as e:
        if "message is not modified" in str(e).lower():
            await cb.answer()
            return
        try:
            await cb.message.answer(
                truncate(text),
                reply_markup=reply_markup,
                parse_mode=parse_mode,
                disable_web_page_preview=True,
            )
        except TelegramBadRequest:
            logger.warning("safe_edit failed: %s", e)
    finally:
        await cb.answer()


async def send_or_edit(
    target: Message | CallbackQuery,
    text: str,
    reply_markup: InlineKeyboardMarkup | None = None,
) -> None:
    if isinstance(target, CallbackQuery):
        await safe_edit(target, text, reply_markup)
    else:
        await target.answer(
            truncate(text),
            reply_markup=reply_markup,
            parse_mode="HTML",
            disable_web_page_preview=True,
        )


async def handle_api_error(
    target: Message | CallbackQuery,
    exc: Exception,
    *,
    user_id: int | None = None,
    session_store: SessionStore | None = None,
) -> None:
    if isinstance(exc, AuthRequired):
        if session_store and user_id is not None:
            await session_store.clear(user_id)
        await send_or_edit(
            target,
            error_text("Сессия истекла. Войдите снова.", "401"),
            login_required_kb(),
        )
        return
    if isinstance(exc, Forbidden):
        msg = (exc.message or "").lower()
        code = (exc.code or "").lower()
        is_rbac = (
            "permission" in msg
            or "permission" in code
            or "role" in msg
            or "rbac" in code
        )
        if is_rbac:
            await send_or_edit(
                target,
                error_text(
                    "Этот раздел недоступен для вашей роли.",
                    "403",
                ),
                home_only(),
            )
        else:
            await send_or_edit(
                target,
                error_text(
                    "Нет согласия на обработку персональных данных. "
                    "Дайте согласие в профиле, чтобы открыть раздел.",
                    "403",
                ),
                consent_required_kb(),
            )
        return
    if isinstance(exc, ApiUnavailable):
        await send_or_edit(
            target,
            error_text("Сервер недоступен. Попробуйте позже.", "5xx"),
            retry_kb(),
        )
        return
    if isinstance(exc, ApiError):
        await send_or_edit(
            target,
            error_text(exc.message or "Не удалось выполнить запрос.", exc.code or str(exc.status)),
            home_only(),
        )
        return
    logger.exception("Unhandled error: %s", exc)
    await send_or_edit(
        target,
        error_text("Неизвестная ошибка. Мы записали инцидент."),
        home_only(),
    )


def deps(data: dict[str, Any]) -> dict[str, Any]:
    return data
