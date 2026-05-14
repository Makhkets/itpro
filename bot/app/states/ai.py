from aiogram.fsm.state import State, StatesGroup


class AIChat(StatesGroup):
    waiting_message = State()
