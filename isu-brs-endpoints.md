# API ИСУ ГГНТУ — Полный справочник эндпоинтов

## Что это такое

Полный список API-эндпоинтов, извлечённых из JavaScript-бандла фронтенда ИСУ ГГНТУ.  
Парсинг проведён из `main.d406b48e.chunk.js` — найден объект `ra` (API-сервис) с **полными определениями всех вызовов** через `axios` (`ea`).

**Базовый URL бэкенда:** `https://backend-isu.gstou.ru`  
**Авторизация:** JWT-токен в заголовке `Authorization: Bearer <token>`  
**HTTP-клиент:** axios с interceptor для добавления токена

---

## Что можно делать с этими эндпоинтами

1. **Построить свой клиент** — написать мобильное или десктопное приложение, которое работает с ИСУ напрямую
2. **Автоматизировать получение оценок** — скрипт, который каждый день проверяет новые баллы БРС
3. **Парсить расписание** — получать расписание в удобном формате (JSON) для интеграции в календарь
4. **Мониторить успеваемость** — дашборд студента с графиками по семестрам
5. **Интегрировать в SmartCampus** — использовать эти эндпоинты как прокси через наш бэкенд
6. **Автоматизация для преподавателей** — массовое выставление баллов, выгрузка ведомостей
7. **Экспорт данных** — выгрузка контрактов, ведомостей, расписания в Excel/PDF
8. **Уведомления** — бот в Telegram, который шлёт уведомления когда появляются новые оценки

---

## Обнаруженные роли пользователей

| Роль | Описание |
|------|----------|
| `student` | Студент |
| `teacher` | Преподаватель |
| `dumr` | ДУМР (деканат по учебно-методической работе) |
| `admin` | Администратор |
| `superadmin` | Суперадминистратор |
| `employee` | Сотрудник |
| `deccan` | Декан |
| `brs_admin` | Администратор БРС |
| `pfr` | ПФР (перенаправляется на заявки) |

---

## 1. Авторизация и пользователи

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| POST | `/api/token/` | `getUserToken({username, password})` | Получить JWT-токен (сохраняется в cookie `token`) |
| GET | `/api/roles/` | `getUserRoles()` | Получить роли текущего пользователя |
| GET | `/api/users/{userId}/contracts/` | `getEffectiveContracts(userId)` | Контракты пользователя |
| GET | `/api/contracts-allowed/` | `getContractsAllowed()` | Доступен ли пользователю эффективный контракт |

---

## 2. Профиль

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/profile/` | `getUserProfile()` | Получить данные профиля |
| PATCH | `/api/profile/` | `updateUserProfile(data)` | Обновить профиль (multipart/form-data — для загрузки фото) |

---

## 3. БРС — Эндпоинты студента

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/brs/student/disciplines/` | `getStudenDisciplines()` | Список дисциплин студента за семестр |
| GET | `/api/brs/student/disciplines-grades/` | `getStudentDisciplinesGrades()` | Все оценки по всем дисциплинам сразу |
| GET | `/api/brs/student/grades/{disciplineId}/` | `getGrades(id)` | Баллы по конкретной дисциплине |
| GET | `/api/brs/student/journal/{disciplineId}/` | `getStudentAttends(id)` | Журнал посещаемости по занятиям |
| GET | `/api/brs/student/profile/` | `getStudentProfile()` | Профиль/сводка БРС студента |
| GET | `/api/brs/student/specialization-average/` | `getSpecializationAverage()` | Средний балл по специальности |

> **Параметры запроса для всех:** `start={год}&end={год}&semester={1\|2}` (формируются функцией `aa()` из Redux state)

### Объект дисциплины
```json
{
  "id": 123,
  "name": "Математический анализ",
  "reporting_type": "Зачет | Экзамен",
  "lecture_teacher": {"id": 1, "user_id": 10, "name": "Иванов И.И."},
  "practice_teacher": {"id": 2, "user_id": 20, "name": "Петров П.П."},
  "lab_teacher": {"id": 3, "user_id": 30, "name": "Сидоров С.С."},
  "is_open1": true,
  "is_open2": false
}
```

### Объект оценок
```json
{
  "pos": 85,
  "tek1": 15,
  "rub1": 20,
  "tek2": 10,
  "rub2": 15,
  "samost": 5,
  "dosdacha": 0,
  "premial": 0
}
```

| Поле | Расшифровка |
|------|-------------|
| `pos` | Итоговый балл (посещаемость) |
| `tek1` | Текущий контроль 1 |
| `rub1` | Рубежный контроль 1 |
| `tek2` | Текущий контроль 2 |
| `rub2` | Рубежный контроль 2 |
| `samost` | Самостоятельная работа |
| `dosdacha` | Досдача |
| `premial` | Премиальные баллы |

