import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Sparkles,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brsApi } from "@/shared/api/modules";
import { LoadingState } from "@/shared/ui/states";
import type { BRSGrade } from "@/shared/api/types";

function currentAcademicYear() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 8) return { start: year, end: year + 1, sem: 1 };
  if (month >= 1 && month <= 6) return { start: year - 1, end: year, sem: 2 };
  return { start: year - 1, end: year, sem: 1 };
}

const GRADE_THRESHOLDS = [
  { min: 81, label: "Отлично", short: "5", color: "text-green-700", bg: "bg-green-100", ring: "ring-green-200" },
  { min: 61, label: "Хорошо", short: "4", color: "text-blue-700", bg: "bg-blue-100", ring: "ring-blue-200" },
  { min: 41, label: "Удовл.", short: "3", color: "text-amber-700", bg: "bg-amber-100", ring: "ring-amber-200" },
  { min: 0, label: "Неуд.", short: "2", color: "text-red-700", bg: "bg-red-100", ring: "ring-red-200" },
] as const;

const ADMISSION_THRESHOLD = 21;
const ATTENDANCE_MAX_POINTS = 35;

function getGradeInfo(total: number) {
  return GRADE_THRESHOLDS.find((g) => total >= g.min) ?? GRADE_THRESHOLDS[3];
}

function getNextGradeInfo(total: number) {
  const sorted = [...GRADE_THRESHOLDS].reverse();
  for (const g of sorted) {
    if (total < g.min) return { grade: g, pointsNeeded: g.min - total };
  }
  return null;
}

function getAdmissionStatus(total: number) {
  if (total === 0) return "no_data";
  if (total >= ADMISSION_THRESHOLD) return "admitted";
  return "not_admitted";
}

function attendancePoints(pct: number): number {
  return Math.round((pct / 100) * ATTENDANCE_MAX_POINTS);
}

function calcTotal(g: BRSGrade): number {
  return attendancePoints(g.attendance) + g.att1Current + g.att1Border + g.att2Current + g.att2Border;
}

function getRecommendation(g: BRSGrade): string {
  const total = calcTotal(g);
  if (total === 0) return "Баллы ещё не выставлены. Следите за обновлениями.";
  if (total < ADMISSION_THRESHOLD) {
    const needed = ADMISSION_THRESHOLD - total;
    return `Нужно набрать ещё ${needed} балл(ов) для допуска к ${g.examType === "Экзамен" || g.examType === "exam" ? "экзамену" : "зачёту"}. Критическая ситуация!`;
  }
  if (total < 41) {
    const needed = 41 - total;
    return `До тройки ${needed} балл(ов). Не пропускайте занятия и рубежные контроли.`;
  }
  const next = getNextGradeInfo(total);
  if (next && next.pointsNeeded <= 20) {
    return `До оценки «${next.grade.label}» — ${next.pointsNeeded} балл(ов). Реально добить!`;
  }
  if (total >= 81) return "Отличный результат! Держите планку.";
  if (total >= 61) return "Хороший уровень. Можно подтянуть до 81+ для пятёрки.";
  return "Допуск есть. Сосредоточьтесь на текущих и рубежных контролях.";
}

type SortMode = "risk" | "name" | "grade";
type FilterMode = "all" | "admitted" | "risk" | "excellent";

