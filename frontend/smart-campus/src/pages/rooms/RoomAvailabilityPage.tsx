import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, Clock } from "lucide-react";
import { roomsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtTime } from "@/shared/lib/date";

export default function RoomAvailabilityPage() {
  const { id = "" } = useParams();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading } = useQuery({
    queryKey: ["room", id, "avail", date],
    queryFn: () => roomsApi.availability(id, date),
    enabled: !!id,
  });
  const room = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomsApi.byId(id),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <Link
        to={`/rooms/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> Назад к аудитории
      </Link>

      <PageHeader
        eyebrow="Доступность"
        title={room.data ? `Аудитория ${room.data.number}` : "Свободные слоты"}
        subtitle={`Часы работы: ${data?.workingFrom ?? "—"} – ${data?.workingTo ?? "—"}`}
        actions={
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[180px]"
          />
        }
      />

      {isLoading && <LoadingState rows={4} />}

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <h3 className="font-semibold text-navy">Свободные слоты</h3>
            {data && (
              <Badge variant="success" className="ml-auto">
                {data.freeSlots.length}
              </Badge>
            )}
          </div>
          <div className="divide-y divide-border">
            {data?.freeSlots.length === 0 && (
              <EmptyState
                title="Свободных слотов нет"
                icon={<Clock className="h-5 w-5" />}
              />
            )}
            {data?.freeSlots.map((s, i) => (
              <div
                key={i}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-navy text-sm">
                    {fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}
                  </div>
                  <div className="text-[11px] text-muted">
                    {Math.round(
                      (+new Date(s.endsAt) - +new Date(s.startsAt)) / 60_000,
                    )}{" "}
                    мин свободно
                  </div>
                </div>
                <Link to={`/bookings/create?roomId=${id}&startsAt=${s.startsAt}&endsAt=${s.endsAt}`}>
                  <Button size="sm">Забронировать</Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-red" />
            <h3 className="font-semibold text-navy">Занятые слоты</h3>
            {data && (
              <Badge variant="danger" className="ml-auto">
                {data.busySlots.length}
              </Badge>
            )}
          </div>
          <div className="divide-y divide-border">
            {data?.busySlots.length === 0 && (
              <div className="p-8 text-sm text-muted text-center">
                Аудитория свободна весь день.
              </div>
            )}
            {data?.busySlots.map((s, i) => (
              <div key={i} className="px-6 py-3">
                <div className="font-medium text-navy text-sm">
                  {fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {s.title ?? "Занятие"}
                  {s.source ? ` · ${s.source}` : ""}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
