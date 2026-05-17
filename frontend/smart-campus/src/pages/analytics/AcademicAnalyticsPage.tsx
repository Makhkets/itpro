import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  GraduationCap,
  BarChart3,
  Zap,
  Shield,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { brsApi } from "@/shared/api/modules";
import { LoadingState } from "@/shared/ui/states";
import type { BRSGrade } from "@/shared/api/types";

/* ─── Helpers ─── */
function currentAcademicYear() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  if (m >= 8) return { start: y, end: y + 1, sem: 1 };
  if (m >= 1 && m <= 6) return { start: y - 1, end: y, sem: 2 };
  return { start: y - 1, end: y, sem: 1 };
}

const THRESHOLDS = [
  { min: 81, label: "Отлично", short: "5", color: "#22c55e", bg: "bg-green-100", text: "text-green-700" },
  { min: 61, label: "Хорошо", short: "4", color: "#3b82f6", bg: "bg-blue-100", text: "text-blue-700" },
  { min: 41, label: "Удовл.", short: "3", color: "#eab308", bg: "bg-amber-100", text: "text-amber-700" },
  { min: 21, label: "Допуск", short: "2", color: "#f97316", bg: "bg-orange-100", text: "text-orange-700" },
  { min: 0, label: "Не допущен", short: "—", color: "#9ca3af", bg: "bg-gray-100", text: "text-gray-500" },
] as const;

const ADMIT = 21;
const ATT_MAX = 35;
const PIE_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#d1d5db"];

function attPts(pct: number) { return Math.round((pct / 100) * ATT_MAX); }
function calcT(g: BRSGrade) { return attPts(g.attendance) + g.att1Current + g.att1Border + g.att2Current + g.att2Border; }
function gradeOf(t: number) { return THRESHOLDS.find((x) => t >= x.min) ?? THRESHOLDS[4]; }
function nextGrade(t: number) {
  const sorted = [...THRESHOLDS].reverse();
  for (const g of sorted) if (t < g.min) return { grade: g, need: g.min - t };
  return null;
}

/* ─── Specialization average type ─── */
interface SpecAvgItem { discipline_name: string; average: number }

