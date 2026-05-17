import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Users,
  GraduationCap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { brsApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { LoadingState } from "@/shared/ui/states";

/* ─── Helpers ─── */
function currentAcademicYear() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  if (m >= 8) return { start: y, end: y + 1, sem: 1 };
  if (m >= 1 && m <= 6) return { start: y - 1, end: y, sem: 2 };
  return { start: y - 1, end: y, sem: 1 };
}

interface LeaderboardEntry {
  position: number;
  full_name: string;
  average: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function positionMedal(pos: number) {
  if (pos === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (pos === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (pos === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return null;
}

function avatarGradient(pos: number) {
  if (pos === 1) return "from-yellow-400 to-amber-500";
  if (pos === 2) return "from-gray-300 to-gray-400";
  if (pos === 3) return "from-amber-500 to-orange-600";
  return "from-slate-400 to-slate-500";
}

/* ─── Page ─── */
export default function LeaderboardPage() {
  const defaults = currentAcademicYear();
  const [yearStart, setYearStart] = useState(defaults.start);
  const [yearEnd, setYearEnd] = useState(defaults.end);
  const [semester, setSemester] = useState(defaults.sem);
  const { user } = useAuth();

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ["brs-leaderboard", yearStart, yearEnd, semester],
    queryFn: () => brsApi.specializationAvg({ yearStart, yearEnd, semester }),
    retry: false,
  });

  const entries: LeaderboardEntry[] = useMemo(() => {
    if (!raw || typeof raw !== "object") return [];

    // API returns { "ФИО": средний_балл, ... } — plain object
    const obj = raw as Record<string, number>;
    return Object.entries(obj)
      .map(([name, avg]) => ({ full_name: name, average: Number(avg) }))
      .sort((a, b) => b.average - a.average)
      .map((e, i) => ({ ...e, position: i + 1 }));
  }, [raw]);

  const TOP_N = 15;
  const top15 = useMemo(() => entries.slice(0, TOP_N), [entries]);

  const myEntry = useMemo(() => {
    if (!user?.fullName) return null;
    const name = user.fullName.toLowerCase();
    return entries.find((e) => e.full_name.toLowerCase() === name) ?? null;
  }, [entries, user]);

  const myInTop = myEntry ? myEntry.position <= TOP_N : false;

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const avg = entries.reduce((s, e) => s + e.average, 0) / entries.length;
    const max = entries[0]?.average ?? 0;
    const min = entries[entries.length - 1]?.average ?? 0;
    return { avg, max, min, total: entries.length };
  }, [entries]);


  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white p-5 sm:p-8"
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-8 text-[120px] leading-none font-bold opacity-10 select-none">🏆</div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium mb-3">
                <Trophy className="h-3.5 w-3.5" />
                {yearStart}/{yearEnd} · {semester} семестр
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Рейтинг кафедры
              </h1>
              <p className="text-white/60 text-sm mt-1.5 max-w-md">
                Топ студентов по среднему баллу БРС
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={`${yearStart}-${yearEnd}`}
                onChange={(e) => { const [s, en] = e.target.value.split("-").map(Number); setYearStart(s); setYearEnd(en); }}
                className="h-9 rounded-lg bg-white/15 border border-white/25 px-3 text-sm text-white outline-none appearance-none cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - 2 + i; return (<option key={y} value={`${y}-${y + 1}`} className="text-gray-800 bg-white">{y}/{y + 1}</option>); })}
              </select>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="h-9 rounded-lg bg-white/15 border border-white/25 px-3 text-sm text-white outline-none appearance-none cursor-pointer"
              >
                <option value={1} className="text-gray-800 bg-white">1 семестр</option>
                <option value={2} className="text-gray-800 bg-white">2 семестр</option>
              </select>
            </div>
          </div>

