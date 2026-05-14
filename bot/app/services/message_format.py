from __future__ import annotations

import html
from datetime import datetime
from typing import Any, Iterable

STATUS_EMOJI = {
    "approved": "🟢",
    "pending": "🟡",
    "rejected": "🔴",
    "cancelled": "⚪",
    "available": "🟢",
    "busy": "🔴",
    "free": "🟢",
}

STATUS_RU = {
    "approved": "подтверждено",
    "pending": "ожидает",
    "rejected": "отклонено",
    "cancelled": "отменено",
    "available": "свободно",
    "busy": "занято",
    "free": "свободно",
}

ROOM_TYPE_RU = {
    "lecture": "Лекционная",
    "computer_lab": "Компьютерный класс",
    "coworking": "Коворкинг",
    "meeting": "Переговорная",
    "office": "Офис",
    "library": "Библиотека",
    "lab": "Лаборатория",
    "other": "Прочее",
}

DIVIDER = "━━━━━━━━━━━━━━━"
SOFT_DIVIDER = "┄┄┄┄┄┄┄┄┄┄┄┄┄┄"


def esc(value: Any) -> str:
    if value is None:
        return ""
    return html.escape(str(value))


def status_badge(status: str | None) -> str:
    if not status:
        return ""
    key = status.lower()
    emoji = STATUS_EMOJI.get(key, "🔵")
    label = STATUS_RU.get(key, status)
    return f"{emoji} <b>{esc(label)}</b>"


def fmt_dt(value: str | None) -> str:
    if not value:
        return "—"
    try:
        cleaned = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        return dt.strftime("%d.%m.%Y %H:%M")
    except (ValueError, TypeError):
        return value


def fmt_time(value: str | None) -> str:
    if not value:
        return "—"
    try:
        cleaned = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        return dt.strftime("%H:%M")
    except (ValueError, TypeError):
        return value


def fmt_date(value: str | None) -> str:
    if not value:
        return "—"
    try:
        cleaned = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        return dt.strftime("%d.%m.%Y")
    except (ValueError, TypeError):
        return value


def header(title: str, emoji: str = "✨") -> str:
    return f"{emoji} <b>{esc(title)}</b>\n{DIVIDER}"


def section(title: str, emoji: str = "▪️") -> str:
    return f"\n{emoji} <b>{esc(title)}</b>\n{SOFT_DIVIDER}"


def kv(label: str, value: Any, emoji: str = "") -> str:
    prefix = f"{emoji} " if emoji else ""
    return f"{prefix}<b>{esc(label)}:</b> {esc(value)}"


def building_card(b: dict[str, Any]) -> str:
    name = b.get("name") or b.get("title") or "Корпус"
    lines = [header(str(name), "🏛")]
    if b.get("code"):
        lines.append(kv("Код", b["code"], "🔖"))
    if b.get("address"):
        lines.append(kv("Адрес", b["address"], "📍"))
    if b.get("navigationMode"):
        lines.append(kv("Навигация", b["navigationMode"], "🧭"))
    if b.get("description"):
        lines.append("")
        lines.append(f"<blockquote>{esc(b['description'])}</blockquote>")
    return "\n".join(lines)


def room_card(r: dict[str, Any]) -> str:
    number = r.get("number") or r.get("name") or "Аудитория"
    rtype = ROOM_TYPE_RU.get(str(r.get("type") or "").lower(), r.get("type") or "")
    lines = [header(str(number), "🚪")]
    if rtype:
        lines.append(kv("Тип", rtype, "🏷"))
    if r.get("buildingName"):
        lines.append(kv("Корпус", r["buildingName"], "🏛"))
    if r.get("floor") is not None or r.get("floorNumber") is not None:
        floor = r.get("floor") or r.get("floorNumber")
        lines.append(kv("Этаж", floor, "🪜"))
    if r.get("capacity"):
        lines.append(kv("Вместимость", r["capacity"], "👥"))
    eq: Iterable[Any] = r.get("equipment") or []
    if eq:
        lines.append("")
        lines.append("🛠 <b>Оборудование</b>")
        for e in eq:
            lines.append(f"  • {esc(e)}")
    if r.get("navigationHint"):
        lines.append("")
        lines.append(f"🧭 <blockquote>{esc(r['navigationHint'])}</blockquote>")
    return "\n".join(lines)


def booking_card(b: dict[str, Any]) -> str:
    title = b.get("title") or "Бронирование"
    status = b.get("status") or "pending"
    lines = [
        header(str(title), "📌"),
        status_badge(status),
        kv("Начало", fmt_dt(b.get("startsAt")), "🕓"),
        kv("Конец", fmt_time(b.get("endsAt")), "🏁"),
    ]
    if b.get("roomNumber") or b.get("roomName"):
        lines.append(kv("Аудитория", b.get("roomNumber") or b.get("roomName"), "🚪"))
    if b.get("purpose"):
        lines.append("")
        lines.append(f"📝 <blockquote>{esc(b['purpose'])}</blockquote>")
    return "\n".join(lines)