export default function AcademicAnalyticsPage() {
  const defaults = currentAcademicYear();
  const [yearStart, setYearStart] = useState(defaults.start);
  const [yearEnd, setYearEnd] = useState(defaults.end);
  const [semester, setSemester] = useState(defaults.sem);
  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["brs", yearStart, yearEnd, semester],
    queryFn: () => brsApi.my({ yearStart, yearEnd, semester }),
    retry: false,
  });

  const grades = data?.grades ?? [];

  const stats = useMemo(() => {
    const withTotal = grades.map((g) => ({ grade: g, total: calcTotal(g) }));
    const withPoints = withTotal.filter((x) => x.total > 0);
    const avg = withPoints.length > 0 ? withPoints.reduce((s, x) => s + x.total, 0) / withPoints.length : 0;
    const admitted = withPoints.filter((x) => x.total >= ADMISSION_THRESHOLD).length;
    const atRisk = withPoints.filter((x) => x.total < ADMISSION_THRESHOLD).length;
    const excellent = withPoints.filter((x) => x.total >= 81).length;
    return { avg, admitted, atRisk, excellent, totalDisciplines: grades.length, withPoints: withPoints.length };
  }, [grades]);

  const filtered = useMemo(() => {
    let list = [...grades];
    if (filterMode === "admitted") list = list.filter((g) => calcTotal(g) >= ADMISSION_THRESHOLD);
    if (filterMode === "risk") list = list.filter((g) => { const t = calcTotal(g); return t > 0 && t < ADMISSION_THRESHOLD; });
    if (filterMode === "excellent") list = list.filter((g) => calcTotal(g) >= 81);

    list.sort((a, b) => {
      if (sortMode === "name") return a.disciplineName.localeCompare(b.disciplineName);
      if (sortMode === "grade") return calcTotal(b) - calcTotal(a);
      const ta = calcTotal(a), tb = calcTotal(b);
      if (ta === 0 && tb === 0) return 0;
      if (ta === 0) return 1;
      if (tb === 0) return -1;
      return ta - tb;
    });
    return list;
  }, [grades, sortMode, filterMode]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7B1E2E] via-[#5A1520] to-[#3D0E16] p-8 md:p-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium mb-4">
              <GraduationCap className="h-3.5 w-3.5" />
              Семестр {semester} · {yearStart}/{yearEnd}
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-white font-bold tracking-tight">
              Аналитика учёбы
            </h1>
            <p className="text-white/60 text-sm mt-2 max-w-md">
              Прогнозы оценок, персональные рекомендации и статус допуска
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={`${yearStart}-${yearEnd}`}
              onChange={(e) => {
                const [s, en] = e.target.value.split("-").map(Number);
                setYearStart(s);
                setYearEnd(en);
              }}
              className="h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-3 text-sm text-white focus:ring-2 focus:ring-white/30 outline-none appearance-none cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={`${y}-${y + 1}`} className="text-navy bg-white">
                    {y}/{y + 1}
                  </option>
                );
              })}
            </select>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-3 text-sm text-white focus:ring-2 focus:ring-white/30 outline-none appearance-none cursor-pointer"
            >
              <option value={1} className="text-navy bg-white">1 семестр</option>
              <option value={2} className="text-navy bg-white">2 семестр</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && <LoadingState rows={6} />}

      {isError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <h3 className="font-display text-xl text-navy mb-2">Не удалось загрузить</h3>
          <p className="text-sm text-muted max-w-sm mx-auto">
            Перелогиньтесь через ИСУ или попробуйте позже
          </p>
        </motion.div>
      )}

      {!isLoading && !isError && grades.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
          <GraduationCap className="h-14 w-14 text-muted/30 mx-auto mb-4" />
          <h3 className="font-display text-xl text-navy mb-2">Нет данных</h3>
          <p className="text-sm text-muted">За выбранный семестр данных нет</p>
        </motion.div>
      )}

      {grades.length > 0 && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Средний балл"
              value={stats.avg.toFixed(1)}
              sub={`из ${stats.totalDisciplines} дисциплин`}
              gradient="from-violet-500/10 to-purple-500/10"
              iconBg="bg-violet-100 text-violet-600"
              delay={0}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Допущен"
              value={String(stats.admitted)}
              sub={`из ${stats.withPoints} с баллами`}
              gradient="from-emerald-500/10 to-green-500/10"
              iconBg="bg-emerald-100 text-emerald-600"
              delay={0.05}
            />
            <KpiCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Под угрозой"
              value={String(stats.atRisk)}
              sub="< 21 балла"
              gradient={stats.atRisk > 0 ? "from-red-500/10 to-rose-500/10" : "from-emerald-500/10 to-green-500/10"}
              iconBg={stats.atRisk > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}
              delay={0.1}
            />
            <KpiCard
              icon={<Sparkles className="h-5 w-5" />}
              label="На отлично"
              value={String(stats.excellent)}
              sub="≥ 81 балла"
              gradient="from-sky-500/10 to-blue-500/10"
              iconBg="bg-sky-100 text-sky-600"
              delay={0.15}
            />
          </div>

          {/* Distribution + Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-border/40">
              <h2 className="font-display text-base text-navy font-semibold">Распределение оценок</h2>
            </div>
            <div className="p-6">
              <GradeDistribution grades={grades} />
            </div>
          </motion.div>

          {/* Toolbar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <h2 className="font-display text-lg text-navy font-semibold">
              Дисциплины
              <span className="text-sm text-muted font-normal ml-2">
                ({filtered.length})
              </span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center rounded-lg border border-border/60 bg-white overflow-hidden text-xs">
                {([["all", "Все"], ["admitted", "Допущен"], ["risk", "Риск"], ["excellent", "Отл."]] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilterMode(key)}
                    className={`px-3 py-2 transition-colors ${
                      filterMode === key
                        ? "bg-[#7B1E2E] text-white font-medium"
                        : "text-muted hover:bg-surface/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-8 rounded-lg border border-border/60 bg-white px-2 text-xs text-muted outline-none focus:ring-1 focus:ring-burgundy/20"
              >
                <option value="risk">По риску</option>
                <option value="grade">По баллам ↓</option>
                <option value="name">По имени</option>
              </select>
            </div>
          </motion.div>

          {/* Discipline Cards */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((g, i) => (
                <DisciplineCard key={g.disciplineId} grade={g} index={i} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-sm text-muted">
                Нет дисциплин по выбранному фильтру
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, gradient, iconBg, delay }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  gradient: string; iconBg: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`relative rounded-2xl bg-gradient-to-br ${gradient} border border-border/40 p-5 overflow-hidden group hover:shadow-md transition-shadow`}
    >
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted/80 font-semibold">{label}</div>
      <div className="font-display text-3xl text-navy font-bold mt-1">{value}</div>
      <div className="text-[11px] text-muted mt-1">{sub}</div>
    </motion.div>
  );
}

