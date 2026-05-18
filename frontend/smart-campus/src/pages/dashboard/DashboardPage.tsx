import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  Bot,
  Calendar,
  ClipboardCheck,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  DoorOpen,
  Droplets,
  Library,
  Map,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/features/auth/store";
import {
  analyticsApi,
  brsApi,
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
import type { BRSGrade } from "@/shared/api/types";

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

function currentAcademicYear() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 8) return { start: year, end: year + 1, sem: 1 };
  if (month >= 1 && month <= 6) return { start: year - 1, end: year, sem: 2 };
  return { start: year - 1, end: year, sem: 1 };
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

/** Map WWO weather codes (wttr.in) → WMO codes (used by our icon/label functions) */
function wwoToWmo(code: number): number {
  if (code === 113) return 0;                         // Clear
  if (code === 116) return 2;                         // Partly cloudy
  if (code === 119 || code === 122) return 3;         // Cloudy / Overcast
  if (code === 143 || code === 248 || code === 260) return 45; // Fog / Mist
  if (code === 176 || code === 263 || code === 266) return 51; // Drizzle
  if (code === 281 || code === 284) return 56;        // Freezing drizzle
  if (code === 293 || code === 296) return 61;        // Light rain
  if (code === 299 || code === 302) return 63;        // Moderate rain
  if (code === 305 || code === 308) return 65;        // Heavy rain
  if (code === 311 || code === 314) return 66;        // Freezing rain
  if (code === 317 || code === 320) return 71;        // Sleet
  if (code === 323 || code === 326) return 71;        // Light snow
  if (code === 329 || code === 332) return 73;        // Moderate snow
  if (code === 335 || code === 338) return 75;        // Heavy snow
  if (code === 350) return 77;                        // Ice pellets
  if (code === 353) return 80;                        // Light rain shower
  if (code === 356 || code === 359) return 82;        // Heavy rain shower
  if (code >= 362 && code <= 371) return 85;          // Sleet/snow showers
  if (code >= 386) return 95;                         // Thunderstorm
  if (code === 200) return 95;                        // Thunderstorm
  return 3;
}

