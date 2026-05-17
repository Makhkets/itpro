import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Check,
  X,
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brsApi } from "@/shared/api/modules";
import { Button } from "@/shared/ui/button";
import { LoadingState } from "@/shared/ui/states";
import type { BRSGrade, BRSTeacher, BRSJournalEntry } from "@/shared/api/types";

function currentAcademicYear() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 8) return { start: year, end: year + 1, sem: 1 };
  if (month >= 1 && month <= 6) return { start: year - 1, end: year, sem: 2 };
  return { start: year - 1, end: year, sem: 1 };
}

const ATTENDANCE_MAX_POINTS = 35;

function attendancePoints(pct: number): number {
  return Math.round((pct / 100) * ATTENDANCE_MAX_POINTS);
}

function calcTotal(g: BRSGrade): number {
  return attendancePoints(g.attendance) + g.att1Current + g.att1Border + g.att2Current + g.att2Border;
}

function scoreColor(v: number) {
  if (v >= 81) return { border: "border-emerald-400", bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50" };
  if (v >= 61) return { border: "border-blue-400", bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" };
  if (v >= 41) return { border: "border-yellow-400", bg: "bg-yellow-500", text: "text-yellow-700", light: "bg-yellow-50" };
  if (v >= 21) return { border: "border-orange-400", bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50" };
  return { border: "border-gray-300", bg: "bg-gray-400", text: "text-gray-500", light: "bg-gray-50" };
}

export default function BRSPage() {
  const defaults = currentAcademicYear();
  const [yearStart, setYearStart] = useState(defaults.start);
  const [yearEnd, setYearEnd] = useState(defaults.end);
  const [semester, setSemester] = useState(defaults.sem);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["brs", yearStart, yearEnd, semester],
    queryFn: () => brsApi.my({ yearStart, yearEnd, semester }),
    retry: false,
  });

  const isSessionExpired =
    isError &&
    (error as { response?: { status?: number } })?.response?.status === 401;

  const grades = data?.grades ?? [];
  const exams = grades.filter(
    (g) => g.examType === "Экзамен" || g.examType === "exam"
  );
  const credits = grades.filter(
    (g) => g.examType !== "Экзамен" && g.examType !== "exam"
  );

  const avg = grades.length
    ? Math.round(grades.reduce((s, g) => s + calcTotal(g), 0) / grades.length)
    : 0;
  const best = grades.length
    ? grades.reduce((a, g) => (calcTotal(g) > calcTotal(a) ? g : a), grades[0])
    : null;
  const worst = grades.length
    ? grades.reduce((a, g) => (calcTotal(g) < calcTotal(a) ? g : a), grades[0])
    : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ─── Hero banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-navy via-[#1f2a47] to-navy text-white p-5 sm:p-8"
      >
        <div className="absolute inset-0 hero-lines opacity-40" />
        <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-burgundy/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-accent-red/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/50 font-semibold mb-1">
                Успеваемость
              </div>
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl leading-tight">
                Балльно-рейтинговая система
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={`${yearStart}-${yearEnd}`}
                onChange={(e) => {
                  const [s, en] = e.target.value.split("-").map(Number);
                  setYearStart(s);
                  setYearEnd(en);
                }}
                className="h-9 rounded-lg border border-white/20 bg-white/10 px-2.5 text-sm text-white backdrop-blur-sm focus:ring-2 focus:ring-white/30 focus:border-white/40 outline-none [&>option]:text-navy"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={y} value={`${y}-${y + 1}`}>
                      {y}/{y + 1}
                    </option>
                  );
                })}
              </select>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="h-9 rounded-lg border border-white/20 bg-white/10 px-2.5 text-sm text-white backdrop-blur-sm focus:ring-2 focus:ring-white/30 focus:border-white/40 outline-none [&>option]:text-navy"
              >
                <option value={1}>1 семестр</option>
                <option value={2}>2 семестр</option>
              </select>
              <button
                onClick={() => refetch()}
                className="h-9 w-9 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          {grades.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 sm:px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Award className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Средний</span>
                </div>
                <div className="font-display text-2xl sm:text-3xl leading-none">{avg}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 sm:px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400/70" />
                  <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Лучший</span>
                </div>
                <div className="font-display text-2xl sm:text-3xl leading-none">{best ? calcTotal(best) : "—"}</div>
                <div className="text-[10px] text-white/40 truncate mt-0.5">{best?.disciplineName}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 sm:px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-400/70" />
                  <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Слабый</span>
                </div>
                <div className="font-display text-2xl sm:text-3xl leading-none">{worst ? calcTotal(worst) : "—"}</div>
                <div className="text-[10px] text-white/40 truncate mt-0.5">{worst?.disciplineName}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {isLoading && <LoadingState rows={8} />}

      {isSessionExpired && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg sm:text-xl text-navy mb-2">
            Сессия ИСУ истекла
          </h3>
          <p className="text-sm text-muted mb-4">
            Для просмотра данных БРС необходимо заново авторизоваться через ИСУ
            ГГНТУ на странице входа.
          </p>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/login")}
          >
            Перейти ко входу
          </Button>
        </motion.div>
      )}

      {isError && !isSessionExpired && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6 text-center">
          <p className="text-sm text-red-700">
            Не удалось загрузить данные БРС. Попробуйте обновить страницу или
            авторизоваться заново.
          </p>
        </div>
      )}

      {!isLoading && !isError && data?.error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-lg sm:text-xl text-navy mb-2">
            ИСУ временно недоступен
          </h3>
          <p className="text-sm text-muted mb-4">
            Сервер ИСУ ГГНТУ не отвечает. Попробуйте позже или отключите VPN.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Повторить
          </Button>
        </motion.div>
      )}

      {!isLoading && !isError && !data?.error && grades.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-white p-8 sm:p-10 text-center">
          <GraduationCap className="h-12 w-12 text-muted/40 mx-auto mb-4" />
          <h3 className="font-display text-xl text-navy mb-2">Нет данных</h3>
          <p className="text-sm text-muted">
            За выбранный семестр данные БРС не найдены. Попробуйте выбрать другой
            период.
          </p>
        </div>
      )}

      {exams.length > 0 && (
        <GradeSection
          title="Экзамены"
          icon={<BookOpen className="h-4.5 w-4.5" />}
          grades={exams}
          yearStart={yearStart}
          yearEnd={yearEnd}
          semester={semester}
        />
      )}

      {credits.length > 0 && (
        <GradeSection
          title="Зачёты"
          icon={<GraduationCap className="h-4.5 w-4.5" />}
          grades={credits}
          yearStart={yearStart}
          yearEnd={yearEnd}
          semester={semester}
        />
      )}
    </div>
  );
}

