import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brsApi } from "@/shared/api/modules";
import { Button } from "@/shared/ui/button";
import { LoadingState } from "@/shared/ui/states";
import type { BRSGrade, BRSJournalEntry } from "@/shared/api/types";

function currentAcademicYear() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 8) return { start: year, end: year + 1, sem: 1 };
  if (month >= 1 && month <= 6) return { start: year - 1, end: year, sem: 2 };
  return { start: year - 1, end: year, sem: 1 };
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-1">
            Успеваемость
          </div>
          <h1 className="font-display text-3xl text-navy">
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
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy outline-none"
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
            className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy outline-none"
          >
            <option value={1}>1 семестр</option>
            <option value={2}>2 семестр</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Обновить
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState rows={8} />}

      {isSessionExpired && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-xl text-navy mb-2">
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
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
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
        >
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display text-xl text-navy mb-2">
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
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
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
          grades={exams}
          yearStart={yearStart}
          yearEnd={yearEnd}
          semester={semester}
        />
      )}

      {credits.length > 0 && (
        <GradeSection
          title="Зачёты"
          grades={credits}
          yearStart={yearStart}
          yearEnd={yearEnd}
          semester={semester}
        />
      )}
    </div>
  );
}

function GradeSection({
  title,
  grades,
  yearStart,
  yearEnd,
  semester,
}: {
  title: string;
  grades: BRSGrade[];
  yearStart: number;
  yearEnd: number;
  semester: number;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-white shadow-card overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-border bg-surface">
        <h2 className="font-display text-lg text-navy">
          {title}{" "}
          <span className="text-muted text-sm font-normal">
            ({grades.length})
          </span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="w-8" />
              <th className="px-4 py-3 font-semibold">Дисциплина</th>
              <th className="px-4 py-3 font-semibold">Преподаватель</th>
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
            {grades.map((g) => (
              <GradeRow
                key={g.disciplineId}
                grade={g}
                expanded={expandedId === g.disciplineId}
                onToggle={() =>
                  setExpandedId(
                    expandedId === g.disciplineId ? null : g.disciplineId
                  )
                }
                yearStart={yearStart}
                yearEnd={yearEnd}
                semester={semester}
              />
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function GradeRow({
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

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border/50 last:border-0 hover:bg-surface/50 transition-colors cursor-pointer"
      >
        <td className="pl-3 py-3">
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </td>
        <td className="px-4 py-3 font-medium text-navy max-w-[240px]">
          <span className="truncate block">{g.disciplineName}</span>
        </td>
        <td className="px-4 py-3 text-muted max-w-[180px]">
          <span className="truncate block">{g.teacherName || "—"}</span>
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.att1Current} />
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.att1Border} />
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.att2Current} />
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.att2Border} />
        </td>
        <td className="px-3 py-3 text-center">
          <AttendanceBadge value={g.attendance} />
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.independentWork} />
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.retake} />
        </td>
        <td className="px-3 py-3 text-center">
          <ScoreCell value={g.bonus} />
        </td>
        <td className="px-3 py-3 text-center">
          <TotalBadge value={g.total} />
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={12} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <JournalPanel journal={journal} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function JournalPanel({ journal }: { journal?: BRSJournalEntry[] }) {
  if (!journal) {
    return (
      <div className="px-6 py-4 bg-surface/30 text-sm text-muted text-center">
        Загрузка журнала…
      </div>
    );
  }
  if (journal.length === 0) {
    return (
      <div className="px-6 py-4 bg-surface/30 text-sm text-muted text-center">
        Записи в журнале отсутствуют
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-surface/30 border-t border-border/50">
      <div className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">
        Журнал посещаемости
      </div>
      <div className="flex flex-wrap gap-2">
        {journal.map((entry) => (
          <div
            key={entry.pk}
            className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border text-xs ${
              entry.attended
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
            title={`${entry.date} — ${entry.attended ? "Был" : "Н"}${
              entry.grade > 0 ? `, балл: ${entry.grade}` : ""
            }`}
          >
            <span className="text-[10px] text-muted">
              {new Date(entry.date).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
            {entry.attended ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <X className="h-3.5 w-3.5 text-red-500" />
            )}
            {entry.grade > 0 && (
              <span className="font-bold text-navy">{entry.grade}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreCell({ value }: { value: number }) {
  if (!value) return <span className="text-muted">—</span>;
  return <span className="font-medium text-navy">{value}</span>;
}

function AttendanceBadge({ value }: { value: number }) {
  if (!value) return <span className="text-muted">—</span>;
  let color = "text-green-700";
  if (value < 50) color = "text-red-600";
  else if (value < 75) color = "text-amber-600";
  return <span className={`font-medium ${color}`}>{value.toFixed(0)}%</span>;
}

function TotalBadge({ value }: { value: number }) {
  if (!value) return <span className="text-muted">—</span>;
  let color = "bg-green-100 text-green-800";
  if (value < 60) color = "bg-red-100 text-red-700";
  else if (value < 75) color = "bg-amber-100 text-amber-700";
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-lg text-xs font-bold ${color}`}
    >
      {value}
    </span>
  );
}