**ВАЖНО:** Параметры запроса — `start` / `end`, а НЕ `year_start` / `year_end`.

---

## 4. БРС — Эндпоинты преподавателя

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/brs/teacher/disciplines/{groupId}/` | `getTeacherGroups(groupId)` | Дисциплины преподавателя по группе |
| POST | `/api/brs/teacher/disciplines/{disciplineId}/set-grade/` | `setStudentGrade(id, data)` | Установить баллы студенту |
| GET | `api/brs/teacher/disciplines/{disciplineId}/get-grade/final/` | `getDisciplineGradeFinal(id)` | Получить итоговую оценку по дисциплине |
| POST | `api/brs/teacher/disciplines/{disciplineId}/set-grade/final/` | `updateDisciplineGradeFinal(id, data)` | Установить итоговую оценку |
| GET | `/api/brs/teacher/group/` | `getGroups({start, end, semester})` | Список всех групп преподавателя |
| GET | `/api/brs/teacher/group/{groupId}/` | `getGroupStudents(groupId, discipline)` | Студенты группы (с параметром `discipline`) |
| GET | `/api/brs/teacher/group/{groupId}/disciplines/` | `getDiciplinesByGroupId(groupId, params)` | Дисциплины конкретной группы |
| GET | `/api/brs/teacher/journal/` | `getTeacherJournal(params)` | Получить журнал |
| DELETE | `/api/brs/teacher/journal/` | `deleteTeacherJournal(params)` | Удалить запись журнала |
| GET | `/api/brs/teacher/journal/{disciplineId}/` | `getDisciplineJounals(id)` / `getJournals(id, groupId)` | Журнал по дисциплине (или дисциплина+группа) |
| PATCH | `/api/brs/teacher/journal/{disciplineId}/` | `updateStudentAttended(id, data)` / `updateDisciplineJounals(id, data)` | Обновить посещаемость студента |
| GET | `/api/brs/teacher/journal/cp/{id}/` | `copyJournal(id)` | Скопировать журнал |
| POST | `/api/brs/teacher/journal-log/` | `createJournal(params)` | Создать запись в журнале |
| GET | `/api/brs/teacher/journal-log/` | `getJournal({journal})` | Получить лог журнала |
| PATCH | `/api/brs/teacher/journal-log/` | `updateJournalLog(params)` | Обновить лог журнала (массово) |
| PATCH | `/api/brs/teacher/journal-log/{id}/` | `updateJournal(id, data)` | Обновить запись лога |
| DELETE | `/api/brs/teacher/journal-log/?journal={id}` | `deleteJournal(id)` | Удалить запись лога |
| GET | `/api/brs/teacher/journal-pdf/` | `generateJournal(training_form)` | Сгенерировать PDF журнала (responseType: blob) |
| GET | `/api/brs/teacher/journal-empty-pdf/` | `getJournalEmptyPdf()` | Скачать пустой шаблон журнала PDF |

---

## 5. БРС — Админ-панель (роли `admin` / `brs_admin`)

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/brs/admin/institute/` | `getBrsInstitutes()` | Список институтов в админке БРС |
| GET | `/api/brs/admin/group/` | `getBrsGroups(params)` | Список групп |
| GET | `/api/brs/admin/group/{groupId}/?discipline={id}` | `getBrsStudentsPoints(groupId, discipline)` | Баллы студентов группы по дисциплине |
| GET | `/api/brs/admin/discipline/` | `getBrsDisCipline(params)` | Список дисциплин |
| GET | `/api/brs/admin/discipline/{id}/` | `getDiscipline(id)` | Конкретная дисциплина |
| GET | `/api/brs/admin/student/` | `getBrsStudents(params)` | Список студентов |

---

