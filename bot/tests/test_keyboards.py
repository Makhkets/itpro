from app.keyboards.ai import ai_after_answer_kb, ai_menu_kb
from app.keyboards.bookings import bookings_menu_kb
from app.keyboards.common import back_home_kb, login_required_kb, pagination_row
from app.keyboards.main import main_menu_kb


def _texts(kb):
    return [b.text for row in kb.inline_keyboard for b in row]


def _datas(kb):
    return [b.callback_data for row in kb.inline_keyboard for b in row if b.callback_data]


def test_main_menu_guest():
    kb = main_menu_kb(authorized=False)
    texts = _texts(kb)
    assert any("Войти" in t for t in texts)
    assert any("FAQ" in t for t in texts)


def test_main_menu_authorized():
    kb = main_menu_kb(authorized=True)
    datas = _datas(kb)
    assert "menu:campus" in datas
    assert "menu:schedule" in datas
    assert "menu:bookings" in datas
    assert "menu:ai" in datas
    assert "menu:library" in datas
    assert "menu:notifications" in datas
    assert "menu:profile" in datas


def test_back_home_kb_has_home_and_back():
    kb = back_home_kb()
    datas = _datas(kb)
    assert "menu:home" in datas
    assert "nav:back" in datas


def test_login_required_kb_has_login_button():
    kb = login_required_kb()
    assert "auth:login" in _datas(kb)


def test_pagination_row_excludes_buttons_at_edges():
    only_next = pagination_row("x", page=1, has_prev=False, has_next=True)
    assert len(only_next) == 2
    only_prev = pagination_row("x", page=5, has_prev=True, has_next=False)
    assert len(only_prev) == 2
    both = pagination_row("x", page=3, has_prev=True, has_next=True)
    assert len(both) == 3


def test_ai_menu_kb_session_branches():
    with_s = ai_menu_kb(has_session=True)
    no_s = ai_menu_kb(has_session=False)
    assert "ai:continue" in _datas(with_s)
    assert "ai:continue" not in _datas(no_s)


def test_ai_after_answer_has_cta():
    kb = ai_after_answer_kb()
    datas = _datas(kb)
    assert "ai:ask" in datas
    assert "ai:new" in datas


def test_bookings_menu_filters():
    kb = bookings_menu_kb()
    datas = _datas(kb)
    assert "bookings:filter:all:1" in datas
    assert "bookings:filter:pending:1" in datas
