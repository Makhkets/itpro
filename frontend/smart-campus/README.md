# SmartCampus ГГНТУ — Frontend

Единая цифровая среда Грозненского государственного нефтяного технического университета имени академика М.Д. Миллионщикова.

React + TypeScript + Vite. Tailwind, TanStack Query, Zustand, React Router, react-hook-form + zod, Recharts, Framer Motion.

## Запуск

```bash
npm install
cp .env.example .env   # отредактируйте VITE_API_BASE_URL при необходимости
npm run dev
```

По умолчанию dev-сервер на `http://localhost:5173`, API вызывается через `/api/v1` и проксируется на `http://localhost:8080/api/v1`.

## Скрипты

- `npm run dev` — dev-сервер с HMR
- `npm run build` — production-сборка
- `npm run preview` — предпросмотр production-сборки
- `npm run lint` — проверка TypeScript

## Архитектура

```
src/
  app/             # роутинг, точка входа
  shared/
    api/           # axios клиент, типы, API-модули
    ui/            # дизайн-система (Button, Card, Badge, …)
    lib/           # утилиты (cn, date, role)
    config/        # навигация и т.п.
  features/
    auth/          # store + guard'ы
  widgets/
    app-layout/    # десктоп + мобильный layout
    sidebar/       # боковая навигация
    topbar/        # шапка
  pages/
    login, register, applicant-faq          # public
    dashboard, profile, ai, notifications…  # общие
    rooms, schedule, bookings, library…     # student/teacher
    admin/                                  # CRUD и аналитика
    librarian/                              # библиотека
    applicant/                              # абитуриент
    teacher/                                # сессии посещаемости
```

## Брендинг

Цвета (Tailwind tokens):

| Токен            | Использование                  |
| ---------------- | ------------------------------- |
| `navy`           | sidebar, hero, текст           |
| `burgundy`       | primary CTA, акценты            |
| `accent-red`     | destructive, важные бейджи      |
| `surface`        | фон приложения                  |
| `surface-card`   | карточки                        |

Шрифты: **Montserrat** для основного текста и display-заголовков.

## Роли

`student` · `teacher` · `applicant` · `librarian` · `admin`. Sidebar и доступные роуты собираются автоматически в `shared/config/navigation.ts` и `features/auth/guards.tsx`.

## API

Используется бэкенд **SmartCampus API v1.1.0** (`swagger.yaml`). Базовый URL по умолчанию `/api/v1`; при необходимости он переопределяется через `VITE_API_BASE_URL`. JWT хранится в `localStorage` (`sc.token`). При получении 401 — авто-logout и redirect на `/login`.

## Что внутри

- **Login / Register** — два полноэкранных экрана с фирменной графикой.
- **Public FAQ** — посадочная для абитуриентов с поиском, категориями и CTA к AI.
- **Dashboard** — приветственный hero с текущей парой, KPI и быстрыми действиями.
- **Schedule** — сегодня / неделя, с группировкой по дням и состоянием «идёт сейчас».
- **Rooms** — каталог с фильтрами, детальная страница, окно доступности, навигация.
- **Bookings** — создание, личные заявки, админ-согласование с комментарием.
- **AI Chat** — официальный консультант: список сессий, suggestions, indicator, sources-ready UI.
- **Attendance** — студент видит баллы и прогресс-бар допуска; преподаватель ставит отметки матрицей.
- **Library** — каталог книг с обложками-плейсхолдерами, поиск, выдачи.
- **Telegram / Privacy / Profile / Notifications** — кабинет пользователя.
- **Admin** — корпуса, аудитории, маршруты, бронирования, FAQ, аналитика (Recharts), аудит-лог.

## Соглашения

- TypeScript strict, никаких `any` без причин.
- Запросы — `useQuery` / `useMutation` с кэш-инвалидацией.
- Все формы — `react-hook-form` + `zod` resolver.
- Адаптив: desktop sidebar (lg+), drawer на мобилке.
- Анимации — Framer Motion (только key moments).

---

© Грозненский государственный нефтяной технический университет имени академика М.Д. Миллионщикова