          {/* My position card */}
          {myEntry && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <span className="font-display text-2xl font-bold">#{myEntry.position}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/70">Ваша позиция</div>
                <div className="text-lg font-bold truncate">{myEntry.full_name}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{myEntry.average.toFixed(2)}</div>
                <div className="text-xs text-white/60">средний балл</div>
              </div>
              {user?.groupName && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15">
                  <GraduationCap className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-xs font-medium">{user.groupName}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Всего</div>
                <div className="font-display text-xl font-bold mt-0.5">{stats.total}</div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Средний</div>
                <div className="font-display text-xl font-bold mt-0.5">{stats.avg.toFixed(1)}</div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Максимум</div>
                <div className="font-display text-xl font-bold mt-0.5">{stats.max.toFixed(1)}</div>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Минимум</div>
                <div className="font-display text-xl font-bold mt-0.5">{stats.min.toFixed(1)}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {isLoading && <LoadingState rows={8} />}

      {isError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-sm">
          <AlertTriangle className="h-7 w-7 text-amber-600 mx-auto mb-3" />
          <h3 className="font-display text-xl text-navy mb-2">Не удалось загрузить</h3>
          <p className="text-sm text-muted">Перелогиньтесь через ИСУ или попробуйте позже</p>
        </motion.div>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
          <Users className="h-14 w-14 text-muted/30 mx-auto mb-4" />
          <h3 className="font-display text-xl text-navy mb-2">Нет данных</h3>
          <p className="text-sm text-muted">За выбранный семестр рейтинг недоступен</p>
        </motion.div>
      )}

      {entries.length > 0 && (
        <>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-3 sm:gap-4"
            >
              {[entries[1], entries[0], entries[2]].map((e, idx) => {
                const actualPos = [2, 1, 3][idx];
                const isMe = user?.fullName?.toLowerCase() === e.full_name.toLowerCase();
                const heights = ["h-28 sm:h-32", "h-36 sm:h-40", "h-24 sm:h-28"];
                const sizes = ["w-14 h-14 sm:w-16 sm:h-16", "w-16 h-16 sm:w-20 sm:h-20", "w-12 h-12 sm:w-14 sm:h-14"];
                const textSizes = ["text-base sm:text-lg", "text-lg sm:text-2xl", "text-sm sm:text-base"];
                return (
                  <div key={e.position} className="flex flex-col items-center">
                    <div className={`relative ${sizes[idx]} rounded-2xl bg-gradient-to-br ${avatarGradient(actualPos)} flex items-center justify-center shadow-lg ${isMe ? "ring-3 ring-white ring-offset-2 ring-offset-amber-100" : ""}`}>
                      <span className="text-white font-bold text-sm sm:text-base">{getInitials(e.full_name)}</span>
                      <div className="absolute -top-2 -right-2">
                        {positionMedal(actualPos)}
                      </div>
                    </div>
                    <div className={`mt-3 rounded-2xl w-full bg-gradient-to-t ${
                      actualPos === 1 ? "from-yellow-100/80 to-amber-50 border-yellow-200" :
                      actualPos === 2 ? "from-gray-100/80 to-gray-50 border-gray-200" :
                      "from-orange-100/80 to-amber-50 border-orange-200"
                    } border p-3 flex flex-col items-center ${heights[idx]} justify-end`}>
                      <div className={`font-display font-bold text-navy ${textSizes[idx]}`}>
                        {e.average.toFixed(2)}
                      </div>
                      <div className="text-[11px] sm:text-xs text-muted text-center mt-1 line-clamp-2 leading-tight">
                        {e.full_name}
                      </div>
                      <div className="mt-1.5 text-[10px] font-bold text-muted/60">#{actualPos}</div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Top 4–15 list */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-navy flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Топ {Math.min(TOP_N, entries.length)}
              </h2>
              <span className="text-xs text-muted">{entries.length} всего на кафедре</span>
            </div>
            <div className="divide-y divide-border/30">
              {top15.slice(3).map((e) => {
                const isMe = user?.fullName?.toLowerCase() === e.full_name.toLowerCase();
                const barW = stats ? Math.max(8, (e.average / stats.max) * 100) : 50;
                return (
                  <div
                    key={e.position}
                    className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 transition-colors ${
                      isMe
                        ? "bg-amber-50/80 border-l-4 border-l-amber-400"
                        : e.position % 2 === 0
                        ? "bg-surface/20"
                        : ""
                    }`}
                  >
                    <div className="w-8 sm:w-10 text-center shrink-0">
                      <span className={`text-sm font-bold tabular-nums ${isMe ? "text-amber-600" : "text-muted/50"}`}>
                        {e.position}
                      </span>
                    </div>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${
                      isMe ? "from-amber-400 to-amber-500" : "from-slate-200 to-slate-300"
                    } flex items-center justify-center shrink-0`}>
                      <span className={`font-bold text-[11px] sm:text-xs ${isMe ? "text-white" : "text-slate-600"}`}>
                        {getInitials(e.full_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] sm:text-sm truncate ${isMe ? "font-bold text-amber-900" : "font-medium text-navy"}`}>
                        {e.full_name}
                        {isMe && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-800 font-semibold">Вы</span>}
                      </div>
                    </div>
                    <div className="hidden sm:block w-28 lg:w-36">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isMe ? "bg-amber-400" : "bg-slate-300"}`}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-14 sm:w-16">
                      <span className={`text-sm sm:text-base font-bold tabular-nums ${isMe ? "text-amber-700" : "text-navy"}`}>
                        {e.average.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Your position card (if not in top 15) */}
          {myEntry && !myInTop && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 shadow-sm p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">#{myEntry.position}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-amber-700/70 font-medium mb-0.5">Ваше место в рейтинге</div>
                  <div className="text-base font-bold text-navy truncate">{myEntry.full_name}</div>
                  {user?.groupName && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted">
                      <GraduationCap className="h-3 w-3" />
                      {user.groupName}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-700 tabular-nums">{myEntry.average.toFixed(2)}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {stats && myEntry.average >= stats.avg ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <TrendingUp className="h-3 w-3" />
                        Выше среднего на {(myEntry.average - stats.avg).toFixed(1)}
                      </span>
                    ) : stats && myEntry.average < stats.avg ? (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <TrendingDown className="h-3 w-3" />
                        Ниже среднего на {(stats.avg - myEntry.average).toFixed(1)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted">
                        <Minus className="h-3 w-3" />
                        На уровне среднего
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {stats && (
                <div className="mt-3 h-2 rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                    style={{ width: `${Math.max(5, (myEntry.average / stats.max) * 100)}%` }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between mt-2 text-[10px] text-muted">
                <span>из {entries.length} студентов</span>
                <span>Топ {Math.round((myEntry.position / entries.length) * 100)}%</span>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
