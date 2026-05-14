# SmartCampus Telegram Bot: ТЗ и промпт для генерации Python/aiogram проекта

Этот файл нужен, чтобы сгенерировать отдельный Telegram bot для SmartCampus MVP. Backend уже существует и предоставляет REST API. Bot должен быть отдельным Python-сервисом, который работает как Telegram frontend поверх backend.

Backend base URL по умолчанию:

```env
SMARTCAMPUS_API_BASE_URL=http://localhost:8080/api/v1
```

## Что важно

- Не реализовывать бизнес-логику заново в bot.
- Не подключаться напрямую к PostgreSQL и Redis.
- Не хранить пароль пользователя в bot.
- Все данные брать только через SmartCampus backend API.
- AI assistant вызывать только через `POST /api/v1/ai/chat`.
- FAQ, расписание, аудитории, бронирования, уведомления, библиотеку и privacy показывать через backend endpoints.
- Bot должен быть отдельным Python-проектом на последней стабильной версии `aiogram`.
- Bot должен быть красивым: inline-меню, аккуратные тексты, статусы, карточки, пагинация, быстрые действия.
- Если текущая версия Telegram Bot API/aiogram поддерживает цветные inline-кнопки или accent styles, использовать их. Если в конкретном клиенте Telegram цветные inline-кнопки недоступны, сделать graceful fallback через эмодзи, визуальные группы, short labels и WebApp/theme accent.

## Рекомендуемая архитектура bot-проекта

```text
smartcampus-telegram-bot/
  app/
    main.py
    config.py
    bot.py
    logging.py

    api/
      client.py
      auth.py
      campus.py
      schedule.py
      rooms.py
      bookings.py
      notifications.py
      faq.py
      ai.py
      library.py
      privacy.py

    keyboards/
      main.py
      auth.py
      campus.py
      schedule.py
      rooms.py
      bookings.py
      faq.py
      ai.py
      library.py
      profile.py

    handlers/
      start.py
      auth.py
      main_menu.py
      campus.py
      schedule.py
      rooms.py
      bookings.py
      faq.py
      ai.py
      library.py
      notifications.py
      profile.py
      errors.py

    middlewares/
      auth.py
      throttling.py
      logging.py

    states/
      auth.py
      booking.py
      ai.py
      search.py

    services/
      session_store.py
      message_format.py
      pagination.py

  tests/
    test_api_client.py
    test_formatters.py
    test_keyboards.py

  .env.example
  .gitignore
  Dockerfile
  docker-compose.yml
  pyproject.toml
  README.md
```

## Backend API, который должен использовать bot

### Auth

```http
POST /auth/login
GET /users/me
PATCH /users/me/personal-data-consent
```

Bot должен поддержать вход по email/password. После успешного login хранить только JWT token и user summary в session store. Пароль не сохранять.
После `PATCH /users/me/personal-data-consent` bot обязан обновить session user и заменить JWT на `token` из ответа, иначе старый JWT может содержать `personalDataConsent=false`.

### Telegram linking

```http
POST /telegram/link/start
POST /telegram/link/verify
PATCH /users/me/telegram
```

Рекомендуемый flow:

1. Пользователь логинится в bot.
2. Bot вызывает `POST /telegram/link/start`.
3. Backend возвращает code.
4. Bot вызывает `POST /telegram/link/verify` с `chatId`, `username`, `code`.
5. Bot показывает статус "Telegram привязан".

### Campus and rooms

```http
GET /buildings
GET /buildings/{id}
GET /buildings/{id}/floors
GET /rooms/search?q=305&buildingId=&type=&equipment=&capacityMin=
GET /rooms?buildingId=&floorId=&type=&page=1&pageSize=10
GET /rooms/{id}
GET /navigation/room/{roomId}
GET /navigation/routes?fromBuildingId=&toBuildingId=
```

### Schedule

```http
GET /rooms/{roomId}/schedule?from=&to=
GET /schedule/group/{groupName}?from=&to=
GET /schedule/teacher/{teacherId}?from=&to=
GET /schedule/current?buildingId=&roomId=&groupName=
GET /rooms/{roomId}/availability?date=YYYY-MM-DD
```

