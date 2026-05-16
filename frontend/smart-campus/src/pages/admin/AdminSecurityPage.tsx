import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldOff,
  Wifi,
  WifiOff,
  Eye,
  Activity,
  MapPin,
  Server,
} from "lucide-react";
import { securityApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs } from "@/shared/ui/tabs";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/stat-card";
import { fmtDate, fmtRelative } from "@/shared/lib/date";
import type { SecurityAlert, SecurityDashboard } from "@/shared/api/types";

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "info" | "muted" | "burgundy"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
  none: "muted",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Критический",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
  none: "Нет",
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  brute_force: "Brute Force",
  impossible_travel: "Невозможное перемещение",
  suspicious_ua: "Подозрительный User-Agent",
  multi_ip: "Множественные IP",
  vpn: "VPN / Датацентр",
  proxy: "Прокси",
  tor: "Tor",
  off_hours: "Вне рабочих часов",
  new_country: "Новая страна",
};

function ThreatLevelDot({ level }: { level: string }) {
  const colors: Record<string, string> = {
    critical: "bg-accent-red animate-pulse",
    high: "bg-accent-red",
    medium: "bg-warning",
    low: "bg-info",
    none: "bg-navy/20",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[level] ?? colors.none}`}
      title={SEVERITY_LABEL[level] ?? level}
    />
  );
}

export default function AdminSecurityPage() {
  const [tab, setTab] = useState("overview");
  const queryClient = useQueryClient();

  const dashboardQ = useQuery({
    queryKey: ["security-dashboard"],
    queryFn: () => securityApi.dashboard(),
    refetchInterval: 30_000,
  });

  const alertsQ = useQuery({
    queryKey: ["security-alerts"],
    queryFn: () => securityApi.alerts({ pageSize: 50 }),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => securityApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["security-dashboard"] });
    },
  });

  const dash: SecurityDashboard | undefined = dashboardQ.data as SecurityDashboard | undefined;

  const alerts = useMemo<SecurityAlert[]>(() => {
    const raw = alertsQ.data;
    return Array.isArray(raw) ? raw : [];
  }, [alertsQ.data]);

  const unresolvedAlerts = useMemo(() => alerts.filter((a) => !a.isResolved), [alerts]);
  const resolvedAlerts = useMemo(() => alerts.filter((a) => a.isResolved), [alerts]);

  if (dashboardQ.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Кибербезопасность"
          title="Центр безопасности"
          subtitle="Мониторинг угроз, аномалий и подозрительной активности."
        />
        <ErrorState
          message="Не удалось загрузить данные безопасности."
          onRetry={() => dashboardQ.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Кибербезопасность"
        title="Центр безопасности"
        subtitle="Мониторинг угроз, геолокация, VPN/прокси детекция, анализ аномалий."
        actions={
          <div className="flex items-center gap-2">
            {dash && dash.unresolvedAlerts > 0 && (
              <Badge variant="danger">
                <ShieldAlert className="h-3.5 w-3.5" />
                {dash.unresolvedAlerts} активных
              </Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                dashboardQ.refetch();
                alertsQ.refetch();
              }}
            >
              Обновить
            </Button>
          </div>
        }
      />

      {dashboardQ.isLoading ? (
        <LoadingState rows={4} />
      ) : dash ? (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              tone="navy"
              label="Событий за 24ч"
              value={dash.eventsLast24h}
              icon={<Activity className="h-5 w-5" />}
              delta={`Всего: ${dash.totalEvents}`}
            />
            <StatCard
              tone={dash.unresolvedAlerts > 0 ? "burgundy" : "default"}
              label="Активных алертов"
              value={dash.unresolvedAlerts}
              icon={<ShieldAlert className="h-5 w-5" />}
            />
            <StatCard
              label="Уникальных IP"
              value={dash.uniqueIPs24h}
              icon={<Globe className="h-5 w-5" />}
              delta={`${dash.uniqueUsers24h} пользователей`}
            />
            <StatCard
              label="Failed Logins"
              value={dash.failedLogins24h}
              icon={<ShieldOff className="h-5 w-5" />}
            />
          </div>

          {/* Threat Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FFF4E0] text-warning flex items-center justify-center">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display text-navy">{dash.vpnAccesses24h}</p>
                <p className="text-xs text-muted">VPN</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-red-light text-accent-red flex items-center justify-center">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display text-navy">{dash.proxyAccesses24h}</p>
                <p className="text-xs text-muted">Прокси</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-red-light text-accent-red flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display text-navy">{dash.torAccesses24h}</p>
                <p className="text-xs text-muted">Tor</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-burgundy-light text-burgundy flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display text-navy">
                  {(dash.threatsByLevel?.high ?? 0) + (dash.threatsByLevel?.critical ?? 0)}
                </p>
                <p className="text-xs text-muted">Высокий+</p>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs
            items={[
              { key: "overview", label: "Обзор" },
              { key: "alerts", label: "Алерты", count: unresolvedAlerts.length },
              { key: "geo", label: "Геолокация" },
              { key: "resolved", label: "Решённые", count: resolvedAlerts.length },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "overview" && <OverviewTab dash={dash} />}
          {tab === "alerts" && (
            <AlertsTab
              alerts={unresolvedAlerts}
              onResolve={(id) => resolveMut.mutate(id)}
              loading={resolveMut.isPending}
            />
          )}
          {tab === "geo" && <GeoTab dash={dash} />}
          {tab === "resolved" && (
            <AlertsTab alerts={resolvedAlerts} resolved />
          )}
        </>
      ) : null}
    </div>
  );
}

function OverviewTab({ dash }: { dash: SecurityDashboard }) {
  const threatLevels = ["critical", "high", "medium", "low", "none"];
  const totalThreats = Object.values(dash.threatsByLevel || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Threat Level Distribution */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy mb-4">Распределение угроз (24ч)</h3>
        <div className="space-y-3">
          {threatLevels.map((level) => {
            const count = dash.threatsByLevel?.[level] ?? 0;
            const pct = totalThreats > 0 ? (count / totalThreats) * 100 : 0;
            return (
              <div key={level} className="flex items-center gap-3">
                <ThreatLevelDot level={level} />
                <span className="text-xs text-navy-75 w-24">{SEVERITY_LABEL[level]}</span>
                <div className="flex-1 h-2 bg-navy/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      level === "critical" || level === "high"
                        ? "bg-accent-red"
                        : level === "medium"
                          ? "bg-warning"
                          : level === "low"
                            ? "bg-info"
                            : "bg-navy/20"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-navy w-10 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Alerts */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy mb-4">Последние алерты</h3>
        {dash.recentAlerts.length === 0 ? (
          <p className="text-sm text-muted">Нет алертов за последнее время.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {dash.recentAlerts.slice(0, 8).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-navy/[0.02] border border-border"
              >
                <ThreatLevelDot level={alert.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-navy">{alert.title}</span>
                    <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "muted"}>
                      {SEVERITY_LABEL[alert.severity] ?? alert.severity}
                    </Badge>
                    {alert.isResolved && (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" />
                        Решён
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-1 line-clamp-2">
                    {alert.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-navy-75">
                    {alert.ipAddress && <span>{alert.ipAddress}</span>}
                    {alert.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {alert.country}
                        {alert.city ? `, ${alert.city}` : ""}
                      </span>
                    )}
                    <span>{fmtRelative(alert.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AlertsTab({
  alerts,
  onResolve,
  loading,
  resolved,
}: {
  alerts: SecurityAlert[];
  onResolve?: (id: string) => void;
  loading?: boolean;
  resolved?: boolean;
}) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title={resolved ? "Нет решённых алертов" : "Нет активных угроз"}
        description={resolved ? "Решённые алерты появятся здесь." : "Система не обнаружила активных угроз. Всё в порядке."}
        icon={<Shield className="h-6 w-6" />}
      />
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card key={alert.id} className="p-4">
          <div className="flex items-start gap-4">
            <div className="mt-0.5">
              <ThreatLevelDot level={alert.severity} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm text-navy">{alert.title}</span>
                <Badge variant={SEVERITY_VARIANT[alert.severity] ?? "muted"}>
                  {SEVERITY_LABEL[alert.severity] ?? alert.severity}
                </Badge>
                <Badge variant="default">
                  {ALERT_TYPE_LABEL[alert.alertType] ?? alert.alertType}
                </Badge>
                {alert.isResolved && (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" /> Решён
                  </Badge>
                )}
              </div>

              <p className="text-xs text-navy-75 mb-2">{alert.description}</p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted">
                {alert.ipAddress && (
                  <span className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> {alert.ipAddress}
                  </span>
                )}
                {alert.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {alert.country}
                    {alert.city ? `, ${alert.city}` : ""}
                  </span>
                )}
                {alert.userId && (
                  <span className="font-mono">User: ...{alert.userId.slice(-8)}</span>
                )}
                <span>{fmtDate(alert.createdAt, "d MMM HH:mm")}</span>
                <span>({fmtRelative(alert.createdAt)})</span>
              </div>
            </div>

            {!alert.isResolved && onResolve && (
              <Button
                variant="secondary"
                size="sm"
                disabled={loading}
                onClick={() => onResolve(alert.id)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Решить
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function GeoTab({ dash }: { dash: SecurityDashboard }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-burgundy" />
          Топ стран (24ч)
        </h3>
        {dash.topCountries.length === 0 ? (
          <p className="text-sm text-muted">Нет данных о геолокации.</p>
        ) : (
          <div className="space-y-2">
            {dash.topCountries.map((c, i) => {
              const maxCount = dash.topCountries[0]?.count ?? 1;
              const pct = (c.count / maxCount) * 100;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-5 text-right">{i + 1}</span>
                  <span className="text-xs text-navy font-medium w-32 truncate">
                    {c.name}
                  </span>
                  <div className="flex-1 h-2 bg-navy/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-burgundy/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-navy w-8 text-right">{c.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-burgundy" />
          Топ провайдеров (24ч)
        </h3>
        {dash.topISPs.length === 0 ? (
          <p className="text-sm text-muted">Нет данных о провайдерах.</p>
        ) : (
          <div className="space-y-2">
            {dash.topISPs.map((isp, i) => {
              const maxCount = dash.topISPs[0]?.count ?? 1;
              const pct = (isp.count / maxCount) * 100;
              return (
                <div key={isp.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-5 text-right">{i + 1}</span>
                  <span className="text-xs text-navy font-medium w-40 truncate" title={isp.name}>
                    {isp.name}
                  </span>
                  <div className="flex-1 h-2 bg-navy/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy/40 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-navy w-8 text-right">{isp.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Connection summary */}
      <Card className="p-5 md:col-span-2">
        <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Подозрительные подключения (24ч)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-xl bg-navy/[0.03]">
            <p className="text-2xl font-display text-navy">{dash.vpnAccesses24h}</p>
            <p className="text-xs text-muted mt-1">VPN / Датацентр</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-navy/[0.03]">
            <p className="text-2xl font-display text-navy">{dash.proxyAccesses24h}</p>
            <p className="text-xs text-muted mt-1">Прокси</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-navy/[0.03]">
            <p className="text-2xl font-display text-navy">{dash.torAccesses24h}</p>
            <p className="text-xs text-muted mt-1">Tor</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-navy/[0.03]">
            <p className="text-2xl font-display text-navy">{dash.failedLogins24h}</p>
            <p className="text-xs text-muted mt-1">Failed Logins</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
