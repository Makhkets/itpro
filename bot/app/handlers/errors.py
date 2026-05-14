from __future__ import annotations

import logging

from aiogram import Router
from aiogram.types import ErrorEvent

logger = logging.getLogger(__name__)
router = Router(name="errors")


@router.errors()
async def on_error(event: ErrorEvent) -> bool:
    logger.exception("Unhandled error: %s", event.exception)
    update = event.update
    try:
        if update.callback_query:
            await update.callback_query.answer("Произошла ошибка, попробуйте ещё раз", show_alert=False)
        elif update.message:
            await update.message.answer("🔴 Произошла ошибка. Мы записали инцидент.")
    except Exception:
        pass
    return True