### Bookings

```http
POST /bookings
GET /bookings/my?status=&page=1&pageSize=10
GET /bookings/{id}
PATCH /bookings/{id}/cancel
```

Bot не должен делать admin approve/reject в student UI. Если пользователь admin, можно показать admin-раздел для pending bookings, но для MVP лучше оставить read-only или вынести в отдельный admin mode.

### Notifications

```http
GET /notifications?unreadOnly=true&page=1&pageSize=10
PATCH /notifications/{id}/read
PATCH /notifications/read-all
```

### FAQ

```http
GET /applicant-faq
GET /applicant-faq/search?q=документы
```

### AI assistant

```http
POST /ai/chat
GET /ai/sessions
GET /ai/sessions/{id}/messages
DELETE /ai/sessions/{id}
```

### Library

```http
GET /library/books/search?q=&author=&category=
GET /library/books/{id}
POST /library/books/{id}/borrow
GET /library/loans/my
```

### Privacy

```http
GET /privacy/me
POST /privacy/export
POST /privacy/delete-request
```

## UX и дизайн Telegram bot

Главное меню должно быть inline-based:

```text
🎓 SmartCampus

Выберите раздел:

[🗺 Кампус] [📅 Расписание]
[🔎 Аудитории] [📝 Бронирования]
[🤖 AI-ассистент] [❓ FAQ]
[📚 Библиотека] [🔔 Уведомления]
[👤 Профиль] [⚙️ Настройки]
```

Требования к inline UI:

- Все основные переходы через inline keyboard.
- Использовать callback data с префиксами: `menu:`, `campus:`, `schedule:`, `room:`, `booking:`, `faq:`, `ai:`, `library:`, `profile:`.
- Для длинных списков использовать pagination: `prev`, `next`, `back`, `home`.
- В каждом разделе должны быть кнопки `⬅️ Назад` и `🏠 Главное меню`.
- Тексты должны быть короткими, с карточками и статусами.
- Для состояний использовать эмодзи-цвета:
  - `🟢` доступно/успешно/approved
  - `🟡` pending/ожидает
  - `🔴` ошибка/rejected/занято
  - `🔵` информационный блок
  - `🟣` AI assistant
- Если aiogram/Telegram API поддерживает цветные inline button styles в текущей версии, применить:
  - primary/accent для главных CTA;
  - success для подтверждений;
  - danger для отмены;
  - neutral для навигации.
- Если styles недоступны, fallback: цветные эмодзи, аккуратные labels, группировка по строкам.

## AI agent behavior для Telegram bot

Bot не должен сам ходить в OpenAI или другой AI provider. Он должен отправлять запрос в backend:

```http
POST /api/v1/ai/chat
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "sessionId": "optional uuid",
  "message": "Где сегодня у группы ИСП-21 пары?"
}
```

Ответ backend:

```json
{
  "sessionId": "uuid",
  "answer": "Сегодня у группы ИСП-21...",
  "sources": [
    { "type": "schedule", "id": "uuid", "title": "Расписание группы ИСП-21" }
  ]
}
```

### System prompt для AI agent внутри bot

Этот prompt нужен не для вызова LLM напрямую, а как инструкция для handler-а bot-а, который решает: отправить вопрос в `/ai/chat`, показать FAQ, показать расписание или попросить уточнение.

