# ISU GSTOU Authorization Integration Plan

## 1. Что мы узнали об ИСУ ГГНТУ

### Фронтенд ИСУ
- **URL**: `https://isu.gstou.ru` — React SPA (webpack, `webpackJsonpfrontend-vkr`)
- **Backend URL**: `https://backend-isu.gstou.ru` (найден в JS-бандле как `Te = "https://backend-isu.gstou.ru"`)
- **Авторизация**: форма с полями `username` (числовой ID студента, напр. `25400609`) и `password`
- **Токен**: хранится в cookie `token` (через js-cookie), в Redux — `"Bearer " + payload`
- **Роли ИСУ**: `student`, `teacher`, `admin`, `dumr`, `brs_admin`, `employee`, `super`, `deccan`

### Меню студента в ИСУ
- `/` — Дашборд (рейтинг, профиль, оценки)
- `/brs` — БРС (успеваемость)
- `/time-table` — Расписание занятий
- `/time-table-exams` — Расписание экзаменов
- `/library` — Библиотека
- `/payment` — Онлайн оплата
- `/applications` — Заявки (внешняя ссылка на `https://isu.gstou.ru/applications`)

### Меню преподавателя в ИСУ
- Эффективный контракт (`/effective-contracts`)
- БРС: Журнал посещаемости (`/journal-pos`), Журнал успеваемости (`/journal-usp`), Ведомости (`/statements`)
- Расписание занятий / экзаменов

### Redux-стейт (из анализа JS-бандла)
```
SET_USER_DATA          — {user_id, role[], full_name}
SET_IS_AUTH            — boolean
SET_USER_TOKEN         — токен (хранится как "Bearer " + token)
SET_USER_ROLES         — массив ролей
SET_STUDENT_DHASBOARD_RATING  — рейтинг студента
SET_STUDENT_DISCIPLINES_GRADES — оценки по дисциплинам (БРС)
SET_STUDENT_PROFILE    — профиль студента
SET_SEMESTER_YEAR_START / END / NUMBER — параметры семестра (start, end, num)
```

### Подтверждённые API-эндпоинты ИСУ (проверено 2026-05-16)

#### ✅ Авторизация — `/api/token/` (ПОДТВЕРЖДЕНО)
- **Метод**: `POST`
- **URL**: `https://backend-isu.gstou.ru/api/token/`
- **Content-Type**: `application/json`
- **Тело**: `{"username": "25400609", "password": "..."}`
- **Ответ (200 OK)**:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user_id": 46033,
  "role": ["student"],
  "dep": null,
  "full_name": "Насимов нсар Аланович"
}
```
- **Важно**: ответ сразу содержит `full_name`, `user_id`, `role` — отдельный запрос профиля НЕ нужен!
- **Тип токена**: JWT (HS256), поле `exp` в payload
- **Срок жизни**: ~7 дней (`orig_iat` → `exp` ≈ 604800 секунд)

#### ❌ Протестированные и НЕ работающие эндпоинты (все 404):
- `/api/auth/login/`, `/api/auth/login`, `/api/login/`, `/auth/login/`
- `/api-token-auth/`, `/token/`, `/api/v1/login/`, `/login/`
- `/api/users/login/`, `/api/v1/users/login/`, `/api/v1/auth/token/`
- `/api/users/roles/`, `/api/user/roles/` (JWT auth)
- `/api/student/profile/`, `/api/users/profile/` (JWT auth)

#### ⚠️ Авторизация для защищённых запросов
- Заголовок: `Authorization: JWT <token>` (НЕ `Bearer`, а `JWT` — стандарт djangorestframework-jwt)
- Origin: `https://isu.gstou.ru`
- Referer: `https://isu.gstou.ru/`

#### Публичные эндпоинты (не требуют JWT)
| Назначение | Метод | URL | Параметры |
|---|---|---|---|
| Расписание группы | GET | `/api/timetable/public/entrie/` | `?group=ИСТ-б-о-22-1` |
| Расписание преподавателя | GET | `/api/timetable/public/entrie/` | `?teacher=Иванов` |
| Экзамены группы | GET | `/api/timetable/public/entrie/exam/` | `?group=ИСТ-б-о-22-1` |
| Экзамены преподавателя | GET | `/api/timetable/public/entrie/exam/` | `?teacher=Иванов` |
| Институты | GET | `/api/institutes/` | — |