/* ─── Section (Экзамены / Зачёты) ─── */
function GradeSection({
  title,
  icon,
  grades,
  yearStart,
  yearEnd,
  semester,
}: {
  title: string;
  icon: React.ReactNode;
  grades: BRSGrade[];
  yearStart: number;
  yearEnd: number;
  semester: number;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-lg bg-burgundy/10 flex items-center justify-center text-burgundy">
          {icon}
        </div>
        <h2 className="font-display text-lg text-navy">
          {title}
        </h2>
        <span className="text-xs text-muted bg-surface rounded-full px-2 py-0.5">{grades.length}</span>
      </div>

      {/* ===== Mobile: card list ===== */}
      <div className="md:hidden space-y-2.5">
        {grades.map((g, i) => (
          <motion.div
            key={g.disciplineId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <MobileGradeCard
              grade={g}
              expanded={expandedId === g.disciplineId}
              onToggle={() => toggle(g.disciplineId)}
              yearStart={yearStart}
              yearEnd={yearEnd}
              semester={semester}
            />
          </motion.div>
        ))}
      </div>

      {/* ===== Desktop: table ===== */}
      <div className="hidden md:block rounded-2xl border border-border bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="w-8" />
                <th className="px-4 py-3 font-semibold">Дисциплина</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Преподаватель</th>
                <th className="px-3 py-3 font-semibold text-center">Тек. 1</th>
                <th className="px-3 py-3 font-semibold text-center">Руб. 1</th>
                <th className="px-3 py-3 font-semibold text-center">Тек. 2</th>
                <th className="px-3 py-3 font-semibold text-center">Руб. 2</th>
                <th className="px-3 py-3 font-semibold text-center">Посещ.</th>
                <th className="px-3 py-3 font-semibold text-center">С/Р</th>
                <th className="px-3 py-3 font-semibold text-center">Досд.</th>
                <th className="px-3 py-3 font-semibold text-center">Прем.</th>
                <th className="px-3 py-3 font-semibold text-center">Итого</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <DesktopGradeRow
                  key={g.disciplineId}
                  grade={g}
                  index={i}
                  expanded={expandedId === g.disciplineId}
                  onToggle={() => toggle(g.disciplineId)}
                  yearStart={yearStart}
                  yearEnd={yearEnd}
                  semester={semester}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Mobile card ─── */
function MobileGradeCard({
  grade: g,
  expanded,
  onToggle,
  yearStart,
  yearEnd,
  semester,
}: {
  grade: BRSGrade;
  expanded: boolean;
  onToggle: () => void;
  yearStart: number;
  yearEnd: number;
  semester: number;
}) {
  const { data: journal } = useQuery({
    queryKey: ["brs-journal", g.disciplineId, yearStart, yearEnd, semester],
    queryFn: () =>
      brsApi.journal(g.disciplineId, { yearStart, yearEnd, semester }),
    enabled: expanded,
    staleTime: 60_000,
  });

  const total = calcTotal(g);

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-shadow ${expanded ? "shadow-md border-border" : "border-border/70"}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-3.5 py-3 flex items-center gap-3 active:bg-surface/40 transition-colors"
      >
        <ScoreRing value={total} size={46} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] text-navy leading-snug">{g.disciplineName}</div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <SumBadge label="Атт.1" value={g.att1Current + g.att1Border} />
            <SumBadge label="Атт.2" value={g.att2Current + g.att2Border} />
            {g.attendance > 0 && <SumBadge label="Посещ." value={g.attendance} suffix="%" />}
          </div>
          <div className="mt-1">
            <TeacherInfo teachers={g.teachers} fallback={g.teacherName} compact />
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted/60 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-2.5">
              <div className="h-px bg-border/60" />
              <DetailedBreakdown grade={g} />
              <JournalPanel journal={journal} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileScoreItem({ label, value, isPercent }: { label: string; value: number; isPercent?: boolean }) {
  const hasValue = !!value;
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center border ${hasValue ? "bg-surface/40 border-border/40" : "bg-surface/20 border-transparent"}`}>
      <div className="text-[9px] text-muted uppercase tracking-wider font-medium">{label}</div>
      {!hasValue ? (
        <div className="text-xs text-muted/50 mt-0.5">—</div>
      ) : isPercent ? (
        <div className="mt-0.5"><AttendanceBadge value={value} /></div>
      ) : (
        <div className="text-sm font-bold text-navy mt-0.5">{value}</div>
      )}
    </div>
  );
}

/* ─── Sum badge for collapsed mobile view ─── */
function SumBadge({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-surface border border-border/40">
      <span className="text-muted font-medium">{label}</span>
      <span className="font-bold text-navy">{value}{suffix}</span>
    </span>
  );
}

/* ─── Detailed score breakdown (shown in expanded panel) ─── */
function DetailedBreakdown({ grade: g }: { grade: BRSGrade }) {
  const att1 = g.att1Current + g.att1Border;
  const att2 = g.att2Current + g.att2Border;
  const attPts = attendancePoints(g.attendance);
  const total = calcTotal(g);

  const rows = [
    { label: "Текущая 1", value: g.att1Current },
    { label: "Рубежная 1", value: g.att1Border },
    { label: "Текущая 2", value: g.att2Current },
    { label: "Рубежная 2", value: g.att2Border },
    { label: `Посещаемость (${g.attendance}%)`, value: attPts },
    { label: "Самост. работа", value: g.independentWork },
    { label: "Досдача", value: g.retake },
    { label: "Премиальные", value: g.bonus },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[12px] py-0.5">
            <span className="text-muted">{r.label}</span>
            <span className={`font-semibold tabular-nums ${r.value ? "text-navy" : "text-muted/40"}`}>
              {r.value || "—"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">Атт.1: {att1}</span>
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">Атт.2: {att2}</span>
          <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-semibold">Посещ: {attPts}</span>
        </div>
        <div className="ml-auto px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7B1E2E]/5 to-[#7B1E2E]/10 border border-[#7B1E2E]/10">
          <span className="text-xs font-bold text-[#7B1E2E]">Итого </span>
          <span className="text-sm font-bold text-navy">{total}<span className="text-muted text-[11px] font-normal"> / 100</span></span>
        </div>
      </div>
    </div>
  );
}

/* ─── Desktop table row ─── */
function DesktopGradeRow({
  grade: g,
  index,
  expanded,
  onToggle,
  yearStart,
  yearEnd,
  semester,
}: {
  grade: BRSGrade;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  yearStart: number;
  yearEnd: number;
  semester: number;
}) {
  const { data: journal } = useQuery({
    queryKey: ["brs-journal", g.disciplineId, yearStart, yearEnd, semester],
    queryFn: () =>
      brsApi.journal(g.disciplineId, { yearStart, yearEnd, semester }),
    enabled: expanded,
    staleTime: 60_000,
  });

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-border/40 last:border-0 hover:bg-burgundy/[0.02] transition-colors cursor-pointer ${
          index % 2 === 1 ? "bg-surface/30" : ""
        } ${expanded ? "bg-burgundy/[0.03]" : ""}`}
      >
        <td className="pl-3 py-3.5">
          <ChevronDown
            className={`h-4 w-4 text-muted/60 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </td>
        <td className="px-4 py-3.5 font-medium text-navy">
          <div className="leading-snug">{g.disciplineName}</div>
          <div className="lg:hidden mt-1.5">
            <TeacherInfo teachers={g.teachers} fallback={g.teacherName} />
          </div>
        </td>
        <td className="px-4 py-3.5 hidden lg:table-cell">
          <TeacherInfo teachers={g.teachers} fallback={g.teacherName} />
        </td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.att1Current} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.att1Border} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.att2Current} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.att2Border} /></td>
        <td className="px-3 py-3.5 text-center"><AttendanceBadge value={g.attendance} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.independentWork} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.retake} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreCell value={g.bonus} /></td>
        <td className="px-3 py-3.5 text-center"><ScoreRing value={calcTotal(g)} size={44} /></td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={12} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-5 bg-gradient-to-b from-surface/40 to-surface/10 border-t border-border/40">
                  <DetailedBreakdown grade={g} />
                  <div className="mt-4">
                    <JournalPanel journal={journal} />
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Journal panel ─── */
const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function JournalPanel({ journal }: { journal?: BRSJournalEntry[] }) {
  if (!journal) {
    return (
      <div className="py-4 text-sm text-muted text-center">
        <div className="inline-flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Загрузка журнала…
        </div>
      </div>
    );
  }
  if (journal.length === 0) {
    return (
      <div className="py-4 text-sm text-muted text-center">
        Записи в журнале отсутствуют
      </div>
    );
  }

  const attended = journal.filter((e) => e.attended).length;
  const missed = journal.length - attended;
  const pct = Math.round((attended / journal.length) * 100);
  const totalGrade = journal.reduce((s, e) => s + e.grade, 0);

  return (
    <div className="border-t border-border/40 pt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">
          Журнал посещаемости
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">Был: {attended}</span>
          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">Пропуск: {missed}</span>
          <span className="font-medium text-navy/60">{pct}%</span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1.5 pb-1">
          {journal.map((entry) => {
            const d = new Date(entry.date);
            const dayName = DAY_NAMES[d.getDay()];
            const dateStr = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });

            return (
              <div
                key={entry.pk}
                className={`flex flex-col items-center gap-0.5 min-w-[44px] py-2 px-1 rounded-lg border text-xs shrink-0 transition-transform hover:scale-105 ${
                  entry.attended
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-red-200 bg-red-50/80"
                }`}
              >
                <span className="text-[9px] font-medium text-muted/70 leading-none">{dayName}</span>
                <span className="text-[10px] text-muted leading-none">{dateStr}</span>
                {entry.attended ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5" />
                ) : (
                  <X className="h-3.5 w-3.5 text-red-500 mt-0.5" />
                )}
                {entry.grade > 0 && (
                  <span className="font-bold text-[11px] text-navy leading-none mt-0.5">{entry.grade}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {totalGrade > 0 && (
        <div className="mt-2 text-[11px] text-muted">
          Баллов за занятия: <span className="font-semibold text-navy">{totalGrade}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Shared components ─── */

function ScoreCell({ value }: { value: number }) {
  if (!value) return <span className="text-muted/40">—</span>;
  return <span className="font-semibold text-navy tabular-nums">{value}</span>;
}

function AttendanceBadge({ value }: { value: number }) {
  if (!value) return <span className="text-muted/40">—</span>;
  let cls = "text-emerald-600 bg-emerald-50";
  if (value < 50) cls = "text-red-600 bg-red-50";
  else if (value < 75) cls = "text-amber-600 bg-amber-50";
  return (
    <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded-md ${cls}`}>
      {value.toFixed(0)}%
    </span>
  );
}

function ScoreRing({ value, size = 44 }: { value: number; size?: number }) {
  const safeValue = value ?? 0;

  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(safeValue / 100, 1);
  const offset = circ * (1 - pct);

  let stroke = "#22c55e";
  let glowColor = "rgba(34,197,94,0.15)";
  let textColor = "text-emerald-700";
  if (safeValue <= 20) {
    stroke = "#9ca3af"; glowColor = "rgba(156,163,175,0.12)"; textColor = "text-gray-500";
  } else if (safeValue <= 40) {
    stroke = "#f97316"; glowColor = "rgba(249,115,22,0.15)"; textColor = "text-orange-600";
  } else if (safeValue <= 60) {
    stroke = "#eab308"; glowColor = "rgba(234,179,8,0.15)"; textColor = "text-yellow-600";
  } else if (safeValue <= 80) {
    stroke = "#3b82f6"; glowColor = "rgba(59,130,246,0.15)"; textColor = "text-blue-600";
  }

  const ref = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.strokeDashoffset = String(circ);
    const frame = requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)";
      el.style.strokeDashoffset = String(offset);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, circ, offset]);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size, filter: `drop-shadow(0 0 6px ${glowColor})` }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="currentColor"
          className="text-border/50" strokeWidth="3"
        />
        <circle
          ref={ref}
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={stroke}
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ}
        />
      </svg>
      <span className={`absolute text-[11px] font-bold ${textColor}`}>{safeValue}</span>
    </div>
  );
}