function useWeather() {
  return useQuery<WeatherData>({
    queryKey: ["weather", "grozny"],
    queryFn: async () => {
      // wttr.in uses real weather station data — more accurate for current conditions
      const res = await fetch("https://wttr.in/Grozny?format=j1");
      const json = await res.json();
      const c = json.current_condition?.[0];
      if (!c) throw new Error("No weather data");
      return {
        temp: Math.round(Number(c.temp_C)),
        feelsLike: Math.round(Number(c.FeelsLikeC)),
        humidity: Number(c.humidity),
        windSpeed: Math.round(Number(c.windspeedKmph)),
        weatherCode: wwoToWmo(Number(c.weatherCode)),
      };
    },
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}

function weatherIcon(code: number) {
  if (code <= 1) return <Sun className="h-8 w-8 text-amber-400" />;
  if (code <= 3) return <Cloud className="h-8 w-8 text-slate-400" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className="h-8 w-8 text-blue-400" />;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="h-8 w-8 text-blue-500" />;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow className="h-8 w-8 text-sky-300" />;
  return <Cloud className="h-8 w-8 text-slate-400" />;
}

function weatherLabel(code: number): string {
  if (code === 0) return "Ясно";
  if (code <= 3) return "Облачно";
  if (code >= 51 && code <= 57) return "Морось";
  if (code >= 61 && code <= 65) return "Дождь";
  if (code === 66 || code === 67) return "Ледяной дождь";
  if (code >= 71 && code <= 77) return "Снег";
  if (code >= 80 && code <= 82) return "Ливень";
  if (code >= 85 && code <= 86) return "Снегопад";
  if (code >= 95) return "Гроза";
  return "Облачно";
}

function weatherAdvice(w: WeatherData): string {
  const { temp, weatherCode, windSpeed } = w;
  if (weatherCode >= 61 && weatherCode <= 67) return "Прихватите зонтик ☔";
  if (weatherCode >= 80 && weatherCode <= 82) return "Сильный дождь — лучше взять зонт и непромокаемую обувь";
  if (weatherCode >= 71 && weatherCode <= 77) return "Оденьтесь потеплее, снег! ❄️";
  if (weatherCode >= 85 && weatherCode <= 86) return "Снегопад — тёплая одежда обязательна";
  if (weatherCode >= 95) return "Гроза — лучше переждать в помещении";
  if (weatherCode >= 51 && weatherCode <= 57) return "Моросит — легкий дождевик не помешает";
  if (temp <= 0) return "Мороз! Оденьтесь потеплее и не забудьте перчатки 🧤";
  if (temp <= 10) return "Прохладно — куртка будет кстати";
  if (temp >= 30) return "Жарко! Не забудьте воду 💧";
  if (windSpeed > 35) return "Сильный ветер — будьте аккуратнее на улице";
  return "Отличная погода для учёбы! ☀️";
}

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
    refetchInterval: 60_000,
  });

  const acadYear = currentAcademicYear();
  const brs = useQuery({
    queryKey: ["brs", "dash", acadYear.start, acadYear.end, acadYear.sem],
    queryFn: () => brsApi.my({ yearStart: acadYear.start, yearEnd: acadYear.end, semester: acadYear.sem }),
    enabled: isStudent,
    staleTime: 5 * 60_000,
  });

  const weather = useWeather();

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
  const [mskTime, setMskTime] = useState(getMskTime());
  useEffect(() => {
    const t = setInterval(() => setMskTime(getMskTime()), 30_000);
    return () => clearInterval(t);
  }, []);

  const actions =
    QUICK_ACTIONS[user.role as keyof typeof QUICK_ACTIONS] ?? QUICK_ACTIONS.student;

  const brsGrades = brs.data?.grades ?? [];
  const avgScore = brsGrades.length
    ? Math.round(brsGrades.reduce((s: number, g: BRSGrade) => s + g.total, 0) / brsGrades.length)
    : 0;
  const minGrade = brsGrades.length
    ? brsGrades.reduce((m: BRSGrade, g: BRSGrade) => (g.total < m.total ? g : m), brsGrades[0])
    : null;

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-navy via-[#1f2a47] to-navy-950 text-white p-5 sm:p-8 md:p-10"
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
            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl leading-[1.05]">
              {user.fullName.split(" ").slice(0, 2).join(" ")},
            </h1>
            <p className="font-display text-xl sm:text-3xl md:text-4xl text-white/70 mt-1">
              добро пожаловать в SmartCampus.
            </p>

            {/* Current / Next lesson — MSK time aware */}
            {current.data?.currentLesson && (
              <div className="mt-4 sm:mt-6 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl bg-white/10 border border-white/15">
                <span className="h-2 w-2 rounded-full bg-burgundy animate-pulse shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs text-white/60">Сейчас идёт · {mskTime} МСК</div>
                  <div className="text-xs sm:text-sm font-medium truncate">
                    {current.data.currentLesson.title} ·{" "}
                    {fmtTime(current.data.currentLesson.startsAt)}–
                    {fmtTime(current.data.currentLesson.endsAt)}
                    {current.data.currentLesson.roomNumber
                      ? ` · ауд. ${current.data.currentLesson.roomNumber}`
                      : current.data.currentLesson.room?.number
                        ? ` · ауд. ${current.data.currentLesson.room.number}`
                        : ""}
                  </div>
                </div>
              </div>
            )}
            {!current.data?.currentLesson && current.data?.nextLesson && (
              <div className="mt-4 sm:mt-6 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <Calendar className="h-4 w-4 text-burgundy shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs text-white/60">Следующая пара · {mskTime} МСК</div>
                  <div className="text-xs sm:text-sm font-medium truncate">
                    {current.data.nextLesson.title} ·{" "}
                    {fmtTime(current.data.nextLesson.startsAt)}
                    {current.data.nextLesson.roomNumber
                      ? ` · ауд. ${current.data.nextLesson.roomNumber}`
                      : current.data.nextLesson.room?.number
                        ? ` · ауд. ${current.data.nextLesson.room.number}`
                        : ""}
                  </div>
                </div>
              </div>
            )}
            {!current.data?.currentLesson && !current.data?.nextLesson && (isStudent || isTeacher) && !current.isLoading && (
              <div className="mt-4 sm:mt-6 flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <Calendar className="h-4 w-4 text-white/40 shrink-0" />
                <div className="text-xs sm:text-sm text-white/60">Сегодня пар нет — свободный день!</div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
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
                  "group relative overflow-hidden block rounded-xl sm:rounded-2xl p-4 sm:p-5 h-full border transition-all hover:-translate-y-0.5",
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
                    "h-5 w-5 sm:h-6 sm:w-6 mb-4 sm:mb-6 opacity-80",
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
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Student BRS stats (real data) */}
          {isStudent && brsGrades.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-3">
              <StatCard
                tone="burgundy"
                label="Средний балл БРС"
                value={avgScore}
                delta={`${brsGrades.length} дисциплин в семестре`}
                icon={<ClipboardCheck className="h-5 w-5" />}
              />
              <StatCard
                tone="navy"
                label="Минимальный балл"
                value={minGrade?.total ?? "—"}
                delta={minGrade ? minGrade.disciplineName : undefined}
              />
              <StatCard
                label="Дисциплин"
                value={brsGrades.length}
                delta={
                  brsGrades.filter((g: BRSGrade) => g.total >= 60).length ===
                  brsGrades.length
                    ? "Все предметы в норме \u2714"
                    : `${brsGrades.filter((g: BRSGrade) => g.total < 60).length} ниже 60 баллов`
                }
              />
            </div>
          )}
          {isStudent && brs.isLoading && (
            <div className="grid sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-surface-alt animate-pulse" />
              ))}
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
              <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-border">
                <div>
                  <p className="font-semibold text-navy text-sm sm:text-base">Расписание сегодня</p>
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
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-burgundy" />
                <p className="font-semibold text-navy text-sm sm:text-base">Уведомления</p>
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
                <div key={n.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3">
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
          {/* Weather card */}
          <WeatherCard weather={weather.data} isLoading={weather.isLoading} />
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
          className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 hover:bg-surface-subtle transition-colors"
        >
          <div className="text-center w-12 sm:w-14 shrink-0">
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

function WeatherCard({ weather, isLoading }: { weather?: WeatherData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      </Card>
    );
  }
  if (!weather) return null;

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-2">
              Погода в Грозном
            </div>
            <div className="font-display text-4xl text-navy">
              {weather.temp}°C
            </div>
            <p className="text-sm text-muted mt-1">{weatherLabel(weather.weatherCode)}</p>
          </div>
          <div className="mt-1">{weatherIcon(weather.weatherCode)}</div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Thermometer className="h-3.5 w-3.5" />
            <span>Ощ. {weather.feelsLike}°</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Droplets className="h-3.5 w-3.5" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Wind className="h-3.5 w-3.5" />
            <span>{weather.windSpeed} км/ч</span>
          </div>
        </div>

        <div className="mt-4 px-3 py-2.5 rounded-xl bg-burgundy/5 border border-burgundy/10">
          <p className="text-xs text-burgundy/90 font-medium">
            {weatherAdvice(weather)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function getMskTime() {
  return new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

function useGreeting() {
  const h = parseInt(
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Moscow",
    }),
    10,
  );
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}