function GradeDistribution({ grades }: { grades: BRSGrade[] }) {
  const withPoints = grades.filter((g) => calcTotal(g) > 0);
  const counts = GRADE_THRESHOLDS.map((t) => ({
    ...t,
    count: withPoints.filter((g) => getGradeInfo(calcTotal(g)).label === t.label).length,
  }));
  const total = withPoints.length || 1;

  return (
    <div className="space-y-3">
      {counts.map((c) => {
        const pct = Math.round((c.count / total) * 100);
        return (
          <div key={c.label} className="flex items-center gap-4">
            <div className="w-16 flex items-center gap-2">
              <span className={`text-sm font-bold ${c.color}`}>{c.short}</span>
              <span className="text-[11px] text-muted">{c.label}</span>
            </div>
            <div className="flex-1 h-8 rounded-lg bg-gray-50 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 ${c.bg} rounded-lg`}
              />
              <div className="relative z-10 flex items-center h-full px-3">
                <span className={`text-xs font-semibold ${c.color}`}>{c.count}</span>
              </div>
            </div>
            <span className="text-xs text-muted w-10 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function DisciplineCard({ grade: g, index }: { grade: BRSGrade; index: number }) {
  const [open, setOpen] = useState(false);
  const total = calcTotal(g);
  const gradeInfo = getGradeInfo(total);
  const nextGrade = getNextGradeInfo(total);
  const admission = getAdmissionStatus(total);
  const recommendation = getRecommendation(g);
  const progressPct = Math.min(100, (total / 100) * 100);
  const isExam = g.examType === "Экзамен" || g.examType === "exam";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div
        className="px-5 py-4 cursor-pointer group"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-4">
          {/* Grade circle */}
          <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl ${gradeInfo.bg} flex items-center justify-center`}>
            <span className={`font-display text-2xl font-bold ${gradeInfo.color}`}>
              {total > 0 ? gradeInfo.short : "—"}
            </span>
            {total > 0 && (
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100" />
                <circle
                  cx="28" cy="28" r="24" fill="none" strokeWidth="3"
                  strokeDasharray={`${progressPct * 1.508} 150.8`}
                  strokeLinecap="round"
                  className={total >= 81 ? "text-green-400" : total >= 61 ? "text-blue-400" : total >= 41 ? "text-amber-400" : "text-red-400"}
                />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-navy text-[15px] truncate leading-tight">
                {g.disciplineName}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface font-medium text-muted">
                {isExam ? "Экзамен" : "Зачёт"}
              </span>
              {g.attendance > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                  g.attendance >= 80 ? "bg-emerald-50 text-emerald-700" : g.attendance >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                }`}>
                  {g.attendance}% посещ.
                </span>
              )}
              {g.teacherName && (
                <span className="text-[10px] text-muted truncate max-w-[140px]">
                  {g.teacherName}
                </span>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-lg font-bold text-navy">{total || "—"}</div>
              <div className="text-[10px] text-muted">из 100</div>
            </div>
            {total > 0 && admission === "not_admitted" && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-semibold border border-red-100">
                Не допущен
              </span>
            )}
            {total > 0 && admission === "admitted" && total < 41 && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-100">
                Двойка
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-2 border-t border-border/30">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Points */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3">
                    Разбивка баллов
                  </div>
                  <div className="space-y-1.5">
                    <BarRow label="Посещаемость" value={attendancePoints(g.attendance)} max={ATTENDANCE_MAX_POINTS} info={`${g.attendance}%`} color="bg-violet-400" />
                    <BarRow label="Текущая 1" value={g.att1Current} max={25} color="bg-sky-400" />
                    <BarRow label="Рубежная 1" value={g.att1Border} max={25} color="bg-blue-500" />
                    <BarRow label="Текущая 2" value={g.att2Current} max={25} color="bg-sky-400" />
                    <BarRow label="Рубежная 2" value={g.att2Border} max={25} color="bg-blue-500" />
                    {g.independentWork > 0 && <BarRow label="Самост. работа" value={g.independentWork} max={10} color="bg-teal-400" />}
                    {g.retake > 0 && <BarRow label="Досдача" value={g.retake} max={20} color="bg-orange-400" />}
                    {g.bonus > 0 && <BarRow label="Премиальные" value={g.bonus} max={10} color="bg-pink-400" />}
                  </div>
                  <div className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#7B1E2E]/5 to-[#7B1E2E]/10 border border-[#7B1E2E]/10">
                    <span className="text-xs font-bold text-[#7B1E2E]">Итого</span>
                    <span className="text-base font-bold text-navy">{total}<span className="text-muted text-xs font-normal"> / 100</span></span>
                  </div>
                </div>

                {/* Recommendation */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3">
                    Рекомендация
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-surface/80 to-surface border border-border/40">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#7B1E2E]/10 flex items-center justify-center flex-shrink-0">
                        <Target className="h-4 w-4 text-[#7B1E2E]" />
                      </div>
                      <p className="text-sm text-navy leading-relaxed">{recommendation}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {nextGrade && total > 0 && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100/60">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-navy">
                          До «{nextGrade.grade.label}»: <span className="font-bold">+{nextGrade.pointsNeeded}</span>
                        </span>
                      </div>
                    )}
                    {total > 0 && total < ADMISSION_THRESHOLD && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-red-50/60 border border-red-100/60">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-700 font-medium">
                          До допуска: +{ADMISSION_THRESHOLD - total} баллов
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BarRow({ label, value, max, info, color }: { label: string; value: number; max: number; info?: string; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-muted w-28 truncate">{label}</span>
      <div className="flex-1 h-5 rounded-md bg-gray-50 overflow-hidden relative">
        <div className={`absolute inset-y-0 left-0 rounded-md ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-navy w-16 text-right">
        {value}{info ? <span className="text-muted font-normal"> ({info})</span> : <span className="text-muted font-normal"> / {max}</span>}
      </span>
    </div>
  );
}
