import { useQuery } from "@tanstack/react-query";
import { GitBranch, ArrowRight, Clock, Users } from "lucide-react";
import { edmsApi } from "@/shared/api/edms";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { LoadingState, EmptyState } from "@/shared/ui/states";

export default function EDMSRoutesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["edms", "routes"],
    queryFn: () => edmsApi.routes(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ЭДО · Конфигурация"
        title={
          <span className="inline-flex items-center gap-3">
            <GitBranch className="h-7 w-7 text-burgundy" />
            Маршруты согласования
          </span>
        }
        subtitle="Преднастроенные сценарии: кто согласует, в каком порядке и в какие SLA."
      />

      {isLoading && <LoadingState rows={3} />}
      {!isLoading && !data?.length && <EmptyState title="Маршруты не настроены" />}

      <div className="grid lg:grid-cols-2 gap-4">
        {data?.map((r) => (
          <Card key={r.id} className="p-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-display text-lg text-navy">{r.title}</h3>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Users className="h-3.5 w-3.5" />
                  {r.usageCount}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  ~{r.avgHours} ч
                </span>
              </div>
            </div>
            <p className="text-sm text-muted">{r.description}</p>

            <div className="mt-5 flex items-stretch gap-2 overflow-x-auto pb-2">
              {r.steps.map((s, i) => (
                <div key={s.order} className="flex items-stretch gap-2">
                  <div className="rounded-xl border border-border bg-surface-subtle px-4 py-3 min-w-[180px]">
                    <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                      Шаг {s.order}
                    </div>
                    <div className="font-medium text-navy text-sm mt-1">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-muted mt-1.5 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      SLA {s.slaHours} ч
                    </div>
                  </div>
                  {i < r.steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted self-center shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
