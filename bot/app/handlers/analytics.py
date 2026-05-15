from __future__ import annotations

from typing import Any

from aiogram import F, Router
from aiogram.types import CallbackQuery

from app.api import AnalyticsApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.analytics import analytics_back_kb, analytics_menu_kb
from app.keyboards.common import login_required_kb
from app.services.message_format import DIVIDER, esc
from app.services.session_store import UserSession

router = Router(name="analytics")

STATUS_RU = {
    "admitted": ("🟢", "допуск есть"),
    "attendance_risk": ("🟡", "риск по посещаемости"),
    "points_risk": ("🟡", "риск по баллам"),
    "not_admitted": ("🔴", "допуска нет"),
    "no_data": ("🔵", "нет отметок"),
}


@router.callback_query(F.data == "menu:analytics")
async def cb_analytics_menu(cb: CallbackQuery, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Для аналитики нужно войти.", login_required_kb())
        return
    role = str(session.user.get("role") or "")
    await safe_edit(
        cb,
        "📊 <b>Аналитика</b>\n\nВыберите отчет:",
        analytics_menu_kb(role),
    )


@router.callback_query(F.data == "analytics:my")
async def cb_my_attendance(
    cb: CallbackQuery,
    analytics_api: AnalyticsApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите, чтобы увидеть посещаемость.", login_required_kb())
        return
    try:
        data = await analytics_api.my_attendance(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, _student_analytics_text(data), analytics_back_kb())


@router.callback_query(F.data == "analytics:policy")
async def cb_attendance_policy(
    cb: CallbackQuery,
    analytics_api: AnalyticsApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите, чтобы увидеть правила допуска.", login_required_kb())
        return
    try:
        policy = await analytics_api.attendance_policy(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, _policy_text(policy), analytics_back_kb())


@router.callback_query(F.data == "analytics:students")
async def cb_attendance_students(
    cb: CallbackQuery,
    analytics_api: AnalyticsApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    group = session.user.get("groupName") or None
    try:
        items = await analytics_api.attendance_students(session.token, group_name=group)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, _students_text(items, group), analytics_back_kb())


@router.callback_query(F.data == "analytics:summary")
async def cb_analytics_summary(
    cb: CallbackQuery,
    analytics_api: AnalyticsApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    try:
        data = await analytics_api.summary(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    await safe_edit(cb, _summary_text(data), analytics_back_kb())


def _student_analytics_text(data: dict[str, Any]) -> str:
    student = _dict(data.get("student"))
    summary = _dict(data.get("summary"))
    policy = _dict(data.get("policy"))
    emoji, status = STATUS_RU.get(str(data.get("admissionStatus") or ""), ("🔵", "статус неизвестен"))
    points_to = _int(data.get("pointsToAdmission"))
    points_hint = "порог выполнен" if points_to == 0 else f"нужно добрать {points_to}"
    name = student.get("fullName") or "Студент"
    group = student.get("groupName") or "—"

    lines = [
        "📈 <b>Моя посещаемость</b>",
        DIVIDER,
        f"👤 <b>{esc(name)}</b>",
        f"👥 Группа: <b>{esc(group)}</b>",
        "",
        f"{emoji} Статус: <b>{esc(status)}</b>",
        f"📊 Посещаемость: <b>{_fmt_percent(data.get('attendancePercent'))}</b>",
        f"🎯 Нужно: <b>{_fmt_percent(policy.get('requiredPercent'))}</b>",
        "",
        f"✅ Был: <b>{_int(summary.get('present'))}</b>",
        f"⏱ Опоздал: <b>{_int(summary.get('late'))}</b>",
        f"📄 Уважительно: <b>{_int(summary.get('excused'))}</b>",
        f"❌ Пропустил: <b>{_int(summary.get('absent'))}</b>",
        "",
        f"🏁 Баллы: <b>{_int(data.get('currentPoints'))}/{_int(policy.get('maxSemesterPoints'))}</b>",
        f"➖ Снято: <b>{_int(data.get('penaltyPoints'))}</b>",
        f"🎟 До допуска: <b>{esc(points_hint)}</b>",
        f"🧮 Запас пропусков: <b>{_int(data.get('remainingAbsencesBeforeRisk'))}</b>",
    ]
    recommendation = data.get("recommendation")
    if recommendation:
        lines.extend(["", f"<blockquote>{esc(recommendation)}</blockquote>"])
    return "\n".join(lines)


def _policy_text(policy: dict[str, Any]) -> str:
    lines = [
        "📋 <b>Правила допуска</b>",
        DIVIDER,
        f"🎟 Минимум для допуска: <b>{_int(policy.get('admissionMinPoints'))}</b>",
        f"🏁 Максимум за семестр: <b>{_int(policy.get('maxSemesterPoints'))}</b>",
        f"📊 Минимальная посещаемость: <b>{_fmt_percent(policy.get('requiredPercent'))}</b>",
        "",
        f"❌ Пропуск пары: <b>-{_int(policy.get('absencePenaltyPoints'))}</b>",
        f"⏱ Опоздание: <b>-{_int(policy.get('latePenaltyPoints'))}</b>",
        f"📄 Уважительная причина: <b>-{_int(policy.get('excusedPenaltyPoints'))}</b>",
    ]
    rule = policy.get("admissionRule")
    if rule:
        lines.extend(["", f"<blockquote>{esc(rule)}</blockquote>"])
    return "\n".join(lines)


def _students_text(items: list[dict[str, Any]], group: str | None) -> str:
    title = f"👥 <b>Студенты {esc(group)}</b>" if group else "👥 <b>Студенты и риски</b>"
    lines = [title, DIVIDER]
    if not items:
        lines.append("Нет данных по посещаемости.")
        return "\n".join(lines)
    for item in items[:12]:
        student = _dict(item.get("student"))
        policy = _dict(item.get("policy"))
        emoji, status = STATUS_RU.get(str(item.get("admissionStatus") or ""), ("🔵", "статус неизвестен"))
        name = student.get("fullName") or "Студент"
        group_name = student.get("groupName") or "—"
        lines.extend(
            [
                "",
                f"{emoji} <b>{esc(name)}</b> · {esc(group_name)}",
                f"  📊 {_fmt_percent(item.get('attendancePercent'))} · 🏁 {_int(item.get('currentPoints'))}/{_int(policy.get('maxSemesterPoints'))} · {esc(status)}",
            ]
        )
    if len(items) > 12:
        lines.append(f"\nПоказано 12 из {len(items)}.")
    return "\n".join(lines)


def _summary_text(data: dict[str, Any]) -> str:
    lines = [
        "📊 <b>Сводка кампуса</b>",
        DIVIDER,
        f"👥 Пользователи: <b>{_int(data.get('totalUsers'))}</b>",
        f"🏛 Корпуса: <b>{_int(data.get('totalBuildings'))}</b>",
        f"🚪 Аудитории: <b>{_int(data.get('totalRooms'))}</b>",
        f"📌 Бронирования: <b>{_int(data.get('totalBookings'))}</b>",
        f"🟡 Ожидают: <b>{_int(data.get('pendingBookings'))}</b>",
        f"📚 Книги: <b>{_int(data.get('totalBooks'))}</b>",
        f"📈 Средняя посещаемость: <b>{_fmt_percent(_float(data.get('averageAttendanceRate')) * 100)}</b>",
        f"🤖 AI-вопросы: <b>{_int(data.get('aiQuestionsCount'))}</b>",
    ]
    return "\n".join(lines)


def _dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def _fmt_percent(value: Any) -> str:
    try:
        return f"{float(value):.1f}%"
    except (TypeError, ValueError):
        return "0.0%"