#### Защищённые эндпоинты (JWT, могут 500 из-за VPN)
| Назначение | Метод | URL | Параметры |
|---|---|---|---|
| БРС оценки | GET | `/api/brs/student/disciplines-grades/` | `?year_start=&year_end=&semester=` |
| БРС дисциплины | GET | `/api/brs/student/disciplines/` | `?year_start=&year_end=&semester=` |
| БРС профиль | GET | `/api/brs/student/profile/` | `?year_start=&year_end=&semester=` |
| БРС средний балл | GET | `/api/brs/student/specialization-average/` | `?year_start=&year_end=&semester=` |
| Расписание студента | GET | `/api/timetable/student/entrie/` | — |
| Экзамены студента | GET | `/api/timetable/student/entrie/exam/` | — |
| Расписание преподавателя | GET | `/api/timetable/teacher/entrie/` | — |
| Экзамены преподавателя | GET | `/api/timetable/teacher/entrie/exam/` | — |
| Роли пользователя | GET | `/api/roles/` | — |
| Контракты | GET | `/api/contracts/` | — |
| Годы контрактов | GET | `/api/contracts/years/` | — |

#### Реализованные SmartCampus API роуты (проксируют в ISU)
| SmartCampus роут | ISU эндпоинт |
|---|---|
| `GET /brs/my` | `/api/brs/student/disciplines-grades/` |
| `GET /brs/profile` | `/api/brs/student/profile/` |
| `GET /brs/specialization-avg` | `/api/brs/student/specialization-average/` |
| `GET /brs/disciplines` | `/api/brs/student/disciplines/` |
| `GET /schedule/group/:name` | `/api/timetable/public/entrie/?group=` |
| `GET /schedule/teacher/:id` | `/api/timetable/public/entrie/?teacher=` |
| `GET /schedule/exam/group/:name` | `/api/timetable/public/entrie/exam/?group=` |
| `GET /schedule/exam/teacher/:id` | `/api/timetable/public/entrie/exam/?teacher=` |
| `GET /schedule/my` | `/api/timetable/student/entrie/` |
| `GET /schedule/my/exam` | `/api/timetable/student/entrie/exam/` |
| `GET /schedule/teacher-my` | `/api/timetable/teacher/entrie/` |
| `GET /schedule/teacher-my/exam` | `/api/timetable/teacher/entrie/exam/` |
| `GET /isu/institutes` | `/api/institutes/` |
| `GET /isu/roles` | `/api/roles/` |
| `GET /isu/contracts` | `/api/contracts/` |
| `GET /isu/contracts/years` | `/api/contracts/years/` |

---

## 2. Текущая архитектура SmartCampus

### Backend (Go, Gin)
```
internal/
├── config/config.go        — конфигурация из ENV
├── domain/                 — доменные типы (User, Schedule, ...)
├── repository/             — PostgreSQL-запросы
├── service/
│   ├── service.go          — бизнес-логика (Login, Register, ...)
│   ├── isu_client.go       — HTTP-клиент для публичного API расписания ИСУ
│   └── isu_schedule.go     — обработка расписания из ИСУ
├── handler/handler.go      — Gin-хендлеры + RegisterRoutes
├── response/               — AppError, OK, Created, WriteError
├── middleware/              — Auth (JWT), RateLimit, CORS, RequireRole
└── db/migrations/          — SQL-миграции (001–020)
```

### Текущая авторизация
1. `POST /api/v1/auth/login` — email + password → проверка в БД → JWT
2. `POST /api/v1/auth/register` — создание пользователя с хешем пароля
3. JWT содержит: `UserID`, `Email`, `Role`, `GroupName`, `PersonalDataConsent`
4. Токен проверяется в `middleware.Auth(jwtSecret)`

### Таблица users (PostgreSQL)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student','teacher','applicant','librarian','admin')),
    group_name VARCHAR(100) NULL,
    department VARCHAR(255) NULL,
    telegram_chat_id BIGINT NULL,
    telegram_username VARCHAR(255) NULL,
    is_telegram_verified BOOLEAN DEFAULT FALSE,
    personal_data_consent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Frontend (React, Vite, TypeScript)
```
src/
├── app/App.tsx              — React Router (все маршруты)
├── features/auth/store.ts   — Zustand-стор (user, token, isAuthenticated)
├── shared/api/
│   ├── client.ts            — axios + interceptors + tokenStorage
│   ├── types.ts             — TS-типы (User, AuthResult, LoginRequest, ...)
│   └── modules.ts           — API-модули (authApi, scheduleApi, ...)
├── pages/login/LoginPage.tsx — страница входа (email + password)
└── pages/...                — остальные страницы
```

---

## 3. План реализации

