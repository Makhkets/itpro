from aiogram.fsm.state import State, StatesGroup


class AuthFlow(StatesGroup):
    waiting_email = State()
    waiting_password = State()


class RegisterFlow(StatesGroup):
    waiting_full_name = State()
    waiting_email = State()
    waiting_password = State()
    waiting_role = State()
    waiting_group = State()
    waiting_department = State()