```text
Ты Telegram AI-agent интерфейс SmartCampus.

Твоя задача:
- понять вопрос пользователя;
- выбрать правильное действие в SmartCampus backend;
- если вопрос общий или требует reasoning, отправить его в POST /api/v1/ai/chat;
- если вопрос явно про FAQ абитуриента, сначала попробовать GET /applicant-faq/search;
- если вопрос про расписание группы, использовать /schedule/group/{groupName} или /schedule/current;
- если вопрос про аудиторию, использовать /rooms/search и /navigation/room/{roomId};
- если вопрос про книгу, использовать /library/books/search;
- если вопрос про бронирование, показать flow создания бронирования и availability;
- не выдумывать данные, которых нет в ответе backend;
- не раскрывать персональные данные других пользователей;
- не запрашивать и не хранить пароль после login;
- отвечать коротко, дружелюбно, в стиле университетского помощника;
- всегда добавлять inline-кнопки с дальнейшими действиями.

Стиль ответа:
- 1 короткий заголовок;
- 2-5 строк полезной информации;
- если есть источники backend, показать блок "Источники";
- в конце дать inline-кнопки: "Подробнее", "Открыть расписание", "Найти аудиторию", "Назад", "Главное меню" по контексту.

Если пользователь не авторизован:
- разрешить только FAQ абитуриентов, справку о поступлении, контакты и login flow;
- для расписания, бронирований, AI-персонализации и уведомлений попросить войти.

Если backend вернул 401:
- очистить JWT из session store;
- показать кнопку "Войти снова".

Если backend вернул 403:
- объяснить, что нет прав или нет согласия на обработку данных;
- предложить открыть "Профиль -> Согласие на обработку данных".

Если backend недоступен:
- показать аккуратную ошибку и кнопку "Повторить".
```

## Готовый промпт для генерации bot-проекта

Скопируй весь блок ниже в AI-кодогенератор.

