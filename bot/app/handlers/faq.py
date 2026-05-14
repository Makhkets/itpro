from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import FaqApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.common import back_home_kb
from app.keyboards.faq import faq_list_kb, faq_menu_kb
from app.services.message_format import esc, faq_card
from app.services.pagination import paginate
from app.states.search import FaqSearch

router = Router(name="faq")

PAGE_SIZE = 5


@router.callback_query(F.data == "faq:list:1")
async def cb_faq_list_first(cb: CallbackQuery, faq_api: FaqApi) -> None:
    await _list(cb, faq_api, page=1)


@router.callback_query(F.data.startswith("faq:list:page:"))
async def cb_faq_list_page(cb: CallbackQuery, faq_api: FaqApi) -> None:
    try:
        page = int((cb.data or "").split(":")[-1])
    except ValueError:
        page = 1
    await _list(cb, faq_api, page=page)


async def _list(cb: CallbackQuery, faq_api: FaqApi, page: int) -> None:
    try:
        items = await faq_api.list()
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not items:
        await safe_edit(cb, "🔵 FAQ пуст.", back_home_kb())
        return
    pg = paginate(items, page, PAGE_SIZE)
    await safe_edit(
        cb,
        f"❓ <b>FAQ абитуриента</b>\n\nВсего: <b>{pg.total}</b>",
        faq_list_kb(pg.items, pg.page, pg.has_prev, pg.has_next),
    )


@router.callback_query(F.data == "faq:search")
async def cb_faq_search(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(FaqSearch.waiting_query)
    await safe_edit(
        cb,
        "🔎 Введите запрос для поиска в FAQ (например, <code>документы</code>):",
        back_home_kb(),
    )


@router.message(FaqSearch.waiting_query)
async def on_search(message: Message, state: FSMContext, faq_api: FaqApi) -> None:
    q = (message.text or "").strip()
    await state.clear()
    if not q:
        await message.answer("Пустой запрос.", parse_mode="HTML")
        return
    try:
        items = await faq_api.search(q)
    except Exception as e:
        await handle_api_error(message, e)
        return

    if not items:
        await message.answer(
            f"🔵 По запросу <b>{esc(q)}</b> ничего не нашлось.\n"
            "Я не нашёл точный ответ — обратитесь в приёмную комиссию.",
            reply_markup=faq_menu_kb(),
            parse_mode="HTML",
        )
        return

    lines = [f"🔎 По запросу <b>{esc(q)}</b> найдено: <b>{len(items)}</b>", ""]
    for f in items[:5]:
        lines.append(faq_card(f))
        lines.append("")
    await message.answer(
        "\n".join(lines).strip(),
        reply_markup=faq_menu_kb(),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("faq:view:"))
async def cb_faq_view(cb: CallbackQuery, faq_api: FaqApi) -> None:
    fid = (cb.data or "").split(":")[-1]
    try:
        items = await faq_api.list()
    except Exception as e:
        await handle_api_error(cb, e)
        return
    item = next((x for x in items if str(x.get("id")) == fid), None)
    if not item:
        await safe_edit(cb, "🔵 Вопрос не найден.", faq_menu_kb())
        return
    await safe_edit(cb, faq_card(item), faq_menu_kb())