/* ─── Teacher info ─── */

const ROLE_LABELS: Record<string, string> = {
  lecture: "Лекции",
  practice: "Практика",
  lab: "Лабы",
};

const ROLE_COLORS: Record<string, string> = {
  lecture: "bg-indigo-100/80 text-indigo-700",
  practice: "bg-emerald-100/80 text-emerald-700",
  lab: "bg-amber-100/80 text-amber-700",
};

const ROLE_ICONS: Record<string, string> = {
  lecture: "bg-indigo-500",
  practice: "bg-emerald-500",
  lab: "bg-amber-500",
};

function TeacherInfo({
  teachers,
  fallback,
  compact,
}: {
  teachers?: BRSTeacher[];
  fallback?: string;
  compact?: boolean;
}) {
  if (!teachers || teachers.length === 0) {
    if (!fallback) return null;
    return (
      <div className="flex items-center gap-1.5">
        <User className="h-3 w-3 text-muted/50 shrink-0" />
        <span className="text-xs text-muted leading-snug">{fallback}</span>
      </div>
    );
  }

  const uniqueNames = [...new Set(teachers.map((t) => t.name))];

  if (uniqueNames.length === 1) {
    const roles = teachers.map((t) => ROLE_LABELS[t.role] || t.role).join(" · ");
    return (
      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-muted/50 shrink-0" />
          <span className="text-xs text-navy/80 leading-snug">{uniqueNames[0]}</span>
        </div>
        <span className="inline-block text-[10px] font-medium px-1.5 py-px rounded bg-slate-100 text-slate-500">
          {roles}
        </span>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {teachers.map((t, i) => (
        <div key={`${t.role}-${i}`} className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ROLE_ICONS[t.role] || "bg-slate-400"}`} />
          <span
            className={`text-[10px] font-semibold px-1.5 py-px rounded whitespace-nowrap ${
              ROLE_COLORS[t.role] || "bg-slate-100 text-slate-600"
            }`}
          >
            {ROLE_LABELS[t.role] || t.role}
          </span>
          <span className="text-xs text-navy/80 leading-snug truncate">{t.name}</span>
        </div>
      ))}
    </div>
  );
}
