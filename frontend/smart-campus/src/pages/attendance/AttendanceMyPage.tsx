import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { attendanceApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { StatCard } from "@/shared/ui/stat-card";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  present: { dot: "bg-success", label: "Был" },
  late: { dot: "bg-warning", label: "Опоздал" },
  excused: { dot: "bg-info", label: "Уваж." },
  absent: { dot: "bg-accent-red", label: "Прогул" },
};

const ADMISSION_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "muted" }> = {
  admitted: { label: "Допущен", tone: "success" },
  attendance_risk: { label: "Риск по посещаемости", tone: "warning" },
  points_risk: { label: "Риск по баллам", tone: "warning" },
  not_admitted: { label: "Не допущен", tone: "danger" },
  no_data: { label: "Нет данных", tone: "muted" },
};

export default function AttendanceMyPage() {
  const analytics = useQuery({
    queryKey: ["attendance", "my", "analytics"],
    queryFn: () => attendanceApi.myAnalytics(),
  });
  const records = useQuery({
    queryKey: ["attendance", "my"],
    queryFn: () => attendanceApi.my(),
  });

  if (analytics.isLoading) return <LoadingState rows={5} />;
  const a = analytics.data;
  if (!a)
    return (
      <EmptyState
        title="Нет данных о посещаемости"
        description="Когда преподаватель отметит ваше присутствие, здесь появится аналитика."
        icon={<ClipboardCheck className="h-6 w-6" />}
      />
    );

  const admission = ADMISSION_LABELS[a.admissionStatus] ?? ADMISSION_LABELS.no_data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Посещаемость"
        title="Моя статистика"
        subtitle="Баллы за семестр и риск недопуска. Данные обновляются после каждого занятия."
      />

      {/* Top KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          tone="burgundy"
          label="Посещаемость"
          value={`${Math.round(a.attendancePercent)}%`}
          delta={`Цель ${Math.round(a.policy.requiredPercent)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          tone="navy"
          label="Баллы семестра"
          value={a.currentPoints}
          delta={`Допуск от ${a.policy.admissionMinPoints}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Штрафные баллы"
          value={a.penaltyPoints}
          delta={`Поощрений: +${a.rewardPoints}`}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="До риска"
          value={a.remainingAbsencesBeforeRisk}
          delta="пропусков до риска"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Admission status */}
      <Card className="p-6 md:p-8 relative overflow-hidden">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-2">
              Статус допуска
            </div>
            <h2 className="font-display text-4xl text-navy">
              {admission.label}
            </h2>
            {a.recommendation && (
              <p className="text-sm text-navy-75 mt-3 max-w-xl">{a.recommendation}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={admission.tone}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {admission.label}
              </Badge>
              {a.policy.admissionRule && (
                <Badge variant="muted">{a.policy.admissionRule}</Badge>
              )}
            </div>
          </div>
          <div>
            <PointsBar
              current={a.currentPoints}
              max={a.policy.maxSemesterPoints}
              required={a.policy.admissionMinPoints}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-navy">История отметок</h3>
        </div>
        <div className="divide-y divide-border">
          {records.isLoading && (
            <div className="p-6">
              <LoadingState rows={3} />
            </div>
          )}
          {records.data?.length === 0 && (
            <div className="p-8 text-sm text-muted text-center">
              Отметок пока нет.
            </div>
          )}
          {records.data?.map((r) => {
            const s = STATUS_STYLES[r.status];
            return (
              <div
                key={r.id}
                className="px-6 py-3 flex items-center gap-4"
              >
                <span className={cn("h-2 w-2 rounded-full", s?.dot)} />
                <div className="text-sm text-navy flex-1">
                  {s?.label ?? r.status}
                </div>
                <div className="text-xs text-muted">{fmtDate(r.markedAt, "d MMM, HH:mm")}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function PointsBar({
  current,
  max,
  required,
}: {
  current: number;
  max: number;
  required: number;
}) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));
  const reqPct = Math.min(100, (required / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-muted mb-2">
        <span>
          <span className="font-display text-3xl text-navy">{current}</span>
          <span className="text-muted text-base"> / {max} баллов</span>
        </span>
        <span>порог · {required}</span>
      </div>
      <div className="relative h-3 rounded-full bg-navy/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-burgundy to-burgundy-dark rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-navy"
          style={{ left: `${reqPct}%` }}
        />
      </div>
    </div>
  );
}
