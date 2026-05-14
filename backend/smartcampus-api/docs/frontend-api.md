# SmartCampus MVP Frontend API

Base URL: `http://localhost:8080/api/v1`

Все защищенные endpoints требуют:

```http
Authorization: Bearer <jwt>
```

## Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  }
}
```

Коды: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `BAD_REQUEST`, `INTERNAL_ERROR`, `AI_PROVIDER_UNAVAILABLE`.

## Auth

`POST /auth/login`

```json
{ "email": "student@example.com", "password": "Student123!" }
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "fullName": "Student SmartCampus",
    "email": "student@example.com",
    "role": "student",
    "groupName": "ИСП-21",
    "personalDataConsent": true
  },
  "token": "jwt"
}
```

`POST /auth/register` принимает `fullName`, `email`, `password`, `role`, `groupName`, `department`. Public admin registration выключен, если `ALLOW_PUBLIC_ADMIN_REGISTER=false`.

`GET /users/me` возвращает текущего пользователя без `password_hash`.

`PATCH /users/me/personal-data-consent`

```json
{ "consent": true }
```

Response contains the updated user fields and a fresh `token`. Telegram bot must replace the stored JWT and session user after consent update; otherwise old JWT claims may still say `personalDataConsent=false`.

## Роли

- `student`: аудитории, расписание, свои бронирования, AI, библиотека, своя посещаемость.
- `teacher`: student + attendance для своих занятий.
- `applicant`: FAQ и applicant support через внешний Telegram bot.
- `librarian`: книги, выдачи, библиотечная аналитика.
- `admin`: все управление и аналитика.

## Campus

`GET /buildings`  
`GET /buildings/{id}`  
`POST /buildings` admin  
`PATCH /buildings/{id}` admin

Building payload:

```json
{
  "name": "Корпус A",
  "code": "A",
  "address": "Главная площадь, 1",
  "description": "Старый корпус",
  "isOldBuilding": true,
  "navigationMode": "text",
  "isActive": true
}
```

`GET /buildings/{buildingId}/floors`  
`POST /buildings/{buildingId}/floors` admin

## Rooms

`GET /rooms/search?q=305&buildingId=&type=computer_lab&equipment=projector&capacityMin=20`

`GET /rooms?buildingId={id}&floorId={id}&type=lecture&page=1&pageSize=20`

`GET /rooms/{id}`

`POST /rooms` admin:

```json
{
  "buildingId": "uuid",
  "floorId": "uuid",
  "number": "A-305",
  "name": "Компьютерный класс 305",
  "type": "computer_lab",
  "capacity": 28,
  "equipment": ["computers", "projector", "whiteboard"],
  "navigationHint": "Корпус A, 3 этаж...",
  "nearbyLandmarks": "Рядом кафедра информатики",
  "isBookable": true,
  "isActive": true
}
```

Room enum: `lecture`, `computer_lab`, `coworking`, `meeting`, `office`, `library`, `lab`, `other`.

## Navigation

`GET /navigation/room/{roomId}` возвращает:

```json
{
  "building": {},
  "floor": {},
  "room": {},
  "navigationHint": "Корпус A, 3 этаж...",
  "nearbyLandmarks": "Рядом кафедра информатики",
  "mapImageUrl": "",
  "xCoord": null,
  "yCoord": null
}
```

`GET /navigation/routes?fromBuildingId={id}&toBuildingId={id}` возвращает маршрут между корпусами.

`POST /navigation/routes`, `PATCH /navigation/routes/{id}` admin.

## Schedule

`GET /rooms/{roomId}/schedule?from=<RFC3339>&to=<RFC3339>`  
`GET /schedule/group/{groupName}?from=<RFC3339>&to=<RFC3339>`  
`GET /schedule/teacher/{teacherId}?from=<RFC3339>&to=<RFC3339>`  
`GET /schedule/current?buildingId=&roomId=&groupName=ИСП-21`

`POST /schedules`, `PATCH /schedules/{id}`, `DELETE /schedules/{id}` admin.

Schedule payload:

```json
{
  "roomId": "uuid",
  "title": "Базы данных",
  "teacherId": "uuid",
  "teacherName": "Teacher SmartCampus",
  "groupName": "ИСП-21",
  "startsAt": "2026-05-14T09:00:00Z",
  "endsAt": "2026-05-14T10:30:00Z",
  "source": "manual"
}
```

## Availability

`GET /rooms/{roomId}/availability?date=2026-05-14`

Response includes `busySlots`, `freeSlots`, `workingFrom`, `workingTo`.

## Bookings

`POST /bookings`

```json
{
  "roomId": "uuid",
  "title": "Командная работа",
  "purpose": "Подготовка проекта",
  "bookingType": "project_work",
  "startsAt": "2026-05-14T16:00:00Z",
  "endsAt": "2026-05-14T17:00:00Z"
}
```

`GET /bookings/my?status=pending`  
`GET /bookings?status=pending&roomId={id}` admin  
`PATCH /bookings/{id}/approve` admin  
`PATCH /bookings/{id}/reject` admin  
`PATCH /bookings/{id}/cancel`

Approve checks schedule and approved booking overlaps:

```text
existing.starts_at < requested.ends_at AND existing.ends_at > requested.starts_at
```

## Notifications

`GET /notifications?unreadOnly=true&page=1&pageSize=20`  
`PATCH /notifications/{id}/read`  
`PATCH /notifications/read-all`

## Telegram integration

Telegram bot вынесен в отдельный Python/aiogram сервис. Backend больше не содержит webhook и не отправляет сообщения напрямую в Telegram.

Backend оставляет endpoints для привязки аккаунта:

1. `POST /telegram/link/start` returns `{ "code": "...", "expiresIn": "10m", "command": "/link ..." }`.
2. External Telegram bot calls:

```json
POST /telegram/link/verify
{ "code": "AB12CD34", "chatId": 123456789, "username": "student" }
```

После привязки bot может авторизоваться в backend от имени пользователя или использовать service-account JWT и показывать пользователю расписание, FAQ, AI assistant, уведомления и библиотеку через backend API.

## AI assistant

`POST /ai/chat`

```json
{
  "sessionId": "",
  "message": "Где сегодня у группы ИСП-21 пары?"
}
```

Response:

```json
{
  "sessionId": "uuid",
  "answer": "Расписание группы ИСП-21: ...",
  "sources": [{ "type": "schedule", "id": "uuid", "title": "Базы данных" }]
}
```

`GET /ai/sessions`  
`GET /ai/sessions/{id}/messages`  
`DELETE /ai/sessions/{id}`

## Applicant FAQ

`GET /applicant-faq`  
`GET /applicant-faq/search?q=документы`  
`POST /applicant-faq`, `PATCH /applicant-faq/{id}`, `DELETE /applicant-faq/{id}` admin.

## Attendance

`POST /attendance/sessions` teacher/admin  
`GET /attendance/sessions?from=&to=` teacher/admin  
`POST /attendance/sessions/{id}/records` teacher/admin:

```json
{
  "records": [
    { "studentId": "uuid", "status": "present", "comment": "" }
  ]
}
```

Statuses: `present`, `absent`, `late`, `excused`.

`GET /attendance/my` student  
`GET /analytics/attendance/summary` admin  
`GET /analytics/attendance/by-group?groupName=ИСП-21` teacher/admin  
`GET /analytics/attendance/by-student/{studentId}` admin/teacher or same student.

## Library

`GET /library/books/search?q=базы&author=&category=`  
`GET /library/books/{id}`  
`POST /library/books/{id}/borrow` student/teacher, optional body:

```json
{
  "dueAt": "2026-06-01T00:00:00Z"
}
```

If `dueAt` is omitted, backend sets it to 14 days from now. Response is a loan with embedded `book`, so Telegram UI can immediately refresh "my loans".

`POST /library/books`, `PATCH /library/books/{id}` librarian/admin  
`POST /library/loans` librarian/admin:

```json
{
  "bookId": "uuid",
  "userId": "uuid",
  "dueAt": "2026-06-01T00:00:00Z"
}
```

`PATCH /library/loans/{id}/return` librarian/admin  
`GET /library/loans/my` student/teacher, returns loans with embedded `book`  
`GET /library/loans?status=active` librarian/admin  
`GET /analytics/library/summary` librarian/admin.

## Analytics

`GET /analytics/summary` admin  
`GET /analytics/bookings-by-status` admin  
`GET /analytics/room-utilization?from=&to=` admin  
`GET /analytics/telegram/summary` admin  
`GET /analytics/ai/summary` admin

## Privacy

`GET /privacy/me` shows stored personal data categories.  
`POST /privacy/export` returns JSON export for the current user.  
`POST /privacy/delete-request` creates an audit event and personal data event; data is not physically deleted in MVP.
