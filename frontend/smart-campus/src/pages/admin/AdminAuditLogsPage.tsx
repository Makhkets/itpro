import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Filter,
  Search,
  Shield,
  ShieldAlert,
  User as UserIcon,
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
};

function actionTone(action?: string) {
  if (!action) return "default" as const;
  if (action.includes("reject") || action.includes("delete")) return "danger";
  if (action.includes("approve") || action.includes("create")) return "success";
  if (action.includes("update") || action.includes("edit")) return "warning";
  if (action.includes("login") || action.includes("logout")) return "muted";
  return ACTION_TONE[action] ?? "default";
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

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
    return items.filter(
      (r) =>
        (!a || (r.action ?? "").toLowerCase().includes(a)) &&
        (!e || (r.entityType ?? "").toLowerCase().includes(e)),
    );
  }, [items, action, entityType]);

  const stats = useMemo(() => {
    const total = items.length;
    const uniqueUsers = new Set(items.map((r) => r.userId).filter(Boolean)).size;
    const last24 = items.filter((r) => {
      if (!r.createdAt) return false;
      const t = +new Date(r.createdAt);
      return Number.isFinite(t) && Date.now() - t < 24 * 60 * 60 * 1000;
    }).length;
    const sensitive = items.filter((r) =>
      /delete|reject|cancel/i.test(r.action ?? ""),
    ).length;
    return { total, uniqueUsers, last24, sensitive };
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
        subtitle="Все важные действия в системе — кто, что и когда."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => {
              setAction("");
              setEntityType("");
            }}
          >
            Сбросить фильтры
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          tone="navy"
          label="Записей"
          value={stats.total}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          tone="burgundy"
          label="За 24 часа"
          value={stats.last24}
        />
        <StatCard
          label="Пользователей"
          value={stats.uniqueUsers}
          icon={<UserIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Чувствительных"
          value={stats.sensitive}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </div>

      <Card className="p-4 grid sm:grid-cols-2 gap-3">
        <Input
          placeholder="Фильтр по действию (approve_booking)"
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
              key: "ip",
              header: "IP",
              cell: (r) => (
                <span className="text-xs text-muted">{r.ipAddress ?? "—"}</span>
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
