from aiogram.fsm.state import State, StatesGroup


class BookingFlow(StatesGroup):
    waiting_title = State()
    waiting_purpose = State()
    waiting_date = State()
    waiting_time = State()
