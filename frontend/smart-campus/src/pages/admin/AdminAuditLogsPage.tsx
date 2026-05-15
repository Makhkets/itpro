import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Filter,
  Globe,
  MapPin,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldOff,
  User as UserIcon,
  Wifi,
  WifiOff,
  Eye,
} from "lucide-react";
import { auditApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { DataTable } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/states";
import { StatCard } from "@/shared/ui/stat-card";
import { fmtDate, fmtRelative } from "@/shared/lib/date";
import type { AuditLog } from "@/shared/api/types";

const ACTION_TONE: Record<
  string,
  "success" | "danger" | "warning" | "info" | "default" | "burgundy" | "muted"
> = {
  approve_booking: "success",
  reject_booking: "danger",
  cancel_booking: "muted",
  delete: "danger",
  create: "info",
  update: "warning",
  login: "default",
  logout: "muted",
  failed_login: "danger",
};

const THREAT_VARIANT: Record<string, "danger" | "warning" | "info" | "muted"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
  none: "muted",
};

const THREAT_LABEL: Record<string, string> = {
  critical: "Крит.",
  high: "Выс.",
  medium: "Сред.",
  low: "Низк.",
  none: "—",
};

function actionTone(action?: string) {
  if (!action) return "default" as const;
  if (action.includes("reject") || action.includes("delete") || action === "failed_login") return "danger";
  if (action.includes("approve") || action.includes("create")) return "success";
  if (action.includes("update") || action.includes("edit")) return "warning";
  if (action.includes("login") || action.includes("logout")) return "muted";
  return ACTION_TONE[action] ?? "default";
}

