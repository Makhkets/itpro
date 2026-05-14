from aiogram.fsm.state import State, StatesGroup


class RoomSearch(StatesGroup):
    waiting_query = State()


class BookSearch(StatesGroup):
    waiting_query = State()


class FaqSearch(StatesGroup):
    waiting_query = State()


class GroupSearch(StatesGroup):
    waiting_group = State()
