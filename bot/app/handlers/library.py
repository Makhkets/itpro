from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from app.api import ApiError, LibraryApi
from app.handlers._helpers import handle_api_error, safe_edit
from app.keyboards.common import back_home_kb, login_required_kb
from app.keyboards.library import (
    book_view_kb,
    books_list_kb,
    library_menu_kb,
    loans_admin_list_kb,
)
from app.services.message_format import book_card, esc, loan_card, success_text
from app.services.pagination import paginate
from app.services.session_store import UserSession
from app.states.search import BookSearch

router = Router(name="library")

PAGE_SIZE = 5
BORROW_ROLES = {"student", "teacher"}
LIBRARIAN_ROLES = {"librarian", "admin"}


@router.callback_query(F.data == "library:search")
async def cb_search(cb: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(BookSearch.waiting_query)
    await safe_edit(
        cb,
        "🔎 <b>Поиск книг</b>\n\nВведите название, автора или ключевое слово:",
        back_home_kb(),
    )


@router.message(BookSearch.waiting_query)
async def on_search_q(
    message: Message,
    state: FSMContext,
    library_api: LibraryApi,
    session: UserSession | None,
) -> None:
    q = (message.text or "").strip()
    await state.clear()
    if not q:
        await message.answer("Пустой запрос.")
        return
    role = (session.user.get("role") if session else "") or ""
    try:
        books = await library_api.search_books(token=session.token if session else None, q=q)
    except Exception as e:
        await handle_api_error(message, e)
        return
    if not books:
        await message.answer(
            f"🔵 По запросу <b>{esc(q)}</b> книг не найдено.",
            reply_markup=library_menu_kb(authorized=session is not None, role=role),
            parse_mode="HTML",
        )
        return
    pg = paginate(books, page=1, page_size=PAGE_SIZE)
    await message.answer(
        f"🔎 По запросу <b>{esc(q)}</b> найдено: <b>{pg.total}</b>",
        reply_markup=books_list_kb(pg.items, pg.page, pg.has_prev, pg.has_next),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("library:view:"))
async def cb_view(cb: CallbackQuery, library_api: LibraryApi, session: UserSession | None) -> None:
    book_id = (cb.data or "").split(":")[-1]
    try:
        b = await library_api.get_book(book_id, token=session.token if session else None)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    role = ((session.user.get("role") if session else "") or "").lower()
    can_borrow = bool(session) and role in BORROW_ROLES
    try:
        available = int(b.get("availableCopies") or 0) > 0
    except (ValueError, TypeError):
        available = False
    await safe_edit(
        cb,
        book_card(b),
        book_view_kb(book_id=str(b.get("id") or book_id), can_borrow=can_borrow, available=available),
    )


@router.callback_query(F.data.startswith("library:borrow:"))
async def cb_borrow(
    cb: CallbackQuery,
    library_api: LibraryApi,
    session: UserSession | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    role = (session.user.get("role") or "").lower()
    if role not in BORROW_ROLES:
        await safe_edit(
            cb,
            "🔵 Взять книгу могут только студенты и преподаватели.\n"
            f"Ваша роль: <code>{esc(role) or '—'}</code>",
            library_menu_kb(authorized=True, role=role),
        )
        return
    book_id = (cb.data or "").split(":")[-1]
    try:
        loan = await library_api.borrow_book(session.token, book_id)
    except ApiError as e:
        if e.status == 409:
            await safe_edit(
                cb,
                "🔴 <b>Не удалось взять книгу</b>\n━━━━━━━━━━━━━━━\n"
                "Нет свободных экземпляров или у вас уже есть активная выдача этой книги.",
                library_menu_kb(authorized=True, role=role),
            )
            return
        if e.status == 404:
            await safe_edit(
                cb,
                "🔴 Книга не найдена.",
                library_menu_kb(authorized=True, role=role),
            )
            return
        await handle_api_error(cb, e)
        return
    except Exception as e:
        await handle_api_error(cb, e)
        return
    text = success_text("Книга выдана!") + "\n\n" + loan_card(loan)
    await safe_edit(cb, text, library_menu_kb(authorized=True, role=role))


@router.callback_query(F.data == "library:my")
async def cb_my(cb: CallbackQuery, library_api: LibraryApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    role = (session.user.get("role") or "").lower()
    if role not in BORROW_ROLES:
        await safe_edit(
            cb,
            "🔵 Раздел «Мои выдачи» доступен только студентам и преподавателям.\n"
            f"Ваша роль: <code>{esc(role) or '—'}</code>",
            library_menu_kb(authorized=True, role=role),
        )
        return
    try:
        loans = await library_api.my_loans(session.token)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not loans:
        await safe_edit(
            cb,
            "🔵 У вас нет активных выдач.",
            library_menu_kb(authorized=True, role=role),
        )
        return
    lines = ["📖 <b>Мои выдачи</b>", "━━━━━━━━━━━━━━━", ""]
    for ln in loans[:10]:
        lines.append(loan_card(ln))
        lines.append("")
    await safe_edit(cb, "\n".join(lines), library_menu_kb(authorized=True, role=role))


# ───────────────────────── Librarian/admin: loans ─────────────────────────


@router.callback_query(F.data == "library:loans")
async def cb_loans_default(cb: CallbackQuery, library_api: LibraryApi, session: UserSession | None) -> None:
    await _render_admin_loans(cb, library_api, session, status=None)


@router.callback_query(F.data.startswith("library:loans:filter:"))
async def cb_loans_filter(cb: CallbackQuery, library_api: LibraryApi, session: UserSession | None) -> None:
    raw = (cb.data or "").split(":")[-1]
    status = None if raw == "all" else raw
    await _render_admin_loans(cb, library_api, session, status=status)


async def _render_admin_loans(
    cb: CallbackQuery,
    library_api: LibraryApi,
    session: UserSession | None,
    status: str | None,
) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    role = (session.user.get("role") or "").lower()
    if role not in LIBRARIAN_ROLES:
        await safe_edit(
            cb,
            "🔵 Раздел «Все выдачи» доступен только библиотекарю и администратору.\n"
            f"Ваша роль: <code>{esc(role) or '—'}</code>",
            library_menu_kb(authorized=True, role=role),
        )
        return
    try:
        loans = await library_api.list_loans(session.token, status=status)
    except Exception as e:
        await handle_api_error(cb, e)
        return
    if not loans:
        suffix = f" (фильтр: {esc(status)})" if status else ""
        await safe_edit(
            cb,
            f"🔵 Выдач не найдено{suffix}.",
            loans_admin_list_kb([], status=status),
        )
        return
    header_line = "📚 <b>Все выдачи</b>"
    if status:
        header_line += f" <i>· фильтр: {esc(status)}</i>"
    lines = [header_line, "━━━━━━━━━━━━━━━", ""]
    for ln in loans[:10]:
        lines.append(loan_card(ln))
        lines.append("")
    await safe_edit(cb, "\n".join(lines), loans_admin_list_kb(loans, status=status))


@router.callback_query(F.data.startswith("library:return:"))
async def cb_return(cb: CallbackQuery, library_api: LibraryApi, session: UserSession | None) -> None:
    if not session:
        await safe_edit(cb, "🔒 Войдите.", login_required_kb())
        return
    role = (session.user.get("role") or "").lower()
    if role not in LIBRARIAN_ROLES:
        await safe_edit(
            cb,
            "🔵 Возврат доступен только библиотекарю/администратору.",
            library_menu_kb(authorized=True, role=role),
        )
        return
    loan_id = (cb.data or "").split(":")[-1]
    try:
        loan = await library_api.return_loan(session.token, loan_id)
    except ApiError as e:
        if e.status == 409:
            await safe_edit(
                cb,
                "🔵 Эта выдача уже возвращена.",
                library_menu_kb(authorized=True, role=role),
            )
            return
        if e.status == 404:
            await safe_edit(
                cb,
                "🔴 Выдача не найдена.",
                library_menu_kb(authorized=True, role=role),
            )
            return
        await handle_api_error(cb, e)
        return
    except Exception as e:
        await handle_api_error(cb, e)
        return
    text = success_text("Книга возвращена.") + "\n\n" + loan_card(loan)
    await safe_edit(cb, text, library_menu_kb(authorized=True, role=role))