## 6. Эффективный контракт

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/institutes/` | `getInstitutes()` | Список всех институтов |
| GET | `/api/institutes/{id}/` | `getInstitute(id)` | Конкретный институт |
| GET | `/api/institutes/{instituteId}/departments/` | `getDepartments(instituteId)` | Кафедры института |
| GET | `/api/departments/{departmentId}/users/` | `getDepartmentUsers(id, params)` | Сотрудники кафедры |
| GET | `/api/contracts/` | `getUserEffecitveContracts()` | Эффективные контракты текущего пользователя |
| POST | `/api/contracts/` | `addEffectiveContract(userId)` | Создать новый контракт для пользователя |
| GET | `/api/contracts/{contractId}/` | `getEffectiveContractById(id)` | Получить контракт по ID |
| PATCH | `/api/contracts/{contractId}/` | `updateEffectiveContract(id, data)` | Обновить контракт (статус и т.д.) |
| DELETE | `/api/contracts/{contractId}/` | — | Удалить контракт |
| GET | `/api/contracts/{contractId}/items/` | `getEffectiveContractItem(id)` | Список пунктов контракта |
| POST | `/api/contracts/{contractId}/items/` | `addEffectiveContractItem(id, formData)` | Добавить пункт (multipart/form-data) |
| PATCH | `/api/contracts/{contractId}/items/{itemId}/` | `updateEffectiveContractItem(cid, iid, data)` | Обновить пункт |
| DELETE | `/api/contracts/{contractId}/items/{itemId}/` | `removeEffectiveContractItem(cid, iid)` | Удалить пункт |
| GET | `/api/contracts/years/{year}/` | `getQuarters(year)` | Доступные кварталы по году |
| GET | `/api/contracts/export/{quarterId}` | `getReport(quarterId)` | Экспорт отчёта по контрактам |
| GET | `/api/criterions/{typeOfWorkId}/items/` | `getCriterionItems(id)` | Показатели эффективности по виду работ |

### Статусы контракта
| Код | Значение |
|-----|----------|
| `dr` | Черновик |
| `ch` | На проверке |
| `mo` | На доработке |
| `ap` | Проверено / Утверждено |

### Статусы пунктов
| Код | Значение |
|-----|----------|
| `ac` | Принято |
| `de` | Отклонено |
| `nu` | Не проверено |

### Виды работ (type_of_work)
| ID | Название |
|----|----------|
| `1` | Учебная работа |
| `2` | Учебно-методическая работа |
| `3` | Научная работа |
| `4` | Стаж работы |
| `5` | Научно-исследовательская работа студентов |
| `7` | Организационная-воспитательная и другая работа |

---

## 7. Расписание

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/timetable/public/entrie/` | `Ao({group, teacher})` | Публичное расписание занятий (без авторизации) |
| GET | `/api/timetable/public/entrie/exam/` | `Uo({group, teacher})` | Публичное расписание экзаменов |
| GET | `/api/timetable/student/entrie/` | — | Расписание занятий для авторизованного студента |
| GET | `/api/timetable/student/entrie/exam/` | — | Расписание экзаменов для студента |
| GET | `/api/timetable/teacher/entrie/` | — | Расписание занятий для преподавателя |
| GET | `/api/timetable/teacher/entrie/exam/` | — | Расписание экзаменов для преподавателя |

**Параметры:** `group={название_группы}` или `teacher={фамилия}` для публичного, для приватных используется `Zo()` — параметры из текущей даты/семестра.

> Публичный маршрут SPA (без авторизации): `/time-table-public`

---

## 8. Электронная библиотека

| Метод | Эндпоинт | JS-функция | Описание |
|-------|----------|------------|----------|
| GET | `/api/elib/favorite/` | `getLibrary()` | Избранное в электронной библиотеке |

---

## 9. Скачивание файлов

| URL | Описание |
|-----|----------|
| `https://backend-isu.gstou.ru{путь_к_документу}` | Скачать подтверждающий документ контракта (поле `confirmation_document`) |
| `https://backend-isu.gstou.ru/api/contracts/export/{quarterId}` | Экспорт отчёта контрактов |
| `https://backend-isu.gstou.ru/api/brs/teacher/journal-pdf/` | Скачать PDF журнала (responseType: blob) |
| `https://backend-isu.gstou.ru/api/brs/teacher/journal-empty-pdf/` | Скачать пустой шаблон журнала |

---

## 10. Что НЕ нашлось в API

Эти разделы фронтенда **не имеют API-вызовов** — они либо статические, либо ведут на внешние ссылки:

- **Онлайн-оплата** (`/payment`) — статическая страница с инструкцией и ссылкой на `https://gstou.ru/payments/pay.png`
- **Заявки** (`/applications`) — редирект на `https://isu.gstou.ru/applications` (отдельный SPA)
- **Расписание звонков** — внешняя ссылка `https://gstou.ru/sveden/common/`
- **Админ-панель** (`/admin/`) — Django Admin (стандартная)

---

## 11. Маршруты SPA-приложения

| Маршрут | Роль | Описание |
|---------|------|----------|
| `/login` | — | Страница входа |
| `/register` | — | Регистрация |
| `/` | student | Дашборд студента |
| `/brs` | student, dumr | Страница БРС |
| `/time-table` | student, teacher | Расписание занятий |
| `/time-table-exams` | student, teacher | Расписание экзаменов |
| `/time-table-public` | все | Публичное расписание (без авторизации) |
| `/library` | student, teacher | Библиотека |
| `/payment` | student | Онлайн-оплата |
| `/effective-contracts` | teacher, admin, superadmin, dumr, employee | Эффективный контракт |
| `/effective-contracts/institutes/:id/users/:userId` | admin, superadmin | Контракты пользователя |
| `/effective-contracts/institutes/:id/users/:userId/items/:contractId` | admin, superadmin | Пункты контракта |
| `/effective-contracts/:contractId/items` | teacher, employee | Свои пункты контракта |
| `/journal-pos` | teacher | Журнал посещаемости |
| `/journal-usp` | teacher | Журнал успеваемости |
| `/statements` | teacher | Ведомости |
| `/tools` | teacher | Инструменты |
| `/applications` | student | → перенаправление на `https://isu.gstou.ru/applications` |
| `/admin/` | deccan, brs_admin | Панель администратора |