### 3.1 Backend: ISU Auth Client
**Файл**: `internal/service/isu_auth.go` (новый)

```go
// ISUAuthClient — клиент для авторизованного API ИСУ ГГНТУ.
type ISUAuthClient struct {
    http *http.Client
    redis *redis.Client
    log  *logger.Logger
}

// ISULoginResponse — ответ ИСУ на авторизацию.
type ISULoginResponse struct {
    Token string `json:"token"`
    // возможные дополнительные поля
}

// ISUStudentProfile — профиль студента из ИСУ.
type ISUStudentProfile struct {
    UserID     int      `json:"user_id"`
    FirstName  string   `json:"first_name"`
    MiddleName string   `json:"middle_name"`
    LastName   string   `json:"last_name"`
    GroupName  string   `json:"group_name"`
    Faculty    string   `json:"faculty"`
    Roles      []string `json:"roles"` // ["student"]
}

// ISUGrade — запись БРС из ИСУ.
type ISUGrade struct {
    DisciplineName string  `json:"discipline_name"`
    TeacherName    string  `json:"teacher_name"`
    Att1Current    float64 `json:"att1_current"`
    Att1Border     float64 `json:"att1_border"`
    Att2Current    float64 `json:"att2_current"`
    Att2Border     float64 `json:"att2_border"`
    Attendance     float64 `json:"attendance"`
    IndependentWork float64 `json:"independent_work"`
    Retake         float64 `json:"retake"`
    Bonus          float64 `json:"bonus"`
    Total          float64 `json:"total"`
    ExamType       string  `json:"exam_type"` // "exam" | "credit"
}
```

**Методы**:
- `Login(ctx, username, password) → (token string, err error)` — POST к ИСУ, получить токен
- `FetchProfile(ctx, isuToken) → (ISUStudentProfile, error)` — GET профиль с токеном
- `FetchGrades(ctx, isuToken, yearStart, yearEnd, semester) → ([]ISUGrade, error)` — GET БРС

**Эндпоинт авторизации**: `POST /api/token/` (подтверждён).
Ответ содержит `token`, `user_id`, `role[]`, `full_name`, `dep` — **профиль доступен прямо из логина**, отдельный `FetchProfile()` не нужен.
Для защищённых запросов использовать `Authorization: JWT <token>` (НЕ Bearer).

### 3.2 Backend: Domain Types
**Файл**: `internal/domain/brs.go` (новый)

```go
type BRSGrade struct {
    DisciplineName  string  `json:"disciplineName"`
    TeacherName     string  `json:"teacherName"`
    Att1Current     float64 `json:"att1Current"`
    Att1Border      float64 `json:"att1Border"`
    Att2Current     float64 `json:"att2Current"`
    Att2Border      float64 `json:"att2Border"`
    Attendance      float64 `json:"attendance"`
    IndependentWork float64 `json:"independentWork"`
    Retake          float64 `json:"retake"`
    Bonus           float64 `json:"bonus"`
    Total           float64 `json:"total"`
    ExamType        string  `json:"examType"`
}

type BRSResult struct {
    Grades      []BRSGrade `json:"grades"`
    SemesterNum int        `json:"semesterNum"`
    YearStart   int        `json:"yearStart"`
    YearEnd     int        `json:"yearEnd"`
}
```

### 3.3 Backend: Service — LoginISU
**Файл**: `internal/service/service.go` (изменения)

Новый метод `LoginISU(ctx, username, password, meta) → (ISUAuthResult, error)`:

1. Вызвать `ISUAuthClient.Login(username, password)` → получить `isuToken`
2. Вызвать `ISUAuthClient.FetchProfile(isuToken)` → получить профиль (ФИО, группа, факультет)
3. Сгенерировать синтетический email: `{username}@isu.gstou.ru`
4. Поискать пользователя по email в БД:
   - **Найден** → обновить ФИО, группу, факультет
   - **Не найден** → создать нового пользователя:
     - `email`: `{username}@isu.gstou.ru`
     - `password_hash`: случайный хеш (вход только через ИСУ)
     - `role`: маппинг из ИСУ-ролей (`student` → `student`, `teacher` → `teacher`)
     - `group_name`: из профиля ИСУ
     - `department`: из факультета ИСУ
5. Сохранить `isuToken` в Redis: `isu_session:{userId}` с TTL 30 минут
6. Выдать SmartCampus JWT
7. Вернуть `{user, token}` (стандартный `AuthResult`)

**Новый тип ответа** (расширенный):
```go
type ISUAuthResult struct {
    AuthResult
    ISUProfile ISUStudentProfile `json:"isuProfile,omitempty"`
}
```

