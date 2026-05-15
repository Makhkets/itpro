from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.keyboards.common import back_home_row, styled_button


def profile_kb(consent: bool, telegram_linked: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    if not telegram_linked:
        kb.row(styled_button("🔗 Привязать Telegram", callback_data="profile:tg:link", style="success"))
    if consent:
        kb.row(styled_button("🚫 Отозвать согласие", callback_data="profile:consent:no", style="danger"))
    else:
        kb.row(styled_button("✅ Дать согласие", callback_data="profile:consent:yes", style="success"))
    kb.row(styled_button("📊 Аналитика", callback_data="menu:analytics", style="success"))
    kb.row(
        styled_button("📤 Экспорт данных", callback_data="profile:export"),
        styled_button("🗑 Удалить аккаунт", callback_data="profile:delete", style="danger"),
    )
    kb.row(styled_button("🚪 Выйти", callback_data="profile:logout", style="danger"))
    kb.row(*back_home_row())
    return kb.as_markup()
