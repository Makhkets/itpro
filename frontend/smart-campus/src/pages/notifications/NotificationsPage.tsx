import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState, LoadingState } from "@/shared/ui/states";
import { fmtRelative } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => notificationsApi.list({ pageSize: 50 }),
  });

  const readAll = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const read = useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Уведомления"
        title="Все события"
        subtitle="История событий по бронированиям, посещаемости, библиотеке и системе."
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              leftIcon={<CheckCheck className="h-4 w-4" />}
              onClick={() => readAll.mutate()}
              loading={readAll.isPending}
            >
              Отметить все как прочитанные
            </Button>
          )
        }
      />

      {isLoading && <LoadingState rows={5} />}

      {!isLoading && !data?.length && (
        <EmptyState
          title="Уведомлений пока нет"
          description="Когда что-то произойдёт, вы узнаете первыми."
          icon={<Bell className="h-6 w-6" />}
        />
      )}

      <div className="space-y-2">
        {data?.map((n) => (
          <Card
            key={n.id}
            className={cn(
              "p-5 flex items-start gap-4 cursor-pointer hover:border-navy/30 transition-colors",
              !n.isRead && "bg-burgundy-light/30 border-burgundy/20",
            )}
            onClick={() => !n.isRead && read.mutate(n.id)}
          >
            {!n.isRead && (
              <span className="mt-1.5 h-2 w-2 rounded-full bg-burgundy shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-medium text-navy">{n.title}</h3>
                <Badge variant="muted">{n.channel}</Badge>
                <Badge variant="default">{n.type}</Badge>
              </div>
              <p className="text-sm text-muted">{n.message}</p>
            </div>
            <p className="text-xs text-navy-50 whitespace-nowrap shrink-0">
              {fmtRelative(n.createdAt)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