### 3.4 Backend: Repository — Upsert User
**Файл**: `internal/repository/user_repository.go` (изменения)

Новый метод:
```go
func (r *Repository) UpsertUserByEmail(ctx, email string, params CreateUserParams) (domain.User, error)
```
- `INSERT ... ON CONFLICT(email) DO UPDATE SET full_name=..., group_name=..., department=..., updated_at=NOW()`

### 3.5 Backend: Handler + Route
**Файл**: `internal/handler/handler.go` (изменения)

Новый хендлер:
```go
func (h *Handler) ISULogin(c *gin.Context) {
    var req struct {
        Username string `json:"username"`
        Password string `json:"password"`
    }
    // ...вызвать h.svc.LoginISU(ctx, req.Username, req.Password, meta(c))
}

func (h *Handler) MyBRS(c *gin.Context) {
    // Достать userId из JWT
    // Достать isuToken из Redis (isu_session:{userId})
    // Вызвать ISUAuthClient.FetchGrades(isuToken, yearStart, yearEnd, semester)
    // Вернуть результат
}
```

Новые маршруты (в `RegisterRoutes`):
```go
api.POST("/auth/isu-login", middleware.RateLimit(...), h.ISULogin)
// В protected:
protected.GET("/brs/my", h.MyBRS)
```

### 3.6 Frontend: Types
**Файл**: `src/shared/api/types.ts` (изменения)

```typescript
export interface ISULoginRequest {
  username: string;
  password: string;
}

export interface BRSGrade {
  disciplineName: string;
  teacherName: string;
  att1Current: number;
  att1Border: number;
  att2Current: number;
  att2Border: number;
  attendance: number;
  independentWork: number;
  retake: number;
  bonus: number;
  total: number;
  examType: "exam" | "credit";
}

export interface BRSResult {
  grades: BRSGrade[];
  semesterNum: number;
  yearStart: number;
  yearEnd: number;
}
```

### 3.7 Frontend: API Modules
**Файл**: `src/shared/api/modules.ts` (изменения)

```typescript
// ---------- Auth ---------- (расширить)
export const authApi = {
  login: (data: LoginRequest) => post<AuthResult>("/auth/login", data),
  register: (data: RegisterRequest) => post<AuthResult>("/auth/register", data),
  isuLogin: (data: ISULoginRequest) => post<AuthResult>("/auth/isu-login", data),
};

// ---------- BRS ---------- (новый)
export const brsApi = {
  my: (params?: { yearStart?: number; yearEnd?: number; semester?: number }) =>
    get<BRSResult>("/brs/my", params),
};
```

### 3.8 Frontend: LoginPage — ISU Tab
**Файл**: `src/pages/login/LoginPage.tsx` (изменения)

Добавить табы переключения: **Email** | **ИСУ ГГНТУ**

При выборе "ИСУ ГГНТУ":
- Поле `username` (placeholder: "Логин ИСУ, напр. 25400609")
- Поле `password`
- Кнопка "Войти через ИСУ"
- Вызов `authApi.isuLogin({username, password})`
- При успехе: `setAuth(data.user, data.token)`, редирект на `/dashboard`

### 3.9 Frontend: BRS Page
**Файл**: `src/pages/brs/BRSPage.tsx` (новый)

- Заголовок "Балльно-рейтинговая система"
- Выбор семестра (год начала, год конца, номер семестра)
- Таблица оценок:
  - Дисциплина | Преподаватель | 1-я атт. (тек/руб) | 2-я атт. (тек/руб) | Посещ. | С/Р | Досдача | Прем. | Итого
- Разделение на "Экзамен" и "Зачёт"
- Запрос: `brsApi.my({yearStart, yearEnd, semester})`
- Если ISU-сессия истекла → показать сообщение "Сессия ИСУ истекла, войдите заново"

### 3.10 Frontend: Router
**Файл**: `src/app/App.tsx` (изменения)

```tsx
const BRSPage = lazy(() => import("@/pages/brs/BRSPage"));
// В authenticated routes:
<Route path="/brs" element={<BRSPage />} />
```

### 3.11 Frontend: Navigation
Добавить пункт "БРС" в сайдбар/навигацию (для студентов).

---

## 4. Миграция БД

**Файл**: `internal/db/migrations/021_isu_auth_support.sql`

