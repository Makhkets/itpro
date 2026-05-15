import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { bookingsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/badge";
import { Dialog } from "@/shared/ui/dialog";
import { Textarea, Label } from "@/shared/ui/input";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import { extractError } from "@/shared/api/client";
import type { Booking, BookingStatus } from "@/shared/api/types";

export default function AdminBookingsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<BookingStatus | "all">("pending");
  const [decision, setDecision] = useState<{ id: string; type: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "bookings", status],
    queryFn: () => bookingsApi.list(status === "all" ? {} : { status }),
  });

  const decide = useMutation({
    mutationFn: () => {
      if (!decision) throw new Error("no decision");
      return decision.type === "approve"
        ? bookingsApi.approve(decision.id, comment || undefined)
        : bookingsApi.reject(decision.id, comment || undefined);
    },
    onSuccess: () => {
      toast.success("Решение применено");
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      setDecision(null);
      setComment("");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Управление"
        title="Бронирования"
        subtitle="Запросы на использование аудиторий и их статусы."
        actions={
          <Tabs
            items={[
              { key: "pending", label: "Ожидают" },
              { key: "approved", label: "Одобрены" },
              { key: "rejected", label: "Отклонены" },
              { key: "all", label: "Все" },
            ]}
            value={status}
            onChange={(k) => setStatus(k as BookingStatus | "all")}
          />
        }
      />

      {isLoading && <LoadingState rows={4} />}
      {!isLoading && !data?.length && <EmptyState title="Заявок нет" />}

      <div className="grid gap-3">
        {data?.map((b: Booking) => (
          <Card key={b.id} className="p-5 flex flex-wrap items-start gap-4 justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={b.status} />
              </div>
              <h3 className="font-display text-lg text-navy">{b.title}</h3>
              <p className="text-sm text-muted">
                Аудитория {b.room?.number ?? "—"} · {fmtDate(b.startsAt, "d MMM")},{" "}
                {fmtTime(b.startsAt)}–{fmtTime(b.endsAt)}
              </p>
              {b.purpose && (
                <p className="text-sm text-navy-75 mt-2">{b.purpose}</p>
              )}
            </div>
            {b.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Check className="h-4 w-4" />}
                  onClick={() => setDecision({ id: b.id, type: "approve" })}
                >
                  Одобрить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={() => setDecision({ id: b.id, type: "reject" })}
                >
                  Отклонить
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.type === "approve" ? "Одобрить заявку" : "Отклонить заявку"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecision(null)}>
              Отмена
            </Button>
            <Button
              variant={decision?.type === "approve" ? "primary" : "destructive"}
              loading={decide.isPending}
              onClick={() => decide.mutate()}
            >
              Подтвердить
            </Button>
          </>
        }
      >
        <Label>Комментарий</Label>
        <Textarea
          placeholder="Опишите причину…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Dialog>
    </div>
  );
}