---

## 12. Меню по ролям

### Студент
- Дашборд (`/`)
- БРС (`/brs`)
- Расписание → Занятия (`/time-table`), Экзамены (`/time-table-exams`)
- Заявки (`https://isu.gstou.ru/applications`)
- Библиотека (`/library`)
- Онлайн-оплата (`/payment`)

### Преподаватель
- Документы → Эффективный контракт (`/effective-contracts`)
- БРС → Журнал посещаемости (`/journal-pos`), Журнал успеваемости (`/journal-usp`), Ведомости (`/statements`)
- Расписание → Занятия (`/time-table`), Экзамены (`/time-table-exams`)
- Библиотека (`/library`)
- Инструменты (`/tools`)

### ДУМР
- Документы → Эффективный контракт (`/effective-contracts`)
- БРС → Успеваемость (`/brs`)

### Админ / Суперадмин
- Документы → Эффективный контракт (`/effective-contracts`)

---

## Примечания

- Все API-запросы требуют заголовок `Authorization: Bearer <JWT_token>`
- Токен хранится в cookie `token` и в localStorage (`user_id`, `full_name`)
- Параметры БРС используют `start` / `end` (НЕ `year_start` / `year_end`)
- Фронтенд — React SPA (webpack-бандл: `frontend-vkr`)
- Яндекс.Метрика: счётчик `80117218`
- Пользователи с ролью `pfr` перенаправляются на `https://isu.gstou.ru/applications`

---

## Пример использования (cURL)

### 1. Авторизация — получение JWT-токена
```bash
curl -X POST https://backend-isu.gstou.ru/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_login", "password": "your_password"}'
# Ответ: {"access": "...", "refresh": "..."}
```

### 2. Получить роли пользователя
```bash
curl https://backend-isu.gstou.ru/api/roles/ \
  -H "Authorization: Bearer <token>"
```

### 3. Получить дисциплины БРС
```bash
curl "https://backend-isu.gstou.ru/api/brs/student/disciplines/?start=2025&end=2026&semester=2" \
  -H "Authorization: Bearer <token>"
```

### 4. Получить все оценки сразу
```bash
curl "https://backend-isu.gstou.ru/api/brs/student/disciplines-grades/?start=2025&end=2026&semester=2" \
  -H "Authorization: Bearer <token>"
```

### 5. Получить оценки по конкретной дисциплине
```bash
curl "https://backend-isu.gstou.ru/api/brs/student/grades/123/?start=2025&end=2026&semester=2" \
  -H "Authorization: Bearer <token>"
```

### 6. Получить журнал посещаемости
```bash
curl "https://backend-isu.gstou.ru/api/brs/student/journal/123/?start=2025&end=2026&semester=2" \
  -H "Authorization: Bearer <token>"
```

### 7. Публичное расписание группы (без токена)
```bash
curl "https://backend-isu.gstou.ru/api/timetable/public/entrie/?group=ИСТ-21"
```

### 8. Публичное расписание преподавателя
```bash
curl "https://backend-isu.gstou.ru/api/timetable/public/entrie/?teacher=Иванов"
```

### 9. Расписание авторизованного студента
```bash
curl "https://backend-isu.gstou.ru/api/timetable/student/entrie/?start_year=2025&end_year=2026&semester=2" \
  -H "Authorization: Bearer <token>"
```

### 10. Получить профиль
```bash
curl https://backend-isu.gstou.ru/api/profile/ \
  -H "Authorization: Bearer <token>"
```

---

## Итоговая статистика

- **Всего обнаружено эндпоинтов:** **45+**
- **Уникальных корневых ресурсов:** 13 (`token`, `roles`, `users`, `profile`, `institutes`, `departments`, `contracts`, `criterions`, `contracts-allowed`, `brs/student`, `brs/teacher`, `brs/admin`, `timetable`, `elib`)
- **Источник:** Объект `ra` в бандле `main.d406b48e.chunk.js` (axios-инстанс `ea`)
- **Параметры БРС:** через функцию `aa()` → `{start, end, semester}` из Redux state
- **Mutipart upload:** для `addEffectiveContractItem` и `updateUserProfile`
- **Blob download:** для `journal-pdf` и `journal-empty-pdf`
