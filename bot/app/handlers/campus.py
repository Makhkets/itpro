from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.api import CampusApi, RoomsApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.campus import buildings_kb, building_detail_kb, floors_kb
from app.keyboards.common import back_home_kb
from app.keyboards.rooms import rooms_list_kb
from app.services.message_format import building_card, room_card
from app.services.pagination import paginate
from app.services.session_store import UserSession

router = Router(name="campus")

PAGE_SIZE = 5


@router.callback_query(F.data == "menu:campus")
async def cb_campus_root(cb: CallbackQuery, campus_api: CampusApi, session: UserSession | None) -> None:
    if not session:
        from app.keyboards.common import login_required_kb

        await safe_edit(cb, "🔒 Для просмотра кампуса нужно войти.", login_required_kb())
        return
    await _show_buildings(cb, campus_api, page=1, session=session)


@router.callback_query(F.data.startswith("campus:buildings:page:"))
async def cb_campus_page(cb: CallbackQuery, campus_api: CampusApi, session: UserSession | None) -> None:
    try:
        page = int(cb.data.split(":")[-1])
    except (ValueError, AttributeError):
        page = 1
    await _show_buildings(cb, campus_api, page=page, session=session)


async def _show_buildings(cb: CallbackQuery, campus_api: CampusApi, page: int, session: UserSession | None) -> None:
    try:
        buildings = await campus_api.list_buildings(token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return

    if not buildings:
        await safe_edit(cb, "🔵 Корпуса не найдены.", back_home_kb())
        return

    pg = paginate(buildings, page, PAGE_SIZE)
    lines = ["🏛 <b>Корпуса кампуса</b>", "", f"Найдено: <b>{pg.total}</b>"]
    await safe_edit(
        cb,
        "\n".join(lines),
        reply_markup=buildings_kb(pg.items, pg.page, pg.has_prev, pg.has_next),
    )


@router.callback_query(F.data.startswith("campus:building:"))
async def cb_building(cb: CallbackQuery, campus_api: CampusApi, session: UserSession | None) -> None:
    building_id = (cb.data or "").split(":")[-1]
    try:
        b = await campus_api.get_building(building_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, building_card(b), building_detail_kb(building_id))


@router.callback_query(F.data.startswith("campus:floors:"))
async def cb_floors(cb: CallbackQuery, campus_api: CampusApi, session: UserSession | None) -> None:
    building_id = (cb.data or "").split(":")[-1]
    try:
        floors = await campus_api.list_floors(building_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not floors:
        await safe_edit(cb, "🔵 Этажи не найдены.", back_home_kb())
        return
    await safe_edit(cb, "🪜 <b>Этажи корпуса</b>", floors_kb(building_id, floors))


@router.callback_query(F.data.startswith("campus:rooms:"))
async def cb_building_rooms(cb: CallbackQuery, rooms_api: RoomsApi, session: UserSession | None) -> None:
    parts = (cb.data or "").split(":")
    if len(parts) < 4:
        await cb.answer()
        return
    building_id = parts[2]
    try:
        page = int(parts[3])
    except ValueError:
        page = 1
    try:
        rooms = await rooms_api.list(
            token=session.token if session else None,
            building_id=building_id,
            page=page,
            page_size=PAGE_SIZE,
        )
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not rooms:
        await safe_edit(cb, "🔵 Аудитории не найдены.", back_home_kb())
        return
    lines = ["🚪 <b>Аудитории корпуса</b>"]
    for r in rooms[:PAGE_SIZE]:
        lines.append("")
        lines.append(room_card(r))
    await safe_edit(
        cb,
        "\n".join(lines),
        rooms_list_kb(rooms, page, has_prev=page > 1, has_next=len(rooms) >= PAGE_SIZE, prefix=f"campus:rooms:{building_id}"),
    )


@router.callback_query(F.data == "campus:routes")
async def cb_routes(cb: CallbackQuery, campus_api: CampusApi, session: UserSession | None) -> None:
    try:
        routes = await campus_api.routes(token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not routes:
        await safe_edit(cb, "🔵 Маршруты пока не добавлены.", back_home_kb())
        return

    lines = ["🧭 <b>Маршруты между корпусами</b>", ""]
    for r in routes[:10]:
        from_b = r.get("fromBuildingName") or r.get("fromBuildingId") or "?"
        to_b = r.get("toBuildingName") or r.get("toBuildingId") or "?"
        duration = r.get("durationMinutes") or r.get("duration") or ""
        hint = r.get("description") or r.get("hint") or ""
        line = f"• <b>{from_b}</b> → <b>{to_b}</b>"
        if duration:
            line += f" · ~{duration} мин"
        lines.append(line)
        if hint:
            lines.append(f"  <i>{hint}</i>")
    await safe_edit(cb, "\n".join(lines), back_home_kb())
