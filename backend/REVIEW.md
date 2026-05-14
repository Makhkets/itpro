Проведи полное ревью backend-проекта как security reviewer, QA engineer и backend architect.

Проверь:
3. Пароли хранятся только через bcrypt.
4. password_hash не возвращается в API.
5. Authorization header и JWT не логируются.
6. Все SQL-запросы параметризованы.
7. Все protected endpoints требуют JWT.
8. Все admin endpoints защищены RequireRole("admin").
9. student/teacher не могут approve/reject booking.
10. student/teacher видят только свои bookings.
11. notifications пользователь видит только свои.
12. analytics доступна только admin.
13. При approve booking проверяется конфликт с schedules.
14. При approve booking проверяется конфликт с approved bookings.
15. При approve/reject/cancel создается notification.
16. Redis rate limiting работает.
17. Cache инвалидируется после изменения building/floor/room.
18. Все ошибки возвращаются в едином формате.
19. Есть unit tests.
20. Есть integration tests.
21. go test ./... проходит.
22. go vet ./... проходит.
23. gosec ./... проходит.
24. docker compose up --build работает.
25. Swagger открывается.
26. docs/frontend-api.md достаточно понятен для frontend-разработчика.

Если находишь проблему — исправь ее. После исправлений снова запусти проверки.