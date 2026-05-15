import { apiClient } from "./client";
import type {
  AIAnswer,
  AIChatMessage,
  AIChatSession,
  AnalyticsSummary,
  ApplicantFAQ,
  AttendancePolicy,
  AttendanceRecord,
  AttendanceSession,
  AuditLog,
  AuthResult,
  Booking,
  BookingCreateRequest,
  BookingsByStatus,
  Building,
  CampusRoute,
  Floor,
  LibraryBook,
  LibraryLoan,
  LibrarySummary,
  LoginRequest,
  Notification,
  PrivacyMeResult,
  RegisterRequest,
  Room,
  RoomAvailability,
  RoomNavigation,
  RoomUtilizationRow,
  Schedule,
  ScheduleCurrent,
  SecurityAlert,
  SecurityDashboard,
  StudentAttendanceAnalytics,
  TelegramLinkStart,
  User,
} from "./types";

const get = <T>(url: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(url, { params }).then((r) => r.data);
const post = <T>(url: string, data?: unknown) =>
  apiClient.post<T>(url, data).then((r) => r.data);
const patch = <T>(url: string, data?: unknown) =>
  apiClient.patch<T>(url, data).then((r) => r.data);
const del = <T>(url: string) => apiClient.delete<T>(url).then((r) => r.data);

// ---------- Auth ----------
export const authApi = {
  login: (data: LoginRequest) => post<AuthResult>("/auth/login", data),
  register: (data: RegisterRequest) => post<AuthResult>("/auth/register", data),
};

// ---------- Users ----------
export const usersApi = {
  me: () => get<User>("/users/me"),
  updateTelegram: (chatId: number, username?: string) =>
    patch<User>("/users/me/telegram", { chatId, username }),
  setConsent: (consent: boolean) =>
    patch<{ token: string } & User>("/users/me/personal-data-consent", {
      consent,
    }),
};

// ---------- Privacy ----------
export const privacyApi = {
  me: () => get<PrivacyMeResult>("/privacy/me"),
  export: () => post<unknown>("/privacy/export"),
  deleteRequest: () => post<unknown>("/privacy/delete-request"),
};

// ---------- Buildings ----------
export const buildingsApi = {
  list: () => get<Building[]>("/buildings"),
  create: (data: Partial<Building>) => post<Building>("/buildings", data),
  byId: (id: string) => get<Building>(`/buildings/${id}`),
  update: (id: string, data: Partial<Building>) =>
    patch<Building>(`/buildings/${id}`, data),
  floors: (id: string) => get<Floor[]>(`/buildings/${id}/floors`),
  createFloor: (id: string, data: Partial<Floor>) =>
    post<Floor>(`/buildings/${id}/floors`, data),
};

// ---------- Rooms ----------
export const roomsApi = {
  list: (params?: Record<string, unknown>) => get<Room[]>("/rooms", params),
  search: (params: Record<string, unknown>) =>
    get<Room[]>("/rooms/search", params),
  byId: (id: string) => get<Room>(`/rooms/${id}`),
  create: (data: Partial<Room>) => post<Room>("/rooms", data),
  update: (id: string, data: Partial<Room>) =>
    patch<Room>(`/rooms/${id}`, data),
  availability: (id: string, date?: string) =>
    get<RoomAvailability>(`/rooms/${id}/availability`, { date }),
  schedule: (id: string, params?: Record<string, unknown>) =>
    get<Schedule[]>(`/rooms/${id}/schedule`, params),
};

// ---------- Navigation ----------
export const navigationApi = {
  room: (roomId: string) =>
    get<RoomNavigation>(`/navigation/room/${roomId}`),
  routes: (params?: Record<string, unknown>) =>
    get<CampusRoute[]>("/navigation/routes", params),
  createRoute: (data: Partial<CampusRoute>) =>
    post<CampusRoute>("/navigation/routes", data),
  updateRoute: (id: string, data: Partial<CampusRoute>) =>
    patch<CampusRoute>(`/navigation/routes/${id}`, data),
};

// ---------- Schedule ----------
export const scheduleApi = {
  byGroup: (groupName: string, params?: Record<string, unknown>) =>
    get<Schedule[]>(`/schedule/group/${encodeURIComponent(groupName)}`, params),
  byTeacher: (teacherId: string, params?: Record<string, unknown>) =>
    get<Schedule[]>(`/schedule/teacher/${teacherId}`, params),
  current: () => get<ScheduleCurrent>("/schedule/current"),
};

// ---------- Bookings ----------
export const bookingsApi = {
  list: (params?: Record<string, unknown>) =>
    get<Booking[]>("/bookings", params),
  create: (data: BookingCreateRequest) => post<Booking>("/bookings", data),
  my: () => get<Booking[]>("/bookings/my"),
  byId: (id: string) => get<Booking>(`/bookings/${id}`),
  approve: (id: string, comment?: string) =>
    patch<Booking>(`/bookings/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) =>
    patch<Booking>(`/bookings/${id}/reject`, { comment }),
  cancel: (id: string) => patch<Booking>(`/bookings/${id}/cancel`),
};

// ---------- Notifications ----------
export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    get<Notification[]>("/notifications", params),
  read: (id: string) => patch<Notification>(`/notifications/${id}/read`),
  readAll: () => patch<{ updated: number }>("/notifications/read-all"),
};

// ---------- Telegram ----------
export const telegramApi = {
  start: () => post<TelegramLinkStart>("/telegram/link/start"),
  verify: (code: string, chatId: number, username?: string) =>
    post<User>("/telegram/link/verify", { code, chatId, username }),
};

// ---------- AI ----------
export const aiApi = {
  chat: (message: string, sessionId?: string) =>
    post<AIAnswer>("/ai/chat", { message, sessionId }),
  sessions: () => get<AIChatSession[]>("/ai/sessions"),
  messages: (sessionId: string) =>
    get<AIChatMessage[]>(`/ai/sessions/${sessionId}/messages`),
  deleteSession: (sessionId: string) =>
    del<{ ok: boolean }>(`/ai/sessions/${sessionId}`),
};

// ---------- FAQ ----------
export const faqApi = {
  list: () => get<ApplicantFAQ[]>("/applicant-faq"),
  search: (q: string) =>
    get<ApplicantFAQ[]>("/applicant-faq/search", { q }),
  create: (data: Partial<ApplicantFAQ>) =>
    post<ApplicantFAQ>("/applicant-faq", data),
  update: (id: string, data: Partial<ApplicantFAQ>) =>
    patch<ApplicantFAQ>(`/applicant-faq/${id}`, data),
  delete: (id: string) => del<{ ok: boolean }>(`/applicant-faq/${id}`),
};

// ---------- Attendance ----------
export const attendanceApi = {
  policy: () => get<AttendancePolicy>("/attendance/policy"),
  sessions: (params?: Record<string, unknown>) =>
    get<AttendanceSession[]>("/attendance/sessions", params),
  createSession: (data: Partial<AttendanceSession>) =>
    post<AttendanceSession>("/attendance/sessions", data),
  records: (sessionId: string) =>
    get<AttendanceRecord[]>(`/attendance/sessions/${sessionId}/records`),
  mark: (
    sessionId: string,
    records: { studentId: string; status: string; comment?: string }[],
  ) =>
    post<AttendanceRecord[]>(`/attendance/sessions/${sessionId}/records`, {
      records,
    }),
  my: () => get<AttendanceRecord[]>("/attendance/my"),
  myAnalytics: () =>
    get<StudentAttendanceAnalytics>("/attendance/my/analytics"),
};

// ---------- Library ----------
export const libraryApi = {
  searchBooks: (
    params?: string | { q?: string; author?: string; category?: string },
  ) =>
    get<LibraryBook[]>(
      "/library/books/search",
      typeof params === "string" ? { q: params } : params,
    ),
  bookById: (id: string) => get<LibraryBook>(`/library/books/${id}`),
  createBook: (data: Partial<LibraryBook>) =>
    post<LibraryBook>("/library/books", data),
  updateBook: (id: string, data: Partial<LibraryBook>) =>
    patch<LibraryBook>(`/library/books/${id}`, data),
  borrow: (id: string, dueAt?: string) =>
    post<LibraryLoan>(`/library/books/${id}/borrow`, { dueAt }),
  loans: (params?: Record<string, unknown>) =>
    get<LibraryLoan[]>("/library/loans", params),
  createLoan: (data: { bookId: string; userId: string; dueAt?: string }) =>
    post<LibraryLoan>("/library/loans", data),
  myLoans: () => get<LibraryLoan[]>("/library/loans/my"),
  returnLoan: (id: string) =>
    patch<LibraryLoan>(`/library/loans/${id}/return`),
};

// ---------- Analytics ----------
export const analyticsApi = {
  summary: () => get<AnalyticsSummary>("/analytics/summary"),
  bookingsByStatus: () =>
    get<BookingsByStatus>("/analytics/bookings-by-status"),
  roomUtilization: () =>
    get<RoomUtilizationRow[]>("/analytics/room-utilization"),
  attendanceSummary: () => get<unknown>("/analytics/attendance/summary"),
  attendanceByGroup: () => get<unknown>("/analytics/attendance/by-group"),
  attendanceStudents: () => get<unknown>("/analytics/attendance/students"),
  attendanceByStudent: (id: string) =>
    get<StudentAttendanceAnalytics>(`/analytics/attendance/by-student/${id}`),
  librarySummary: () => get<LibrarySummary>("/analytics/library/summary"),
  telegramSummary: () => get<{ verifiedTelegramLinks: number }>(
    "/analytics/telegram/summary",
  ),
  aiSummary: () =>
    get<{ aiQuestionsCount: number }>("/analytics/ai/summary"),
};

// ---------- Audit ----------
export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    get<AuditLog[]>("/audit-logs", params),
};

// ---------- Security ----------
export const securityApi = {
  dashboard: () => get<SecurityDashboard>("/security/dashboard"),
  alerts: (params?: Record<string, unknown>) =>
    get<SecurityAlert[]>("/security/alerts", params),
  resolveAlert: (id: string) =>
    patch<{ ok: boolean }>(`/security/alerts/${id}/resolve`),
};