```text
Ты senior Python backend engineer, Telegram bot architect, aiogram expert, UX designer для conversational interfaces, QA engineer и technical writer.

Нужно сгенерировать отдельный production-ready MVP Telegram bot для проекта SmartCampus.

Backend уже существует и доступен как REST API:
SMARTCAMPUS_API_BASE_URL=http://localhost:8080/api/v1

Bot должен быть отдельным Python-проектом на последней стабильной версии aiogram.

Главная идея:
Telegram bot является frontend-интерфейсом к SmartCampus backend. Он не содержит бизнес-логику кампуса, не подключается к БД, не вызывает OpenAI напрямую. Все берет через backend API.

Обязательные технологии:
- Python 3.12+
- latest stable aiogram
- aiohttp или httpx async client
- pydantic-settings для env config
- pytest
- ruff
- mypy по возможности
- Dockerfile
- docker-compose.yml
- README.md

ENV:
BOT_TOKEN=
SMARTCAMPUS_API_BASE_URL=http://localhost:8080/api/v1
BOT_MODE=polling
WEBHOOK_URL=
WEBHOOK_SECRET=
SESSION_TTL_HOURS=24
REQUEST_TIMEOUT_SECONDS=15
LOG_LEVEL=INFO

Архитектура:
app/main.py
app/config.py
app/bot.py
app/logging.py
app/api/client.py
app/api/auth.py
app/api/campus.py
app/api/schedule.py
app/api/rooms.py
app/api/bookings.py
app/api/notifications.py
app/api/faq.py
app/api/ai.py
app/api/library.py
app/api/privacy.py
app/keyboards/*.py
app/handlers/*.py
app/middlewares/*.py
app/states/*.py
app/services/session_store.py
app/services/message_format.py
app/services/pagination.py
tests/

Реализовать функции:
1. /start
   - красивое приветствие SmartCampus;
   - если пользователь не авторизован, показать "Войти", "FAQ абитуриента", "О проекте";
   - если авторизован, показать главное меню.

2. Auth
   - login по email/password через POST /auth/login;
   - хранить JWT в session store по telegram_user_id;
   - пароль не сохранять и не логировать;
   - logout очищает session.

3. Telegram linking
   - после login вызвать POST /telegram/link/start;
   - затем POST /telegram/link/verify с chatId, username, code;
   - показать статус привязки.

4. Главное меню inline:
   [🗺 Кампус] [📅 Расписание]
   [🔎 Аудитории] [📝 Бронирования]
   [🤖 AI-ассистент] [❓ FAQ]
   [📚 Библиотека] [🔔 Уведомления]
   [👤 Профиль] [⚙️ Настройки]

5. Campus
   - список корпусов GET /buildings;
   - этажи GET /buildings/{id}/floors;
   - аудитории корпуса GET /rooms?buildingId=...;
   - маршрут между корпусами GET /navigation/routes.

6. Rooms
   - поиск аудитории по номеру/названию;
   - GET /rooms/search?q=...;
   - карточка аудитории: корпус, этаж, тип, вместимость, оборудование;
   - кнопки: "Навигация", "Расписание", "Свободные окна", "Забронировать".

7. Navigation
   - GET /navigation/room/{roomId};
   - показать navigationHint, nearbyLandmarks, mapImageUrl/x/y если есть.

8. Schedule
   - "Мое расписание" по groupName пользователя;
   - "Расписание группы" с вводом groupName;
   - "Текущая/следующая пара" через /schedule/current;
   - "Расписание аудитории" через /rooms/{roomId}/schedule.

9. Availability and bookings
   - показать availability по дате;
   - создать booking через POST /bookings;
   - список моих booking GET /bookings/my;
   - cancel pending booking PATCH /bookings/{id}/cancel.

10. Notifications
   - unread notifications GET /notifications?unreadOnly=true;
   - read one / read all.

11. FAQ абитуриентов
   - доступен без login;
   - поиск GET /applicant-faq/search?q=...;
   - красивый режим "Задать вопрос";
   - fallback: "Я не нашел точный ответ, обратитесь в приемную комиссию".

12. AI assistant
   - доступен после login и consent;
   - все вопросы отправлять в POST /ai/chat;
   - поддерживать sessionId;
   - показывать sources;
   - добавить кнопки "Продолжить диалог", "Новый чат", "История".
   - использовать AI agent behavior prompt из docs как поведение handler-а.

13. Library
   - поиск книг GET /library/books/search;
   - карточка книги: title, author, category, availableCopies, location;
   - кнопка "Взять книгу" вызывает POST /library/books/{id}/borrow;
   - мои выдачи GET /library/loans/my, отображать вложенный `book.title`, `book.author`, `dueAt`, `status`.

14. Profile and privacy
   - GET /users/me;
   - PATCH /users/me/personal-data-consent;
   - POST /privacy/export;
   - POST /privacy/delete-request.

UX требования:
- все меню через inline keyboards;
- аккуратные карточки;
- pagination для списков;
- кнопки Назад и Главное меню везде;
- дружелюбный русский язык;
- статусы через цветные эмодзи;
- если aiogram/Telegram API поддерживает цветные inline button styles в текущей версии, использовать их;
- если цветные styles недоступны, сделать fallback через эмодзи и визуальную группировку.

Безопасность:
- не логировать пароль, JWT, Authorization header, BOT_TOKEN;
- хранить JWT только в session store;
- при 401 очищать session;
- при 403 показывать понятное объяснение;
- rate-limit пользовательских действий через middleware;
- таймауты API-запросов;
- единый обработчик ошибок backend error format:
  {"error":{"code":"...","message":"...","details":{}}}

Тесты:
- API client builds correct requests;
- error parser;
- keyboard builders;
- formatters;
- auth session store;
- AI chat request formatting.

Документация:
- README с запуском;
- .env.example;
- описание demo flow;
- список backend endpoints;
- команды pytest/ruff/mypy.

Сгенерируй весь проект файлами. Код должен быть аккуратным, типизированным, async-first и готовым к demo.
```

## Demo flow для bot

1. Пользователь запускает `/start`.
2. Bot показывает красивое главное меню.
3. Student логинится.
4. Bot автоматически привязывает Telegram через backend linking endpoints.
5. Student выбирает `🔎 Аудитории`, вводит `305`.
6. Bot показывает карточку `A-305`.
7. Student нажимает `🧭 Навигация`.
8. Bot показывает текстовый маршрут по старому корпусу.
9. Student нажимает `📅 Расписание`.
10. Bot показывает пары в аудитории.
11. Student нажимает `🤖 AI-ассистент` и спрашивает: "Где сегодня у группы ИСП-21 пары?"
12. Bot вызывает backend `/ai/chat` и красиво показывает ответ с источниками.
13. Applicant без login открывает `❓ FAQ` и спрашивает: "Как подать документы?"
14. Bot вызывает backend `/applicant-faq/search` и показывает ответ.