function ThreatBadges({ log }: { log: AuditLog }) {
  const badges: { label: string; icon: ReactNode; variant: "danger" | "warning" | "info" }[] = [];
  if (log.isTor) badges.push({ label: "Tor", icon: <Eye className="h-3 w-3" />, variant: "danger" });
  if (log.isProxy) badges.push({ label: "Proxy", icon: <WifiOff className="h-3 w-3" />, variant: "danger" });
  if (log.isVpn && !log.isProxy && !log.isTor) badges.push({ label: "VPN", icon: <Wifi className="h-3 w-3" />, variant: "warning" });
  if (log.isHosting && !log.isVpn && !log.isProxy) badges.push({ label: "DC", icon: <Server className="h-3 w-3" />, variant: "info" });
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <Badge key={b.label} variant={b.variant} className="!py-0.5 !px-1.5 !text-[10px]">
          {b.icon} {b.label}
        </Badge>
      ))}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [threatFilter, setThreatFilter] = useState<string>("");

  const query = useQuery({
    queryKey: ["audit", page],
    queryFn: () => auditApi.list({ page, pageSize: 100 }),
  });

  const items = useMemo<AuditLog[]>(() => {
    const raw = query.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && "items" in raw) {
      const wrapper = raw as { items?: AuditLog[] };
      return Array.isArray(wrapper.items) ? wrapper.items : [];
    }
    return [];
  }, [query.data]);

  const filtered = useMemo(() => {
    const a = action.trim().toLowerCase();
    const e = entityType.trim().toLowerCase();
    return items.filter((r) => {
      if (a && !(r.action ?? "").toLowerCase().includes(a)) return false;
      if (e && !(r.entityType ?? "").toLowerCase().includes(e)) return false;
      if (threatFilter === "vpn" && !r.isVpn) return false;
      if (threatFilter === "proxy" && !r.isProxy) return false;
      if (threatFilter === "tor" && !r.isTor) return false;
      if (threatFilter === "threats" && r.threatLevel === "none") return false;
      return true;
    });
  }, [items, action, entityType, threatFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const uniqueUsers = new Set(items.map((r) => r.userId).filter(Boolean)).size;
    const threats = items.filter((r) => r.threatLevel && r.threatLevel !== "none").length;
    const vpnProxy = items.filter((r) => r.isVpn || r.isProxy || r.isTor).length;
    const sensitive = items.filter((r) =>
      /delete|reject|cancel|failed_login/i.test(r.action ?? ""),
    ).length;
    const countries = new Set(items.map((r) => r.country).filter(Boolean)).size;
    return { total, uniqueUsers, threats, vpnProxy, sensitive, countries };
  }, [items]);

  if (query.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Безопасность"
          title="Аудит действий"
          subtitle="Все важные действия в системе."
        />
        <ErrorState
          message="Не удалось загрузить аудит-лог. Возможно, недостаточно прав."
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Безопасность"
        title="Аудит действий"
        subtitle="Полный лог действий с геолокацией, провайдером и детекцией угроз."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => {
              setAction("");
              setEntityType("");
              setThreatFilter("");
            }}
          >
            Сбросить фильтры
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          tone="navy"
          label="Записей"
          value={stats.total}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Пользователей"
          value={stats.uniqueUsers}
          icon={<UserIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Стран"
          value={stats.countries}
          icon={<Globe className="h-5 w-5" />}
        />
        <StatCard
          tone={stats.threats > 0 ? "burgundy" : "default"}
          label="Угроз"
          value={stats.threats}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="VPN/Proxy/Tor"
          value={stats.vpnProxy}
          icon={<ShieldOff className="h-5 w-5" />}
        />
        <StatCard
          label="Чувствительных"
          value={stats.sensitive}
          icon={<Shield className="h-5 w-5" />}
        />
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            placeholder="Фильтр по действию (login, delete…)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Input
            placeholder="Тип сущности (booking, room…)"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            leftIcon={<Shield className="h-4 w-4" />}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "", label: "Все" },
            { key: "threats", label: "С угрозами" },
            { key: "vpn", label: "VPN" },
            { key: "proxy", label: "Proxy" },
            { key: "tor", label: "Tor" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setThreatFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                threatFilter === f.key
                  ? "bg-navy text-white"
                  : "bg-navy/5 text-navy-75 hover:bg-navy/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {query.isLoading ? (
        <LoadingState rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Записей не найдено"
          description={
            items.length === 0
              ? "Аудит-лог пуст или временно недоступен."
              : "Попробуйте смягчить фильтры."
          }
          icon={<Shield className="h-6 w-6" />}
        />
      ) : (
        <DataTable
          data={filtered}
          rowKey={(r) => r.id ?? `${r.action}-${r.createdAt}`}
          columns={[
            {
              key: "threat",
              header: "Угроза",
              cell: (r) => (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      r.threatLevel === "critical" || r.threatLevel === "high"
                        ? "bg-accent-red animate-pulse"
                        : r.threatLevel === "medium"
                          ? "bg-warning"
                          : r.threatLevel === "low"
                            ? "bg-info"
                            : "bg-navy/15"
                    }`}
                  />
                  {r.threatLevel && r.threatLevel !== "none" && (
                    <Badge
                      variant={THREAT_VARIANT[r.threatLevel] ?? "muted"}
                      className="!text-[10px]"
                    >
                      {THREAT_LABEL[r.threatLevel] ?? r.threatLevel}
                    </Badge>
                  )}
                </div>
              ),
            },
            {
              key: "action",
              header: "Действие",
              cell: (r) => (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={actionTone(r.action)}>
                      {r.action ?? "—"}
                    </Badge>
                  </div>
                  {r.entityType && (
                    <div className="text-[11px] text-muted">
                      {r.entityType}
                      {r.entityId ? ` · …${String(r.entityId).slice(-6)}` : ""}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "user",
              header: "Пользователь",
              cell: (r) => (
                <span className="text-xs font-mono text-navy-75">
                  {r.userId ? `…${String(r.userId).slice(-8)}` : "—"}
                </span>
              ),
            },
            {
              key: "geo",
              header: "Локация",
              cell: (r) =>
                r.country ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-xs text-navy">
                      <MapPin className="h-3 w-3 text-burgundy shrink-0" />
                      <span className="truncate max-w-[120px]">
                        {r.city && r.city !== r.country ? `${r.city}, ` : ""}
                        {r.country}
                      </span>
                    </div>
                    {r.isp && (
                      <div className="text-[10px] text-muted truncate max-w-[140px]" title={r.isp}>
                        {r.isp}
                      </div>
                    )}
                    <ThreatBadges log={r} />
                  </div>
                ) : (
                  <span className="text-xs text-muted">—</span>
                ),
            },
            {
              key: "ip",
              header: "IP",
              cell: (r) => (
                <span className="text-xs font-mono text-muted">
                  {r.ipAddress ?? "—"}
                </span>
              ),
            },
            {
              key: "when",
              header: "Когда",
              cell: (r) =>
                r.createdAt ? (
                  <div>
                    <div className="text-xs text-navy">
                      {fmtDate(r.createdAt, "d MMM, HH:mm")}
                    </div>
                    <div className="text-[10px] text-muted">
                      {fmtRelative(r.createdAt)}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted">—</span>
                ),
            },
          ]}
        />
      )}

      {items.length >= 100 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Страница {page}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
