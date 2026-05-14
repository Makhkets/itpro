from app.services.message_format import (
    ai_answer,
    book_card,
    booking_card,
    esc,
    faq_card,
    fmt_date,
    fmt_dt,
    fmt_time,
    room_card,
    status_badge,
    truncate,
)


def test_status_badge_known():
    assert "🟢" in status_badge("approved")
    assert "🟡" in status_badge("pending")
    assert "🔴" in status_badge("rejected")


def test_fmt_dt_iso():
    assert fmt_dt("2026-05-14T09:30:00Z") == "14.05.2026 09:30"
    assert fmt_dt(None) == "—"
    assert fmt_dt("garbage") == "garbage"


def test_fmt_time_iso():
    assert fmt_time("2026-05-14T09:30:00Z") == "09:30"


def test_fmt_date_iso():
    assert fmt_date("2026-05-14T09:30:00Z") == "14.05.2026"


def test_esc_html_escapes():
    assert "&lt;b&gt;" in esc("<b>")
    assert esc(None) == ""


def test_room_card_has_number_and_type():
    text = room_card({"number": "A-305", "type": "lecture", "capacity": 30})
    assert "A-305" in text
    assert "Лекционная" in text
    assert "30" in text


def test_booking_card_has_status_and_time():
    text = booking_card(
        {
            "title": "Лекция",
            "status": "pending",
            "startsAt": "2026-05-14T09:30:00Z",
            "endsAt": "2026-05-14T11:00:00Z",
        }
    )
    assert "Лекция" in text
    assert "🟡" in text


def test_faq_card():
    text = faq_card({"question": "Как подать документы?", "answer": "Через сайт."})
    assert "Как подать документы?" in text
    assert "Через сайт." in text


def test_book_card_availability_emoji():
    free = book_card({"title": "T", "availableCopies": 3})
    busy = book_card({"title": "T", "availableCopies": 0})
    assert "🟢" in free
    assert "🔴" in busy


def test_ai_answer_renders_sources():
    text = ai_answer(
        {
            "answer": "Сегодня лекция в 9:00.",
            "sources": [{"type": "schedule", "title": "Расписание ИСИП-21"}],
        }
    )
    assert "Сегодня" in text
    assert "Источники" in text
    assert "Расписание ИСИП-21" in text


def test_truncate():
    assert truncate("abc", 10) == "abc"
    assert truncate("a" * 100, 10).endswith("…")
