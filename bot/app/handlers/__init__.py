from aiogram import Router

from app.handlers import (
    ai,
    auth,
    bookings,
    campus,
    errors,
    faq,
    library,
    main_menu,
    notifications,
    profile,
    rooms,
    schedule,
    start,
)


def build_root_router() -> Router:
    root = Router(name="root")
    root.include_router(start.router)
    root.include_router(auth.router)
    root.include_router(main_menu.router)
    root.include_router(campus.router)
    root.include_router(rooms.router)
    root.include_router(schedule.router)
    root.include_router(bookings.router)
    root.include_router(faq.router)
    root.include_router(ai.router)
    root.include_router(library.router)
    root.include_router(notifications.router)
    root.include_router(profile.router)
    root.include_router(errors.router)
    return root