def schedule_item(s: dict[str, Any]) -> str:
    title = s.get("subject") or s.get("title") or "Занятие"
    start = fmt_time(s.get("startsAt") or s.get("startTime"))
    end = fmt_time(s.get("endsAt") or s.get("endTime"))
    room = s.get("roomNumber") or s.get("room") or ""
    teacher = s.get("teacherName") or s.get("teacher") or ""
    group = s.get("groupName") or ""
    lines = [f"📚 <b>{esc(title)}</b>", f"  🕓 <code>{start}—{end}</code>"]
    if room:
        lines.append(f"  🚪 {esc(room)}")
    if teacher:
        lines.append(f"  👨‍🏫 <i>{esc(teacher)}</i>")
    if group:
        lines.append(f"  👥 {esc(group)}")
    return "\n".join(lines)


def notification_card(n: dict[str, Any]) -> str:
    title = n.get("title") or "Уведомление"
    body = n.get("body") or n.get("message") or ""
    is_read = bool(n.get("isRead") or n.get("read"))
    icon = "📭" if is_read else "📬"
    lines = [f"{icon} <b>{esc(title)}</b>"]
    if body:
        lines.append(f"<blockquote>{esc(body)}</blockquote>")
    if n.get("createdAt"):
        lines.append(f"<i>{fmt_dt(n['createdAt'])}</i>")
    return "\n".join(lines)


def faq_card(f: dict[str, Any]) -> str:
    q = f.get("question") or f.get("title") or "Вопрос"
    a = f.get("answer") or f.get("body") or ""
    lines = [f"❓ <b>{esc(q)}</b>"]
    if a:
        lines.append(f"<blockquote>{esc(a)}</blockquote>")
    return "\n".join(lines)


def book_card(b: dict[str, Any]) -> str:
    title = b.get("title") or "Книга"
    author = b.get("author") or ""
    cat = b.get("category") or ""
    avail = b.get("availableCopies")
    total = b.get("totalCopies")
    location = b.get("location") or ""
    isbn = b.get("isbn") or ""
    description = b.get("description") or ""
    lines = [header(str(title), "📖")]
    if author:
        lines.append(kv("Автор", author, "✍️"))
    if cat:
        lines.append(kv("Категория", cat, "🏷"))
    if isbn:
        lines.append(kv("ISBN", isbn, "🔢"))
    if avail is not None:
        try:
            avail_int = int(avail)
        except (ValueError, TypeError):
            avail_int = 0
        emoji = "🟢" if avail_int > 0 else "🔴"
        if total is not None:
            lines.append(f"{emoji} <b>Доступно:</b> {esc(avail)} из {esc(total)}")
        else:
            lines.append(f"{emoji} <b>Доступно:</b> {esc(avail)}")
    if location:
        lines.append(kv("Где найти", location, "📍"))
    if description:
        lines.append("")
        lines.append(f"<blockquote>{esc(description)}</blockquote>")
    return "\n".join(lines)


LOAN_STATUS_RU = {
    "active": "активна",
    "returned": "возвращена",
    "overdue": "просрочена",
}

LOAN_STATUS_EMOJI = {
    "active": "🟢",
    "returned": "⚪",
    "overdue": "🔴",
}


def loan_card(ln: dict[str, Any]) -> str:
    """Render a library loan with embedded book (per swagger LibraryLoan)."""
    book = ln.get("book") if isinstance(ln.get("book"), dict) else {}
    title = (book or {}).get("title") or ln.get("bookTitle") or ln.get("title") or "—"
    author = (book or {}).get("author") or ""
    status = (ln.get("status") or "").lower()
    issued_at = ln.get("issuedAt")
    due_at = ln.get("dueAt") or ln.get("dueDate") or ln.get("returnBy")
    returned_at = ln.get("returnedAt")
    location = (book or {}).get("location") or ""

    emoji = LOAN_STATUS_EMOJI.get(status, "🔵")
    status_label = LOAN_STATUS_RU.get(status, status or "—")

    lines = [f"{emoji} <b>{esc(title)}</b>"]
    if author:
        lines.append(f"  ✍️ <i>{esc(author)}</i>")
    lines.append(f"  📊 Статус: <b>{esc(status_label)}</b>")
    if issued_at:
        lines.append(f"  📤 Выдана: {fmt_date(issued_at)}")
    if due_at:
        lines.append(f"  ⏳ Срок: {fmt_date(due_at)}")
    if returned_at:
        lines.append(f"  ✅ Возвращена: {fmt_date(returned_at)}")
    if location and status == "active":
        lines.append(f"  📍 {esc(location)}")
    return "\n".join(lines)


def ai_answer(payload: dict[str, Any]) -> str:
    answer = payload.get("answer") or "Нет ответа."
    sources = payload.get("sources") or []
    lines = [
        "🟣 <b>SmartCampus AI</b>",
        DIVIDER,
        "",
        esc(answer),
    ]
    if sources:
        lines.append("")
        lines.append(section("Источники", "📎"))
        for s in sources[:5]:
            t = s.get("type") or "ref"
            title = s.get("title") or s.get("id") or ""
            lines.append(f"  • <code>{esc(t)}</code> — <i>{esc(title)}</i>")
    return "\n".join(lines)


def error_text(message: str, code: str = "") -> str:
    head = "🔴 <b>Ошибка</b>"
    if code:
        head += f" <code>{esc(code)}</code>"
    return f"{head}\n{DIVIDER}\n{esc(message)}"


def info_text(message: str) -> str:
    return f"🔵 <i>{esc(message)}</i>"


def success_text(message: str) -> str:
    return f"🟢 <b>{esc(message)}</b>"


def truncate(text: str, limit: int = 3500) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"
