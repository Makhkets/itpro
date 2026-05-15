import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, X } from "lucide-react";
import { bookingsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/badge";
import { EmptyState, LoadingState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import { extractError } from "@/shared/api/client";

export default function MyBookingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bookings", "my"],
    queryFn: () => bookingsApi.my(),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id),
    onSuccess: () => {
      toast.success("Бронирование отменено");
      qc.invalidateQueries({ queryKey: ["bookings", "my"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Бронирования"
        title="Мои бронирования"
        subtitle="Запросы на использование аудиторий и их статусы."
        actions={
          <Link to="/bookings/create">
            <Button leftIcon={<CalendarPlus className="h-4 w-4" />}>
              Новая бронь
            </Button>
          </Link>
        }
      />

      {isLoading && <LoadingState rows={4} />}

      {!isLoading && !data?.length && (
        <EmptyState
          title="Бронирований пока нет"
          description="Найдите свободную аудиторию и забронируйте её для встречи или мероприятия."
          action={
            <Link to="/bookings/create">
              <Button leftIcon={<CalendarPlus className="h-4 w-4" />}>
                Создать бронирование
              </Button>
            </Link>
          }
        />
      )}

      <div className="grid gap-3">
        {data?.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={b.status} />
                  <span className="text-xs text-muted">{b.bookingType}</span>
                </div>
                <h3 className="font-display text-xl text-navy">{b.title}</h3>
                <p className="text-sm text-muted mt-1">
                  Аудитория {b.room?.number ?? "—"} · {fmtDate(b.startsAt, "d MMM")},{" "}
                  {fmtTime(b.startsAt)}–{fmtTime(b.endsAt)}
                </p>
                {b.purpose && (
                  <p className="text-sm text-navy-75 mt-2">{b.purpose}</p>
                )}
                {b.adminComment && (
                  <div className="mt-3 rounded-xl bg-surface-subtle p-3 text-sm text-navy-75 border border-border">
                    <span className="text-xs font-medium text-muted">
                      Комментарий администратора:
                    </span>{" "}
                    {b.adminComment}
                  </div>
                )}
              </div>
              {b.status === "pending" || b.status === "approved" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={cancel.isPending}
                  onClick={() => cancel.mutate(b.id)}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Отменить
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