/* ─── Page ─── */
export default function AcademicAnalyticsPage() {
  const defaults = currentAcademicYear();
  const [yearStart, setYearStart] = useState(defaults.start);
  const [yearEnd, setYearEnd] = useState(defaults.end);
  const [semester, setSemester] = useState(defaults.sem);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["brs", yearStart, yearEnd, semester],
    queryFn: () => brsApi.my({ yearStart, yearEnd, semester }),
    retry: false,
  });

  const { data: specAvgRaw } = useQuery({
    queryKey: ["brs-spec-avg", yearStart, yearEnd, semester],
    queryFn: () => brsApi.specializationAvg({ yearStart, yearEnd, semester }),
    retry: false,
  });

  const grades = data?.grades ?? [];
  const specAvg = Array.isArray(specAvgRaw) ? (specAvgRaw as SpecAvgItem[]) : [];

  const stats = useMemo(() => {
    const items = grades.map((g) => ({ g, t: calcT(g) }));
    const active = items.filter((x) => x.t > 0);
    const avg = active.length ? active.reduce((s, x) => s + x.t, 0) / active.length : 0;
    const admitted = active.filter((x) => x.t >= ADMIT).length;
    const atRisk = active.filter((x) => x.t < ADMIT).length;
    const excellent = active.filter((x) => x.t >= 81).length;
    const good = active.filter((x) => x.t >= 61 && x.t < 81).length;
    const satisfactory = active.filter((x) => x.t >= 41 && x.t < 61).length;
    const weak = active.filter((x) => x.t >= 21 && x.t < 41).length;
    const noAdmit = active.filter((x) => x.t < 21).length;
    const totalAtt = active.length ? active.reduce((s, x) => s + x.g.attendance, 0) / active.length : 0;
    const att1Avg = active.length ? active.reduce((s, x) => s + x.g.att1Current + x.g.att1Border, 0) / active.length : 0;
    const att2Avg = active.length ? active.reduce((s, x) => s + x.g.att2Current + x.g.att2Border, 0) / active.length : 0;
    return { avg, admitted, atRisk, excellent, good, satisfactory, weak, noAdmit, total: grades.length, active: active.length, totalAtt, att1Avg, att2Avg };
  }, [grades]);

  const pieData = useMemo(() => [
    { name: "Отлично", value: stats.excellent },
    { name: "Хорошо", value: stats.good },
    { name: "Удовл.", value: stats.satisfactory },
    { name: "Допуск", value: stats.weak },
    { name: "Не допущ.", value: stats.noAdmit },
  ].filter((x) => x.value > 0), [stats]);

  const radarData = useMemo(() => {
    return grades.filter((g) => calcT(g) > 0).slice(0, 8).map((g) => {
      const name = g.disciplineName.length > 12 ? g.disciplineName.slice(0, 12) + "…" : g.disciplineName;
      const specItem = specAvg.find((s) => s.discipline_name === g.disciplineName);
      return { name, score: calcT(g), specAvg: specItem?.average ?? 0 };
    });
  }, [grades, specAvg]);

  const barData = useMemo(() => {
    return grades.filter((g) => calcT(g) > 0).map((g) => {
      const name = g.disciplineName.length > 15 ? g.disciplineName.slice(0, 15) + "…" : g.disciplineName;
      return { name, att1: g.att1Current + g.att1Border, att2: g.att2Current + g.att2Border, attend: attPts(g.attendance) };
    });
  }, [grades]);

  const insights = useMemo(() => {
    const list: { icon: React.ReactNode; text: string; type: "success" | "warning" | "danger" | "info" }[] = [];
    if (stats.atRisk > 0) list.push({ icon: <AlertTriangle className="h-4 w-4" />, text: `${stats.atRisk} дисциплин(ы) под угрозой недопуска. Срочно нужны баллы!`, type: "danger" });
    if (stats.excellent >= 3) list.push({ icon: <Sparkles className="h-4 w-4" />, text: `У вас ${stats.excellent} дисциплин(ы) на 5! Отличный результат.`, type: "success" });
    if (stats.totalAtt >= 80) list.push({ icon: <CheckCircle2 className="h-4 w-4" />, text: `Средняя посещаемость ${stats.totalAtt.toFixed(0)}% — отличный показатель.`, type: "success" });
    else if (stats.totalAtt > 0 && stats.totalAtt < 60) list.push({ icon: <Eye className="h-4 w-4" />, text: `Средняя посещаемость всего ${stats.totalAtt.toFixed(0)}%. Это может стоить до 35 баллов!`, type: "warning" });
    grades.forEach((g) => {
      const t = calcT(g);
      const n = nextGrade(t);
      if (n && n.need <= 5 && n.need > 0) list.push({ icon: <Zap className="h-4 w-4" />, text: `«${g.disciplineName}»: ещё ${n.need} балл(ов) до «${n.grade.label}»!`, type: "info" });
    });
    if (stats.att2Avg === 0 && stats.att1Avg > 0) list.push({ icon: <Activity className="h-4 w-4" />, text: "2-я аттестация ещё не выставлена — основные баллы впереди.", type: "info" });
    return list;
  }, [grades, stats]);

  const sortedByTotal = useMemo(() => [...grades].sort((a, b) => calcT(b) - calcT(a)), [grades]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-8"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.4),transparent_60%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.3),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-3">
                <Activity className="h-3.5 w-3.5" />
                Аналитика · {yearStart}/{yearEnd} · {semester} сем.
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Аналитика учёбы
              </h1>
              <p className="text-white/50 text-sm mt-1.5 max-w-md">
                Инсайты, прогнозы оценок и сравнение с потоком
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={`${yearStart}-${yearEnd}`}
                onChange={(e) => { const [s, en] = e.target.value.split("-").map(Number); setYearStart(s); setYearEnd(en); }}
                className="h-9 rounded-lg bg-white/10 border border-white/20 px-3 text-sm text-white outline-none appearance-none cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - 2 + i; return (<option key={y} value={`${y}-${y + 1}`} className="text-navy bg-white">{y}/{y + 1}</option>); })}
              </select>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="h-9 rounded-lg bg-white/10 border border-white/20 px-3 text-sm text-white outline-none appearance-none cursor-pointer"
              >
                <option value={1} className="text-navy bg-white">1 семестр</option>
                <option value={2} className="text-navy bg-white">2 семестр</option>
              </select>
            </div>
          </div>

          {grades.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat label="Средний балл" value={stats.avg.toFixed(1)} sub={`из ${stats.total}`} />
              <HeroStat label="Посещаемость" value={`${stats.totalAtt.toFixed(0)}%`} sub={`≈ ${attPts(stats.totalAtt)} бал.`} />
              <HeroStat label="Атт. 1 (ср.)" value={stats.att1Avg.toFixed(1)} sub="из 50" />
              <HeroStat label="Атт. 2 (ср.)" value={stats.att2Avg.toFixed(1)} sub="из 50" />
            </div>
          )}
        </div>
      </motion.div>

      {isLoading && <LoadingState rows={6} />}

      {isError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-sm">
          <AlertTriangle className="h-7 w-7 text-amber-600 mx-auto mb-3" />
          <h3 className="font-display text-xl text-navy mb-2">Не удалось загрузить</h3>
          <p className="text-sm text-muted">Перелогиньтесь через ИСУ или попробуйте позже</p>
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
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiTile icon={<Shield className="h-5 w-5" />} label="Допущен" value={stats.admitted} sub={`из ${stats.active}`} color="emerald" delay={0} />
            <KpiTile icon={<AlertTriangle className="h-5 w-5" />} label="Под угрозой" value={stats.atRisk} sub="< 21 бал." color={stats.atRisk > 0 ? "red" : "emerald"} delay={0.05} />
            <KpiTile icon={<Sparkles className="h-5 w-5" />} label="На отлично" value={stats.excellent} sub="≥ 81 бал." color="blue" delay={0.1} />
            <KpiTile icon={<BarChart3 className="h-5 w-5" />} label="Дисциплин" value={stats.total} sub={`${stats.active} с баллами`} color="violet" delay={0.15} />
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h2 className="font-display text-sm font-semibold text-navy">Персональные инсайты</h2>
              </div>
              <div className="p-4 space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                    ins.type === "danger" ? "bg-red-50/60 border-red-100 text-red-700" :
                    ins.type === "warning" ? "bg-amber-50/60 border-amber-100 text-amber-700" :
                    ins.type === "success" ? "bg-emerald-50/60 border-emerald-100 text-emerald-700" :
                    "bg-blue-50/60 border-blue-100 text-blue-700"
                  }`}>
                    <div className="mt-0.5 shrink-0">{ins.icon}</div>
                    <span className="text-sm leading-relaxed">{ins.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Donut - Grade Distribution */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl bg-white border border-border/60 shadow-sm p-5">
              <h3 className="font-display text-sm font-semibold text-navy mb-4">Распределение оценок</h3>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" dataKey="value" stroke="none" paddingAngle={3}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[THRESHOLDS.findIndex((t) => t.label === pieData[i]?.name) ] ?? PIE_COLORS[4]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[THRESHOLDS.findIndex((t) => t.label === d.name)] ?? PIE_COLORS[4] }} />
                        <span className="text-xs text-muted flex-1">{d.name}</span>
                        <span className="text-xs font-bold text-navy">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted text-center py-8">Нет данных</div>
              )}
            </motion.div>

            {/* Radar - Score Profile */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-white border border-border/60 shadow-sm p-5">
              <h3 className="font-display text-sm font-semibold text-navy mb-1">Профиль баллов</h3>
              <p className="text-[11px] text-muted mb-3">
                {specAvg.length > 0 ? "Синий — ваш балл, фиолетовый — средний по потоку" : "Баллы по дисциплинам (до 8)"}
              </p>
              {radarData.length >= 3 ? (
                <div className="h-52 sm:h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Ваш балл" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                      {specAvg.length > 0 && <Radar name="Ср. по потоку" dataKey="specAvg" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-muted text-center py-8">Нужно ≥ 3 дисциплин с баллами</div>
              )}
            </motion.div>
          </div>

          {/* Bar chart - Breakdown */}
          {barData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl bg-white border border-border/60 shadow-sm p-5">
              <h3 className="font-display text-sm font-semibold text-navy mb-1">Разбивка по дисциплинам</h3>
              <p className="text-[11px] text-muted mb-4">Атт. 1 + Атт. 2 + Посещаемость (баллы)</p>
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="att1" name="Атт. 1" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="att2" name="Атт. 2" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="attend" name="Посещ." stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Discipline table - sorted by total */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="font-display text-sm font-semibold text-navy">Все дисциплины — рейтинг</h2>
            </div>
            <div className="divide-y divide-border/30">
              {sortedByTotal.map((g, i) => {
                const t = calcT(g);
                const info = gradeOf(t);
                const pct = Math.min(100, t);
                const n = nextGrade(t);
                const isExam = g.examType === "Экзамен" || g.examType === "exam";
                const specItem = specAvg.find((s) => s.discipline_name === g.disciplineName);
                const diff = specItem ? t - specItem.average : null;

                return (
                  <div key={g.disciplineId} className={`px-5 py-3.5 flex items-center gap-4 ${i % 2 === 1 ? "bg-surface/20" : ""}`}>
                    <div className="w-7 text-center">
                      <span className="text-xs font-bold text-muted/50">{i + 1}</span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${info.bg} flex items-center justify-center shrink-0`}>
                      <span className={`font-display text-lg font-bold ${info.text}`}>
                        {t > 0 ? info.short : "—"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] text-navy truncate">{g.disciplineName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted font-medium">{isExam ? "Экз." : "Зач."}</span>
                        {g.attendance > 0 && <span className="text-[10px] text-muted">{g.attendance}% посещ.</span>}
                        {g.teacherName && <span className="text-[10px] text-muted/60 truncate max-w-[120px] hidden sm:inline">{g.teacherName}</span>}
                      </div>
                    </div>
                    <div className="hidden sm:block w-32">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: info.color }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-16">
                      <div className="text-sm font-bold text-navy tabular-nums">{t || "—"}</div>
                      {diff !== null && t > 0 && (
                        <div className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {diff >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {diff >= 0 ? "+" : ""}{diff.toFixed(0)}
                        </div>
                      )}
                      {n && t > 0 && !diff && (
                        <div className="text-[10px] text-muted">+{n.need} до {n.grade.short}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ─── Subcomponents ─── */

function HeroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 sm:px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">{label}</div>
      <div className="font-display text-xl sm:text-2xl leading-none mt-1">{value}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function KpiTile({ icon, label, value, sub, color, delay }: {
  icon: React.ReactNode; label: string; value: number; sub: string; color: string; delay: number;
}) {
  const colors: Record<string, { bg: string; iconBg: string; iconText: string }> = {
    emerald: { bg: "from-emerald-500/10 to-green-500/10", iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
    red: { bg: "from-red-500/10 to-rose-500/10", iconBg: "bg-red-100", iconText: "text-red-600" },
    blue: { bg: "from-sky-500/10 to-blue-500/10", iconBg: "bg-sky-100", iconText: "text-sky-600" },
    violet: { bg: "from-violet-500/10 to-purple-500/10", iconBg: "bg-violet-100", iconText: "text-violet-600" },
  };
  const c = colors[color] ?? colors.violet;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`rounded-2xl bg-gradient-to-br ${c.bg} border border-border/40 p-4 sm:p-5`}>
      <div className={`w-9 h-9 rounded-xl ${c.iconBg} ${c.iconText} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted/80 font-semibold">{label}</div>
      <div className="font-display text-2xl sm:text-3xl text-navy font-bold mt-0.5">{value}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </motion.div>
  );
}
