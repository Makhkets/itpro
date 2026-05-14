from __future__ import annotations

import asyncio
import logging

from aiogram.types import BotCommand

from app.bot import build_app
from app.config import get_settings
from app.logging import setup_logging

logger = logging.getLogger(__name__)

BOT_COMMANDS = [
    BotCommand(command="start", description="Главное меню"),
    BotCommand(command="menu", description="Открыть меню"),
    BotCommand(command="login", description="Войти"),
    BotCommand(command="register", description="Регистрация"),
    BotCommand(command="logout", description="Выйти"),
    BotCommand(command="help", description="Помощь"),
]


async def amain() -> None:
    settings = get_settings()
    setup_logging(settings.log_level)
    logger.info("Starting SmartCampus bot, api=%s, mode=%s", settings.api_base_url, settings.bot_mode)

    async with build_app(settings) as (bot, dp):
        await bot.set_my_commands(BOT_COMMANDS)
        if settings.bot_mode == "polling":
            await bot.delete_webhook(drop_pending_updates=True)
            await dp.start_polling(bot)
        else:
            from aiohttp import web
            from aiogram.webhook.aiohttp_server import (
                SimpleRequestHandler,
                setup_application,
            )

            app = web.Application()
            handler = SimpleRequestHandler(
                dispatcher=dp,
                bot=bot,
                secret_token=settings.webhook_secret or None,
            )
            handler.register(app, path="/webhook")
            setup_application(app, dp, bot=bot)
            if settings.webhook_url:
                await bot.set_webhook(
                    settings.webhook_url,
                    secret_token=settings.webhook_secret or None,
                    drop_pending_updates=True,
                )
            await web._run_app(app, host="0.0.0.0", port=8081)


def main() -> None:
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        logger.info("Bye!")


if __name__ == "__main__":
    main()
