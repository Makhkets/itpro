import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  Map,
  Users,
} from "lucide-react";
import { roomsApi } from "@/shared/api/modules";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge, RoomTypeBadge } from "@/shared/ui/badge";
import { LoadingState, ErrorState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";

export default function RoomDetailsPage() {
  const { id = "" } = useParams();
  const room = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomsApi.byId(id),
    enabled: !!id,
  });
  const schedule = useQuery({
    queryKey: ["room", id, "schedule"],
    queryFn: () => roomsApi.schedule(id),
    enabled: !!id,
  });

  if (room.isLoading) return <LoadingState rows={5} />;
  if (room.error || !room.data)
    return (
      <ErrorState
        message="Аудитория не найдена"
        onRetry={() => room.refetch()}
      />
    );
  const r = room.data;

  return (
    <div className="space-y-6">
      <Link
        to="/rooms"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> К списку аудиторий
      </Link>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 md:p-8 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 h-60 w-60 rounded-full bg-burgundy-light blur-3xl" />
            <div className="relative">
              <div className="text-[11px] uppercase tracking-wider text-burgundy font-semibold mb-2">
                Корпус {r.building?.code ?? "—"} · этаж {r.floor?.number ?? "—"}
              </div>
              <h1 className="font-display text-5xl text-navy">{r.number}</h1>
              {r.name && (
                <p className="text-lg text-muted mt-1">{r.name}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <RoomTypeBadge type={r.type} />
                <Badge variant="default">
                  <Users className="h-3 w-3" /> до {r.capacity}
                </Badge>
                {!r.isBookable && <Badge variant="muted">не бронируется</Badge>}
              </div>
            </div>
          </Card>

          {r.description && (
            <Card className="p-6">
              <h3 className="font-semibold text-navy mb-2">Описание</h3>
              <p className="text-sm text-navy-75 whitespace-pre-wrap">
                {r.description}
              </p>
            </Card>
          )}

          {r.equipment && r.equipment.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold text-navy mb-3">Оборудование</h3>
              <div className="flex flex-wrap gap-2">
                {r.equipment.map((e) => (
                  <span
                    key={e}
                    className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-sm text-navy"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="font-semibold text-navy mb-3">Ближайшие занятия</h3>
            {schedule.isLoading ? (
              <LoadingState rows={3} />
            ) : !schedule.data?.length ? (
              <p className="text-sm text-muted">Занятий не запланировано.</p>
            ) : (
              <div className="divide-y divide-border -mx-6">
                {schedule.data.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="px-6 py-3 flex items-center gap-3"
                  >
                    <div className="text-center w-20 shrink-0">
                      <div className="text-xs text-muted">
                        {fmtDate(s.startsAt, "d MMM")}
                      </div>
                      <div className="font-medium text-navy text-sm mt-0.5">
                        {fmtTime(s.startsAt)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-navy truncate">
                        {s.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {s.teacherName} · {s.groupName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-6 relative overflow-hidden">
            {/* Map / coordinate marker */}
            <h3 className="font-semibold text-navy mb-1">Местоположение</h3>
            <p className="text-xs text-muted mb-4">
              {r.building?.name} · {r.floor?.name ?? `этаж ${r.floor?.number}`}
            </p>
            <div className="relative aspect-[4/3] rounded-2xl bg-navy/5 overflow-hidden border border-border">
              <div className="absolute inset-0 bg-pattern-grid" />
              <div className="absolute inset-0 opacity-50" />
              {r.floor?.mapImageUrl ? (
                <img
                  src={r.floor.mapImageUrl}
                  alt={r.name ?? r.number}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  {/* Decorative geometric corridor */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 200 150"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0,60 L80,60 L80,40 L140,40 L140,90 L200,90"
                      fill="none"
                      stroke="#C5C7CC"
                      strokeWidth="2"
                      strokeDasharray="3 4"
                    />
                  </svg>
                </>
              )}
              {(typeof r.xCoord === "number" || typeof r.yCoord === "number") && (
                <div
                  className="absolute h-4 w-4 -ml-2 -mt-2"
                  style={{
                    left: `${Math.min(95, Math.max(5, r.xCoord ?? 50))}%`,
                    top: `${Math.min(95, Math.max(5, r.yCoord ?? 50))}%`,
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-burgundy animate-ping opacity-70" />
                  <div className="absolute inset-0 rounded-full bg-burgundy ring-2 ring-white" />
                </div>
              )}
            </div>
            {r.navigationHint && (
              <p className="text-xs text-navy-75 mt-3">{r.navigationHint}</p>
            )}
          </Card>

          <div className="space-y-2">
            <Link to={`/navigation/room/${r.id}`} className="block">
              <Button
                className="w-full"
                size="lg"
                leftIcon={<Map className="h-4 w-4" />}
              >
                Построить маршрут
              </Button>
            </Link>
            <Link to={`/rooms/${r.id}/availability`} className="block">
              <Button
                variant="secondary"
                className="w-full"
                size="lg"
                leftIcon={<CalendarClock className="h-4 w-4" />}
              >
                Свободные слоты
              </Button>
            </Link>
            {r.isBookable && (
              <Link
                to={`/bookings/create?roomId=${r.id}`}
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Забронировать
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
