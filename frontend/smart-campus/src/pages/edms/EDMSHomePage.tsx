import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  FileSignature,
  Inbox as InboxIcon,
  Plus,
  Activity,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { edmsApi, type EDMSDocument } from "@/shared/api/edms";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";
import { Card } from "@/shared/ui/card";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { Button } from "@/shared/ui/button";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import { HeroPanel, EDMSStatusBadge, EDMSTypeBadge } from "./edms-ui";

export default function EDMSHomePage() {
  const navigate = useNavigate();
  const analytics = useQuery({
    queryKey: ["edms", "analytics"],
    queryFn: () => edmsApi.analytics(),
  });
  const inbox = useQuery({
    queryKey: ["edms", "documents", { inbox: true }],
    queryFn: () => edmsApi.list({ inbox: true, pageSize: 5 }),
  });
  const recent = useQuery({
    queryKey: ["edms", "documents", "recent"],
    queryFn: () => edmsApi.list({ pageSize: 6 }),
  });

  const stats = analytics.data;

  return (
    <div className="space-y-6">
      <HeroPanel
        title={
          <>
            Электронный документооборот
            <br />
            <span className="text-burgundy">без бумаги. Без задержек.</span>
          </>
        }
        subtitle="Юридически значимый ЭДО для университета: подача заявлений, маршруты согласования, УКЭП, аудит-трейл и аналитика — в едином рабочем пространстве для студентов, преподавателей, абитуриентов и администрации."
        ctaText="Создать документ"
        onCta={() => navigate("/edms/new")}
      >
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { icon: ShieldCheck, label: "Юридическая значимость", hint: "УКЭП ГОСТ Р 34.10-2012" },
            { icon: Timer, label: "SLA-маршруты", hint: "Среднее время цикла" },
            { icon: Sparkles, label: "Шаблоны", hint: "Готовые формы" },
            { icon: Activity, label: "Аналитика", hint: "Узкие места видны" },
          ].map((b) => (
            <div
              key={b.label}
              className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur px-4 py-3"
            >
              <div className="flex items-center gap-2 text-white">
                <b.icon className="h-4 w-4 text-burgundy" />
                <span className="font-medium text-sm">{b.label}</span>
              </div>
              <div className="text-[11px] text-white/65 mt-0.5">{b.hint}</div>
            </div>
          ))}
        </div>
      </HeroPanel>

      <PageHeader
        eyebrow="Сегодня"
        title="Ваш рабочий стол ЭДО"
        subtitle="Что требует вашего внимания и что движется по маршрутам."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<ClipboardList className="h-4 w-4" />}
              onClick={() => navigate("/edms/registry")}
            >
              Реестр
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate("/edms/new")}
            >
              Новый документ
            </Button>
          </div>
        }
      />

      {analytics.isLoading || !stats ? (
        <LoadingState rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              tone="burgundy"
              label="Ждут вашей реакции"
              value={stats.awaitingMyAction}
              delta="на согласовании у вас"
              icon={<InboxIcon className="h-5 w-5" />}
            />
            <StatCard
              tone="navy"
              label="В работе"
              value={stats.inProgress}
              delta="черновики и маршруты"
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <StatCard
              label="Подписано за 30 дней"
              value={stats.signedThisMonth}
              delta={`Цикл ${stats.averageCycleHours} ч`}
              icon={<FileSignature className="h-5 w-5" />}
            />
            <StatCard
              tone={stats.overdueDocuments > 0 ? "burgundy" : "default"}
              label="Просрочено"
              value={stats.overdueDocuments}
              delta={`SLA ${Math.round(stats.slaComplianceRate * 100)}%`}
              icon={<Timer className="h-5 w-5" />}
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Входящие */}
            <Card className="lg:col-span-3 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-burgundy font-semibold">
                    Inbox
                  </div>
                  <h2 className="font-display text-xl text-navy mt-1">
                    Документы для вашего решения
                  </h2>
                </div>
                <Link
                  to="/edms/inbox"
                  className="text-sm text-burgundy hover:text-burgundy-dark inline-flex items-center gap-1"
                >
                  Все входящие
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {inbox.isLoading && <LoadingState rows={3} />}
              {!inbox.isLoading && !inbox.data?.items.length && (
                <EmptyState
                  title="Пусто. И это хорошо."
                  description="Когда коллеги направят вам документ — он появится здесь."
                />
              )}

              <div className="space-y-2">
                {inbox.data?.items.map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))}
              </div>
            </Card>

            {/* Быстрые действия */}
            <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-burgundy-light/50 to-white">
              <div className="text-[11px] uppercase tracking-wider text-burgundy font-semibold">
                Быстрый старт
              </div>
              <h2 className="font-display text-xl text-navy mt-1 mb-4">
                За пару кликов
              </h2>
              <div className="space-y-2">
                {[
                  {
                    to: "/edms/new?template=tpl-reference",
                    icon: FileSignature,
                    title: "Справка об обучении",
                    hint: "Готова к подписи за ~9 часов",
                  },
                  {
                    to: "/edms/new?template=tpl-academic-leave",
                    icon: ClipboardList,
                    title: "Заявление на акад. отпуск",
                    hint: "Маршрут: куратор → институт → ректорат",
                  },
                  {
                    to: "/edms/new?template=tpl-business-trip",
                    icon: TrendingUp,
                    title: "Командировка",
                    hint: "С автоподстановкой данных",
                  },
                  {
                    to: "/edms/templates",
                    icon: Sparkles,
                    title: "Все шаблоны",
                    hint: "Библиотека форм университета",
                  },
                ].map((a) => (
                  <Link key={a.to} to={a.to}>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border hover:border-burgundy/40 hover:shadow-card transition-all group">
                      <div className="h-10 w-10 rounded-xl bg-burgundy text-white flex items-center justify-center shrink-0">
                        <a.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-navy text-sm">
                          {a.title}
                        </div>
                        <div className="text-[11px] text-muted">{a.hint}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted group-hover:text-burgundy" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Тренд + узкие места */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-lg text-navy">
                  Активность за 14 дней
                </h3>
                <div className="text-xs text-muted">создано · подписано · отклонено</div>
              </div>
              <Sparkline data={stats.trend} />
            </Card>
            <Card className="p-6">
              <h3 className="font-display text-lg text-navy mb-3">
                Узкие места маршрутов
              </h3>
              <div className="space-y-3">
                {stats.bottlenecks.map((b) => (
                  <div key={b.step} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-navy font-medium">{b.step}</span>
                      <span className="text-xs text-muted">
                        {b.pending} в очереди · {b.avgHours} ч
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-navy/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-burgundy to-burgundy-dark"
                        style={{ width: `${Math.min(100, b.avgHours * 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Последние документы */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-navy inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-burgundy" />
                Последние операции
              </h3>
              <Link
                to="/edms/registry"
                className="text-sm text-burgundy hover:text-burgundy-dark inline-flex items-center gap-1"
              >
                Открыть реестр
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {recent.data?.items.map((d) => (
                <DocRow key={d.id} doc={d} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function DocRow({ doc }: { doc: EDMSDocument }) {
  return (
    <Link
      to={`/edms/documents/${doc.id}`}
      className="block p-3.5 rounded-xl border border-border hover:border-burgundy/40 hover:shadow-card transition-all bg-white"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <EDMSStatusBadge status={doc.status} />
            <span className="text-[11px] text-muted">{doc.regNumber}</span>
          </div>
          <div className="font-medium text-navy truncate">{doc.title}</div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <EDMSTypeBadge type={doc.type} />
            <span className="text-xs text-muted">
              {doc.author.fullName} · {fmtDate(doc.updatedAt, "d MMM")}{" "}
              {fmtTime(doc.updatedAt)}
            </span>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted shrink-0 mt-1" />
      </div>
    </Link>
  );
}

function Sparkline({
  data,
}: {
  data: { date: string; created: number; signed: number; rejected: number }[];
}) {
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.created, d.signed, d.rejected)),
  );
  return (
    <div
      className="mt-4 grid gap-1.5 items-end h-40"
      style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
    >
      {data.map((d) => (
        <div key={d.date} className="flex flex-col gap-0.5 items-stretch">
          <div className="flex-1 flex flex-col-reverse gap-0.5">
            <div
              className="bg-burgundy rounded-sm"
              style={{ height: `${(d.signed / max) * 100}%` }}
              title={`${d.date}: подписано ${d.signed}`}
            />
            <div
              className="bg-navy rounded-sm"
              style={{ height: `${(d.created / max) * 100}%` }}
              title={`${d.date}: создано ${d.created}`}
            />
            <div
              className="bg-accent-red/70 rounded-sm"
              style={{ height: `${(d.rejected / max) * 100}%` }}
              title={`${d.date}: отклонено ${d.rejected}`}
            />
          </div>
          <div className="text-[9px] text-muted text-center">
            {d.date.slice(-2)}
          </div>
        </div>
      ))}
    </div>
  );
}
