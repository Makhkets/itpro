# SmartCampus MVP

SmartCampus MVP - backend-платформа "Умный кампус" для хакатона. API объединяет карту кампуса, поиск аудиторий, расписание, бронирование помещений, привязку Telegram-аккаунта, AI-ассистента, FAQ для абитуриентов, аналитику посещаемости и базовую автоматизацию библиотеки.

Важно: Telegram bot runtime вынесен из backend. Go-сервис больше не содержит Telegram webhook, не хранит `TELEGRAM_BOT_TOKEN` и не вызывает Telegram Bot API напрямую. Отдельный Python/aiogram bot должен работать как клиент этого API.

## MVP функции

- JWT-аутентификация, bcrypt-пароли и RBAC для ролей `student`, `teacher`, `applicant`, `librarian`, `admin`.
- Корпуса, этажи, аудитории, поиск аудитории 305 и текстовая навигация для старых корпусов.
- Расписание аудиторий, групп и преподавателей, current/next lesson и availability.
- Бронирования с approve/reject/cancel, проверкой конфликтов и in-app уведомлениями.
- Telegram account linking для внешнего Python/aiogram bot.
- AI assistant через OpenAI-compatible provider или безопасный fallback mode без `AI_API_KEY`.
- Посещаемость, аналитика посещаемости, библиотечные книги и выдачи.
- Privacy endpoints: просмотр, экспорт и запрос удаления персональных данных.
- Audit log для чувствительных действий.

## Стек

Go 1.26, Gin, PostgreSQL 18, Redis 8, pgx/pgxpool, JWT, bcrypt, Docker Compose, testify, golangci-lint/gosec compatible CI.

## Архитектура

```text
cmd/api                 entrypoint
internal/app            server/router
internal/config         env config
internal/db             postgres, redis, migrations
internal/domain         domain models
internal/repository     parameterized SQL
internal/service        business logic
internal/handler        HTTP handlers
internal/middleware     auth, RBAC, rate limit, CORS
internal/security       bcrypt, JWT, PII masking
docs                    Swagger, frontend API guide, bot prompt
```

Handlers не хранят бизнес-правила approve/AI/privacy/library; критичные проверки вынесены в service layer. SQL-запросы параметризованы через pgx.

## Запуск

```bash
cp .env.example .env
docker compose up --build
```

API: `http://localhost:8080`  
Health: `GET /api/v1/health`  
Swagger UI: `http://localhost:8080/swagger/index.html`  
Adminer: `http://localhost:8081`

Миграции применяются автоматически при старте API. Отдельно:

```bash
make migrate-up
make seed
```

## Тестовые пользователи

| Роль | Email | Password |
| --- | --- | --- |
| admin | `admin@example.com` | `Admin123!` |
| teacher | `teacher@example.com` | `Teacher123!` |
| student | `student@example.com` | `Student123!` |
| applicant | `applicant@example.com` | `Applicant123!` |
| librarian | `librarian@example.com` | `Librarian123!` |

## Demo flow

1. Student логинится через `/api/v1/auth/login`.
2. Выбирает корпус через `/api/v1/buildings`.
3. Ищет аудиторию `305` через `/api/v1/rooms/search?q=305`.
4. Открывает `/api/v1/navigation/room/{roomId}` и видит корпус, этаж, оборудование и текстовую подсказку.
5. Смотрит `/api/v1/rooms/{roomId}/schedule` и `/api/v1/rooms/{roomId}/availability`.
6. Создает `/api/v1/bookings`.
7. Admin подтверждает `/api/v1/bookings/{id}/approve`.
8. Создается in-app notification; внешний Telegram bot может показать ее пользователю через API.
9. Student задает вопрос `/api/v1/ai/chat`: "Где сегодня у группы ИСП-21 пары?"
10. Applicant пишет внешнему Telegram bot вопрос про документы; bot ищет ответ через `/api/v1/applicant-faq/search`.
11. Admin смотрит `/api/v1/analytics/attendance/summary`.
12. Student ищет книгу через `/api/v1/library/books/search`, берет ее через `/api/v1/library/books/{id}/borrow`, затем видит ее в `/api/v1/library/loans/my`.

## Безопасность персональных данных

- Пароли хранятся только как bcrypt hash.
- JWT secret и AI key читаются только из env.
- `password_hash` никогда не сериализуется в JSON.
- Middleware не логирует `Authorization`, JWT, password и AI secrets.
- RBAC закрывает admin, teacher и librarian endpoints.
- AI prompts маскируют email, phone, Telegram username и chat id.
- Если `personal_data_consent=false`, Telegram linking и персонализированный AI запрещены.
- Audit log пишется для login, failed login, register, consent update, telegram link, booking actions, schedule/room creation, attendance, library loan и AI request.

## Telegram bot

Telegram bot должен жить как отдельный Python/aiogram сервис и использовать SmartCampus backend как API.

Backend endpoints для bot-интеграции:

- `POST /api/v1/auth/login`
- `POST /api/v1/telegram/link/start`
- `POST /api/v1/telegram/link/verify`
- `GET /api/v1/applicant-faq/search`
- `GET /api/v1/schedule/current`
- `GET /api/v1/schedule/group/{groupName}`
- `GET /api/v1/rooms/search`
- `GET /api/v1/navigation/room/{roomId}`
- `POST /api/v1/ai/chat`
- `GET /api/v1/bookings/my`
- `GET /api/v1/notifications`
- `GET /api/v1/library/books/search`
- `POST /api/v1/library/books/{id}/borrow`
- `GET /api/v1/library/loans/my`

Техническое задание и готовый промпт для генерации отдельного bot-проекта лежат в [docs/telegram-bot-generator-prompt.md](docs/telegram-bot-generator-prompt.md).

## AI provider setup

```env
AI_PROVIDER=openai_compatible
AI_API_KEY=
AI_BASE_URL=https://api.example.com/v1
AI_MODEL=gpt-4o-mini
```

Если `AI_API_KEY` пустой, assistant работает в fallback mode по расписанию, аудиториям, FAQ и библиотеке.

## Команды

```bash
make run
make fmt
make test
make test-cover
make lint
make security
make docker-up
make docker-down
make swagger
```

## Ограничения MVP

Нет Kubernetes, микросервисов, WebSocket, SSO/AD, полноценного импорта расписания, сложной indoor-навигации с графами, recurring schedules и ML-аналитики.

## Future scope

- Импорт расписания из внешней системы.
- SSO/Active Directory.
- WebSocket/push notifications.
- Indoor routing graph и карты этажей.
- Recurring schedule engine.
- ML-анализ загрузки аудиторий и посещаемости.
