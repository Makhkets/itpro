import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  DoorOpen,
  Filter,
  Map,
  Search,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { buildingsApi, roomsApi } from "@/shared/api/modules";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Input, Select } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge, RoomTypeBadge, ROOM_TYPE_LABEL } from "@/shared/ui/badge";
import { EmptyState, LoadingState } from "@/shared/ui/states";
import type { Room, RoomType } from "@/shared/api/types";

const TYPES: RoomType[] = [
  "lecture",
  "computer_lab",
  "coworking",
  "meeting",
  "office",
  "library",
  "lab",
  "other",
];

export default function RoomsPage() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [type, setType] = useState<string>("");
  const [buildingId, setBuildingId] = useState<string>("");
  const [minCapacity, setMinCapacity] = useState<string>("");

  const buildings = useQuery({
    queryKey: ["buildings"],
    queryFn: () => buildingsApi.list(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["rooms", { q, type, buildingId, minCapacity }],
    queryFn: () =>
      roomsApi.search({
        q: q || undefined,
        type: type || undefined,
        buildingId: buildingId || undefined,
        minCapacity: minCapacity ? Number(minCapacity) : undefined,
      }),
  });

  const items = useMemo(() => data ?? [], [data]);

  function applyQuery(newQ: string) {
    setQ(newQ);
    if (newQ) sp.set("q", newQ);
    else sp.delete("q");
    setSp(sp);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Кампус"
        title="Аудитории и пространства"
        subtitle="Найдите аудиторию, посмотрите свободные слоты или забронируйте время."
      />

      <Card className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_200px_140px_auto] gap-3">
          <Input
            placeholder="Поиск по номеру или названию"
            leftIcon={<Search className="h-4 w-4" />}
            value={q}
            onChange={(e) => applyQuery(e.target.value)}
          />
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Тип: любой</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {ROOM_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
          <Select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">Корпус: любой</option>
            {buildings.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.name}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Мин. мест"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
          />
          <Button variant="secondary" leftIcon={<Filter className="h-4 w-4" />}>
            {items.length} ауд.
          </Button>
        </div>
      </Card>

      {isLoading && <LoadingState rows={6} />}
      {!isLoading && !items.length && (
        <EmptyState
          title="Аудитории не найдены"
          description="Попробуйте смягчить фильтры или изменить поисковый запрос."
          icon={<DoorOpen className="h-6 w-6" />}
        />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r, i) => (
          <RoomCard key={r.id} room={r} delay={i * 0.03} />
        ))}
      </div>
    </div>
  );
}

function RoomCard({ room, delay }: { room: Room; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="group p-5 h-full flex flex-col hover:-translate-y-0.5 hover:shadow-card-hover">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">
              Аудитория · корпус {room.building?.code ?? "—"}
            </div>
            <h3 className="font-display text-2xl text-navy leading-tight mt-0.5">
              {room.number}
            </h3>
            {room.name && (
              <p className="text-sm text-muted mt-0.5 truncate">{room.name}</p>
            )}
          </div>
          <RoomTypeBadge type={room.type} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted mt-4">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            до {room.capacity}
          </span>
          {room.floor?.number !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <Map className="h-3.5 w-3.5" />
              этаж {room.floor.number}
            </span>
          )}
          {!room.isBookable && <Badge variant="muted">не бронируется</Badge>}
        </div>

        {room.equipment && room.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {room.equipment.slice(0, 4).map((e) => (
              <span
                key={e}
                className="text-[11px] px-2 py-0.5 rounded-md bg-surface-subtle text-muted border border-border"
              >
                {e}
              </span>
            ))}
            {room.equipment.length > 4 && (
              <span className="text-[11px] text-muted">
                +{room.equipment.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

        <div className="grid grid-cols-2 gap-2 mt-5">
          <Link to={`/rooms/${room.id}`}>
            <Button variant="secondary" size="sm" className="w-full">
              Подробнее
            </Button>
          </Link>
          <Link to={`/rooms/${room.id}/availability`}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              leftIcon={<CalendarClock className="h-4 w-4" />}
            >
              Слоты
            </Button>
          </Link>
        </div>
        <Link
          to={`/navigation/room/${room.id}`}
          className="mt-2 text-xs text-burgundy font-medium hover:underline inline-flex items-center gap-1"
        >
          Построить маршрут <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
    </motion.div>
  );
}
