from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import ScheduleApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.common import back_home_kb, login_required_kb
from app.services.message_format import esc, fmt_date, schedule_item
from app.services.session_store import UserSession
from app.states.search import GroupSearch

router = Router(name="schedule")


@router.callback_query(F.data == "schedule:mine")
async def cb_my_schedule(cb: CallbackQuery, schedule_api: ScheduleApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите, чтобы видеть расписание.", login_required_kb())
        return
    group = session.user.get("groupName")
    if not group:
        await safe_edit(
            cb,
            "🔵 У вашего аккаунта не задана учебная группа.",
            back_home_kb(),
        )
        return
    await _show_group(cb, schedule_api, group, session)


@router.callback_query(F.data == "schedule:group")
async def cb_group_input(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(GroupSearch.waiting_group)
    await safe_edit(
        cb,
        "🔎 Введите название группы (например, <code>ИСИП-21</code>):",
        back_home_kb(),
    )


@router.message(GroupSearch.waiting_group)
async def on_group_input(
    message: Message,
    state: FSMContext,
    schedule_api: ScheduleApi,
    session: UserSession | None,
) -> None:
    group = (message.text or "").strip()
    await state.clear()
    if not group:
        await message.answer("Пустой запрос. Попробуйте снова.", parse_mode="HTML")
        return
    await _show_group(message, schedule_api, group, session)


async def _show_group(target, schedule_api: ScheduleApi, group: str, session: UserSession | None) -> None:
    try:
        items = await schedule_api.group_schedule(
            group, token=session.token if session else None
        )
    except Exception as e:
        await handle_api_error(target, e)
        return

    if not items:
        text = f"🔵 Расписание группы <b>{esc(group)}</b> пусто."
        if isinstance(target, CallbackQuery):
            await safe_edit(target, text, back_home_kb())
        else:
            await target.answer(text, reply_markup=back_home_kb(), parse_mode="HTML")
        return

    lines = [f"📅 <b>Расписание группы {esc(group)}</b>"]
    last_date = ""
    for s in items[:12]:
        day = fmt_date(s.get("startsAt") or s.get("date"))
        if day != last_date:
            lines.append("")
            lines.append(f"📆 <b>{day}</b>")
            last_date = day
        lines.append("")
        lines.append(schedule_item(s))

    text = "\n".join(lines)
    if isinstance(target, CallbackQuery):
        await safe_edit(target, text, back_home_kb())
    else:
        await target.answer(text, reply_markup=back_home_kb(), parse_mode="HTML")


@router.callback_query(F.data == "schedule:current")
async def cb_current(cb: CallbackQuery, schedule_api: ScheduleApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    group = session.user.get("groupName")
    try:
        data = await schedule_api.current(token=session.token, group_name=group)
    except Exception as e:
        await handle_api_error(cb, e)
        return

    current = data.get("currentLesson") if isinstance(data, dict) else None
    nxt = data.get("nextLesson") if isinstance(data, dict) else None

    lines = ["⏰ <b>Сейчас и далее</b>", ""]
    if current:
        lines.append("🟢 <b>Сейчас идёт</b>")
        lines.append(schedule_item(current))
    else:
        lines.append("🔵 Сейчас занятий нет.")
    lines.append("")
    if nxt:
        lines.append("🟡 <b>Следующая пара</b>")
        lines.append(schedule_item(nxt))
    else:
        lines.append("🔵 Дальше пар не запланировано.")

    await safe_edit(cb, "\n".join(lines), back_home_kb())
