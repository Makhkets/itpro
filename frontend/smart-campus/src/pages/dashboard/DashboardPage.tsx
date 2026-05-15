import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  Bot,
  Calendar,
  ClipboardCheck,
  DoorOpen,
  Library,
  Map,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/features/auth/store";
import {
  analyticsApi,
  attendanceApi,
  notificationsApi,
  scheduleApi,
} from "@/shared/api/modules";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { StatCard } from "@/shared/ui/stat-card";
import { LoadingState } from "@/shared/ui/states";
import { ROLE_LABEL } from "@/shared/lib/role";
import { fmtRelative, fmtTime } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";

const QUICK_ACTIONS = {
  student: [
    { to: "/rooms", label: "Найти аудиторию", icon: DoorOpen, tone: "burgundy" },
    { to: "/schedule", label: "Моё расписание", icon: Calendar, tone: "navy" },
    { to: "/bookings/create", label: "Забронировать", icon: BookOpenCheck, tone: "white" },
    { to: "/ai", label: "Спросить AI", icon: Bot, tone: "white" },
    { to: "/library", label: "Библиотека", icon: Library, tone: "white" },
  ],
  teacher: [
    { to: "/teacher/schedule", label: "Моё расписание", icon: Calendar, tone: "burgundy" },
    { to: "/attendance/sessions", label: "Посещаемость", icon: ClipboardCheck, tone: "navy" },
    { to: "/bookings/create", label: "Забронировать", icon: BookOpenCheck, tone: "white" },
    { to: "/rooms", label: "Аудитории", icon: DoorOpen, tone: "white" },
    { to: "/ai", label: "AI-ассистент", icon: Bot, tone: "white" },
  ],
  applicant: [
    { to: "/applicant-faq", label: "FAQ для абитуриентов", icon: Sparkles, tone: "burgundy" },
    { to: "/ai", label: "AI-консультант", icon: Bot, tone: "navy" },
  ],
  librarian: [
    { to: "/library/manage/books", label: "Каталог книг", icon: Library, tone: "burgundy" },
    { to: "/library/manage/loans", label: "Выдачи", icon: BookOpenCheck, tone: "navy" },
    { to: "/analytics/library", label: "Аналитика", icon: ClipboardCheck, tone: "white" },
  ],
  admin: [
    { to: "/admin/bookings", label: "Бронирования", icon: BookOpenCheck, tone: "burgundy" },
    { to: "/admin/rooms", label: "Аудитории", icon: DoorOpen, tone: "navy" },
    { to: "/admin/analytics", label: "Аналитика", icon: ClipboardCheck, tone: "white" },
    { to: "/admin/audit-logs", label: "Аудит", icon: Map, tone: "white" },
  ],
} as const;

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const isStudent = user.role === "student";
  const isTeacher = user.role === "teacher";
  const isAdmin = user.role === "admin";

  const current = useQuery({
    queryKey: ["schedule", "current"],
    queryFn: () => scheduleApi.current(),
    enabled: isStudent || isTeacher,
  });

  const myAttendance = useQuery({
    queryKey: ["attendance", "my", "analytics"],
    queryFn: () => attendanceApi.myAnalytics(),
    enabled: isStudent,
  });

  const notifs = useQuery({
    queryKey: ["notifications", "dash"],
    queryFn: () => notificationsApi.list({ pageSize: 5 }),
  });

  const summary = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.summary(),
    enabled: isAdmin,
  });

  const greeting = useGreeting();
  const actions =
    QUICK_ACTIONS[user.role as keyof typeof QUICK_ACTIONS] ?? QUICK_ACTIONS.student;

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1f2a47] to-navy-950 text-white p-8 md:p-10"
      >
        <div className="absolute inset-0 hero-lines opacity-60" />
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-burgundy/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent-red/20 blur-3xl" />

        <div className="relative grid md:grid-cols-[1fr,auto] gap-6 items-end">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold mb-3">
              {greeting} · {ROLE_LABEL[user.role]}
              {user.groupName ? ` · ${user.groupName}` : ""}
            </div>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
              {user.fullName.split(" ").slice(0, 2).join(" ")},
            </h1>
            <p className="font-display text-3xl md:text-4xl text-white/70 mt-1">
              добро пожаловать в SmartCampus.
            </p>
            {current.data?.currentLesson && (
              <div className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
                <span className="h-2 w-2 rounded-full bg-burgundy animate-pulse" />
                <div>
                  <div className="text-xs text-white/60">Сейчас идёт</div>
                  <div className="text-sm font-medium">
                    {current.data.currentLesson.title} ·{" "}
                    {fmtTime(current.data.currentLesson.startsAt)}–
                    {fmtTime(current.data.currentLesson.endsAt)}
                    {current.data.currentLesson.room?.number
                      ? ` · ауд. ${current.data.currentLesson.room.number}`
                      : ""}
                  </div>
                </div>
              </div>
            )}
            {!current.data?.currentLesson && current.data?.nextLesson && (
              <div className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <Calendar className="h-4 w-4 text-burgundy" />
                <div>
                  <div className="text-xs text-white/60">Следующая пара</div>
                  <div className="text-sm font-medium">
                    {current.data.nextLesson.title} ·{" "}
                    {fmtTime(current.data.nextLesson.startsAt)}
                    {current.data.nextLesson.room?.number
                      ? ` · ауд. ${current.data.nextLesson.room.number}`
                      : ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block text-right">
            <div className="font-display text-7xl text-white/15 leading-none">
              {new Date().getDate()}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-widest mt-2">
              {new Date().toLocaleDateString("ru-RU", { month: "long" })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display text-xl text-navy mb-3">Быстрые действия</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {actions.map((a, i) => (
            <motion.div
              key={a.to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={a.to}
                className={cn(
                  "group relative overflow-hidden block rounded-2xl p-5 h-full border transition-all hover:-translate-y-0.5",
                  a.tone === "burgundy" &&
                    "bg-burgundy text-white border-transparent hover:shadow-card-hover",
                  a.tone === "navy" &&
                    "bg-navy text-white border-transparent hover:shadow-card-hover",
                  a.tone === "white" &&
                    "bg-white text-navy border-border hover:border-navy/30 shadow-card",
                )}
              >
                <a.icon
                  className={cn(
                    "h-6 w-6 mb-6 opacity-80",
                    a.tone === "white" && "text-burgundy",
                  )}
                />
                <div className="font-medium text-sm">{a.label}</div>
                <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Right column wider */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats per role */}
          {isStudent && myAttendance.data && (
            <div className="grid sm:grid-cols-3 gap-3">
              <StatCard
                tone="burgundy"
                label="Посещаемость"
                value={`${Math.round(myAttendance.data.attendancePercent)}%`}
                delta={
                  myAttendance.data.summary
                    ? `${myAttendance.data.summary.present} / ${myAttendance.data.summary.totalRecords} занятий`
                    : undefined
                }
                icon={<ClipboardCheck className="h-5 w-5" />}
              />
              <StatCard
                tone="navy"
                label="Баллы семестра"
                value={myAttendance.data.currentPoints}
                delta={
                  myAttendance.data.policy
                    ? `Допуск от ${myAttendance.data.policy.admissionMinPoints}`
                    : undefined
                }
              />
              <StatCard
                label="Статус допуска"
                value={
                  <span className="text-xl">
                    {admissionLabel(myAttendance.data.admissionStatus)}
                  </span>
                }
                delta={myAttendance.data.recommendation}
              />
            </div>
          )}

          {isAdmin && summary.data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                tone="navy"
                label="Пользователей"
                value={summary.data.totalUsers}
                icon={<Sparkles className="h-5 w-5" />}
              />
              <StatCard
                tone="burgundy"
                label="Бронирований"
                value={summary.data.totalBookings}
                delta={`${summary.data.pendingBookings} ожидают`}
              />
              <StatCard label="Аудиторий" value={summary.data.totalRooms} />
              <StatCard
                label="AI запросов"
                value={summary.data.aiQuestionsCount}
              />
            </div>
          )}

          {/* Schedule preview */}
          {(isStudent || isTeacher) && (
            <Card className="overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between border-b border-border">
                <div>
                  <p className="font-semibold text-navy">Расписание сегодня</p>
                  <p className="text-xs text-muted mt-0.5">
                    Источник: ИСУ ГГНТУ
                  </p>
                </div>
                <Link
                  to={isTeacher ? "/teacher/schedule" : "/schedule"}
                  className="text-sm text-burgundy font-medium hover:underline inline-flex items-center gap-1"
                >
                  Открыть <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <SchedulePreview />
            </Card>
          )}

          {/* Notifications */}
          <Card>
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-burgundy" />
                <p className="font-semibold text-navy">Уведомления</p>
              </div>
              <Link
                to="/notifications"
                className="text-sm text-burgundy font-medium hover:underline"
              >
                Все →
              </Link>
            </div>
            <div className="divide-y divide-border">
              {notifs.isLoading && (
                <div className="p-6">
                  <LoadingState rows={3} />
                </div>
              )}
              {notifs.data?.slice(0, 5).map((n) => (
                <div key={n.id} className="px-6 py-4 flex items-start gap-3">
                  {!n.isRead && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-burgundy shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-navy truncate">
                        {n.title}
                      </p>
                      <Badge variant="muted">{n.channel}</Badge>
                    </div>
                    <p className="text-xs text-muted line-clamp-2 mt-1">
                      {n.message}
                    </p>
                  </div>
                  <p className="text-[11px] text-navy-50 shrink-0 whitespace-nowrap">
                    {fmtRelative(n.createdAt)}
                  </p>
                </div>
              ))}
              {!notifs.isLoading && !notifs.data?.length && (
                <div className="p-8 text-center text-sm text-muted">
                  Уведомлений пока нет
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">
          <AssistantTeaser />
          <CampusInfoCard />
        </div>
      </div>
    </div>
  );
}

function SchedulePreview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["schedule", "today", user?.role, user?.groupName, user?.id],
    queryFn: async () => {
      if (user?.role === "student" && user.groupName) {
        return scheduleApi.byGroup(user.groupName);
      }
      if (user?.role === "teacher" && user.id) {
        return scheduleApi.byTeacher(user.id);
      }
      return [];
    },
  });
  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState rows={3} />
      </div>
    );
  }
  const today = (data ?? []).filter((s) => {
    const d = new Date(s.startsAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  if (!today.length) {
    return (
      <div className="p-6 text-sm text-muted text-center">
        На сегодня занятий нет — отличный день для библиотеки 📚
      </div>
    );
  }
  return (
    <div className="divide-y divide-border">
      {today.slice(0, 4).map((s) => (
        <div
          key={s.id}
          className="px-6 py-4 flex items-center gap-4 hover:bg-surface-subtle transition-colors"
        >
          <div className="text-center w-14 shrink-0">
            <div className="font-display text-lg leading-none text-navy">
              {fmtTime(s.startsAt)}
            </div>
            <div className="text-[10px] text-muted mt-1">
              {fmtTime(s.endsAt)}
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-navy truncate">{s.title}</p>
            <p className="text-xs text-muted truncate">
              {s.teacherName}
              {s.roomNumber ? ` · ауд. ${s.roomNumber}` : ""}
            </p>
          </div>
          {s.roomId && (
            <Link
              to={`/navigation/room/${s.roomId}`}
              className="text-xs text-burgundy font-medium whitespace-nowrap"
            >
              Маршрут →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

function AssistantTeaser() {
  return (
    <Link
      to="/ai"
      className="relative overflow-hidden block rounded-3xl p-6 bg-gradient-to-br from-burgundy via-burgundy-dark to-[#5C0F1F] text-white"
    >
      <div className="absolute inset-0 hero-lines opacity-50 pointer-events-none" />
      <div className="absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <Bot className="h-7 w-7" />
      <div className="font-display text-2xl leading-tight mt-5">
        Спросите AI о ГГНТУ
      </div>
      <p className="text-white/80 text-sm mt-2">
        Расписание, аудитории, поступление, библиотека — за пару секунд.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
        Открыть чат <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function CampusInfoCard() {
  return (
    <Card>
      <div className="px-6 py-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-3">
          О кампусе
        </div>
        <h3 className="font-display text-xl text-navy leading-tight">
          Сетка корпусов A–G и переходов между ними.
        </h3>
        <p className="text-sm text-muted mt-2">
          Используйте навигацию SmartCampus, чтобы быстро найти аудиторию или
          построить маршрут между корпусами.
        </p>
        <Link
          to="/rooms"
          className="text-sm text-burgundy font-medium hover:underline inline-flex items-center gap-1 mt-4"
        >
          Открыть каталог аудиторий <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function useGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function admissionLabel(s: string) {
  return (
    {
      admitted: "Допущен",
      attendance_risk: "Риск посещ.",
      points_risk: "Риск баллов",
      not_admitted: "Не допущен",
      no_data: "Нет данных",
    }[s] ?? s
  );
}
