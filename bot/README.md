# SmartCampus Telegram Bot

Telegram-фронтенд для SmartCampus backend. Бот — отдельный Python-сервис на aiogram 3.x, который вызывает REST API SmartCampus и не содержит собственной бизнес-логики.

## Возможности

- Авторизация студентов и абитуриентов по email/password
- Привязка Telegram-аккаунта к backend-аккаунту
- Главное inline-меню: Кампус, Расписание, Аудитории, Бронирования, AI, FAQ, Библиотека, Уведомления, Профиль
- Поиск аудиторий по номеру, навигация, расписание помещения, свободные окна
- Расписание группы, моё расписание, текущая/следующая пара
- Создание и отмена бронирований
- AI-ассистент (запросы идут в `/ai/chat` на бэкенде)
- FAQ абитуриента (доступен без логина)
- Поиск книг и список своих выдач
- Уведомления с фильтром «только непрочитанные» и кнопкой «прочитать все»
- Управление согласием на обработку данных, экспорт и запрос на удаление

## Архитектура

```
app/
  main.py             # точка входа, polling/webhook
  bot.py              # сборка бота, DI, middleware
  config.py           # pydantic-settings
  logging.py          # логирование + фильтр секретов
  api/                # тонкие async-клиенты к backend
  keyboards/          # inline-клавиатуры
  handlers/           # роутеры aiogram по разделам
  middlewares/        # auth, throttling, logging
  states/             # FSM
  services/           # session store, форматтеры, пагинация
tests/                # pytest
```

Бот никогда не ходит напрямую в БД и не обращается к OpenAI. Все данные — только через `SMARTCAMPUS_API_BASE_URL`.

## Безопасность

- Пароль не сохраняется и не логируется — сразу обменивается на JWT через `/auth/login`
- JWT хранится только в in-memory `SessionStore` по `telegram_user_id` с TTL
- Логи фильтруются от чувствительных полей (`password`, `token`, `authorization`, `bot_token`, `secret`)
- 401 → очистка сессии и кнопка «Войти снова»
- 403 → объяснение и кнопка «Дать согласие»
- 5xx → кнопка «Повторить»
- Throttling middleware ограничивает частоту команд

## Конфигурация

Скопируйте `.env.example` в `.env` и заполните:

```env
BOT_TOKEN=...                                # токен от @BotFather
TELEGRAM_PROXY_URL=                          # http://user:password@host:port, socks5://user:password@host:port or host:port:user:password
TELEGRAM_REQUEST_TIMEOUT_SECONDS=30
SMARTCAMPUS_API_BASE_URL=http://localhost:8080/api/v1
BOT_MODE=polling                              # polling | webhook
WEBHOOK_URL=                                  # для webhook-режима
WEBHOOK_SECRET=
DROP_PENDING_UPDATES=false                    # true = удалить очередь Telegram при старте
SESSION_TTL_HOURS=24
REQUEST_TIMEOUT_SECONDS=30
LOG_LEVEL=INFO
```

## Запуск локально

```bash
python -m venv .venv
. .venv/Scripts/activate    # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.main
```

## Запуск в Docker

```bash
docker compose up --build
```

В docker-compose backend ожидается на `host.docker.internal:8080`.

## Тесты, линтер, типы

```bash
pip install -e ".[dev]"
pytest -q
ruff check .
mypy app
```

## Backend endpoints, которые использует бот

- `POST /auth/login`, `GET /users/me`, `PATCH /users/me/personal-data-consent`
- `POST /telegram/link/start`, `POST /telegram/link/verify`, `PATCH /users/me/telegram`
- `GET /buildings`, `GET /buildings/{id}`, `GET /buildings/{id}/floors`
- `GET /rooms/search`, `GET /rooms`, `GET /rooms/{id}`, `GET /rooms/{id}/availability`
- `GET /navigation/room/{roomId}`, `GET /navigation/routes`
- `GET /rooms/{roomId}/schedule`, `GET /schedule/group/{groupName}`, `GET /schedule/current`
- `POST /bookings`, `GET /bookings/my`, `GET /bookings/{id}`, `PATCH /bookings/{id}/cancel`
- `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`
- `GET /applicant-faq`, `GET /applicant-faq/search`
- `POST /ai/chat`, `GET /ai/sessions`, `GET /ai/sessions/{id}/messages`, `DELETE /ai/sessions/{id}`
- `GET /library/books/search`, `GET /library/books/{id}`, `GET /library/loans/my`
- `GET /privacy/me`, `POST /privacy/export`, `POST /privacy/delete-request`

## Demo flow

1. `/start` → главное меню
2. Гость нажимает «Войти» → вводит email/password → backend возвращает JWT
3. Бот автоматически привязывает Telegram через `link/start` + `link/verify`
4. «🚪 Аудитории» → ввод `305` → карточка `A-305`
5. «🧭 Навигация» → текстовый маршрут из `/navigation/room/{id}`
6. «📅 Расписание» → текущая пара для группы
7. «🤖 AI-ассистент» → «Где сегодня у группы ИСИП-21 пары?» → ответ из `/ai/chat` с источниками
8. «❓ FAQ» (без логина) → «Как подать документы?» → ответ из `/applicant-faq/search`

## UX-заметки

- Все основные переходы — inline. Callback-data использует префиксы `menu:`, `campus:`, `schedule:`, `rooms:`, `bookings:`, `faq:`, `ai:`, `library:`, `profile:`, `notif:`, `auth:`, `nav:`
- Списки пагинируются (5 на страницу) с кнопками `◀️ / ▶️`
- В каждом разделе есть `⬅️ Назад` и `🏠 Главное меню`
- Статусы и состояния обозначены цветными эмодзи: 🟢 успех/доступно, 🟡 ожидание, 🔴 ошибка/занято, 🔵 информация, 🟣 AI