```sql
-- Разрешить пустой password_hash для ISU-пользователей
-- (они авторизуются через ISU, не через локальный пароль)
-- Нет необходимости менять схему: используем синтетический email {login}@isu.gstou.ru
-- и случайный password_hash (вход через локальную форму невозможен).

-- Опционально: добавить поле для ISU ID (для явной связи)
-- ALTER TABLE users ADD COLUMN isu_student_id VARCHAR(50) NULL UNIQUE;
```

Решение без миграции: синтетический email `{login}@isu.gstou.ru` + случайный `password_hash`. Пользователи ИСУ не могут войти через обычную форму email/password — только через ИСУ.

---

## 5. Порядок реализации

1. **`domain/brs.go`** — типы БРС
2. **`service/isu_auth.go`** — ISU auth клиент (login, profile, grades)
3. **`repository/user_repository.go`** — добавить `UpsertUserByEmail`
4. **`service/service.go`** — добавить `LoginISU` + `MyBRS` методы
5. **`handler/handler.go`** — хендлеры `ISULogin`, `MyBRS` + роуты
6. **`shared/api/types.ts`** — типы ISULoginRequest, BRSGrade, BRSResult
7. **`shared/api/modules.ts`** — `authApi.isuLogin`, `brsApi.my`
8. **`pages/login/LoginPage.tsx`** — таб "ИСУ ГГНТУ"
9. **`pages/brs/BRSPage.tsx`** — страница БРС
10. **`app/App.tsx`** — маршрут `/brs`

---

## 6. Ключевые решения

| Вопрос | Решение |
|---|---|
| Как связать ISU-пользователя с локальным? | Синтетический email `{login}@isu.gstou.ru` |
| Как хранить ISU-токен? | Redis: `isu_session:{userId}` TTL 30 мин |
| Нужна ли миграция БД? | Нет, используем существующую схему |
| Маппинг ролей ISU → SmartCampus? | `student→student`, `teacher→teacher`, остальные → `student` |
| Что если ISU API недоступен? | Вернуть 502 + понятное сообщение |
| Что если ISU токен истёк при запросе БРС? | Вернуть 401 с пояснением "ISU session expired" |
| Безопасность: пароль ИСУ? | Не хранить, проксировать на лету к ISU backend |

---

## 7. Файлы для изменения/создания

### Новые файлы
- `backend/smartcampus-api/internal/domain/brs.go`
- `backend/smartcampus-api/internal/service/isu_auth.go`
- `frontend/smart-campus/src/pages/brs/BRSPage.tsx`

### Изменяемые файлы
- `backend/smartcampus-api/internal/repository/user_repository.go` — +UpsertUserByEmail
- `backend/smartcampus-api/internal/service/service.go` — +LoginISU, +MyBRS
- `backend/smartcampus-api/internal/handler/handler.go` — +ISULogin, +MyBRS хендлеры, +роуты
- `frontend/smart-campus/src/shared/api/types.ts` — +ISU/BRS типы
- `frontend/smart-campus/src/shared/api/modules.ts` — +isuLogin, +brsApi
- `frontend/smart-campus/src/pages/login/LoginPage.tsx` — +ISU таб
- `frontend/smart-campus/src/app/App.tsx` — +маршрут /brs

---

## 8. Неизвестные / Риски

### ✅ Закрытые риски (проверено 2026-05-16)
1. ~~**Точные эндпоинты ISU API**~~ — **Найден**: `POST /api/token/` — подтверждён, возвращает 200 с токеном.
2. ~~**Формат ответа ISU login**~~ — **Формат**: `{"token": "...", "user_id": N, "role": [...], "dep": null, "full_name": "..."}` — ключ `token`, JSON.
3. ~~**Срок жизни ISU-токена**~~ — **~7 дней** (604800 секунд, из JWT payload `exp - orig_iat`). Можно кэшировать в Redis дольше чем 30 минут.
4. ~~**CORS ISU**~~ — Go server-to-server запросы с `Origin: https://isu.gstou.ru` работают без проблем.
5. ~~**Авторизация защищённых запросов**~~ — Используется `Authorization: JWT <token>` (djangorestframework-jwt), НЕ `Bearer`.

### ⚠️ Оставшиеся риски
1. **Эндпоинты БРС** — ещё не найдены. Нужно тестировать с JWT-токеном: `/api/brs/`, `/api/student/grades/` и т.д.
2. **Формат данных БРС** — структура оценок может отличаться от предполагаемой.
3. **Rate limiting ISU** — ISU может ограничивать частоту запросов.
4. **Эндпоинты профиля** — `/api/user/roles/`, `/api/student/profile/` возвращают 404. Профиль доступен только из ответа `/api/token/`.
