import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { roomsApi } from "@/shared/api/modules";
import type { Room } from "@/shared/api/types";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LoadingState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";

/** Extract floor number from room number string: "ГУК 1-14" → 1, "ГУК 0-31" → 0 */
function extractFloor(number: string): number {
  const m = number.match(/(\d+)-\d+/);
  if (m) return parseInt(m[1], 10);
  const m2 = number.match(/(\d)/);
  if (m2) return parseInt(m2[1], 10);
  return 0;
}

/** Extract building code from room number: "ГУК 1-14" → "ГУК" */
function extractBuilding(number: string): string {
  const m = number.match(/^([А-Яа-яA-Za-z]+(?:\s+[А-Яа-яA-Za-z]+)?)\s+\d/);
  if (m) return m[1];
  const m2 = number.match(/^([А-Яа-яA-Za-z]+)/);
  if (m2) return m2[1];
  return "Другое";
}

interface FloorGroup {
  floor: number;
  rooms: Room[];
}

interface BuildingGroup {
  code: string;
  floors: FloorGroup[];
  totalRooms: number;
}

export default function AdminRoomsPage() {
  const qc = useQueryClient();
  const rooms = useQuery({ queryKey: ["rooms", "admin"], queryFn: () => roomsApi.list() });

  // Sync state
  const [syncGroup, setSyncGroup] = useState("");
  const syncInputRef = useRef<HTMLInputElement>(null);

  const syncIsu = useMutation({
    mutationFn: (groups: string[]) => roomsApi.syncIsu(groups),
    onSuccess: (data: any) => {
      const created = data?.roomsCreated ?? 0;
      const bldg = data?.buildingsCreated ?? 0;
      const skipped = data?.roomsSkipped ?? 0;
      if (created > 0) {
        toast.success(`Добавлено: +${created} ауд., +${bldg} корп. (${skipped} уже были)`);
      } else {
        toast.info(`Новых аудиторий не найдено (${skipped} уже в базе)`);
      }
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      setSyncGroup("");
    },
    onError: (e: unknown) => toast.error(extractError(e)),
  });

  const handleSync = () => {
    const groups = syncGroup
      .split(/[,;\s]+/)
      .map((g: string) => g.trim())
      .filter(Boolean);
    if (groups.length === 0) {
      toast.error("Введите название группы");
      syncInputRef.current?.focus();
      return;
    }
    syncIsu.mutate(groups);
  };

  // Collapsed floors
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) => {
    setCollapsed((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group rooms by building → floor
  const grouped = useMemo<BuildingGroup[]>(() => {
    const list = rooms.data ?? [];
    const map = new Map<string, Map<number, Room[]>>();

    for (const r of list) {
      const bCode = extractBuilding(r.number);
      const fl = extractFloor(r.number);
      if (!map.has(bCode)) map.set(bCode, new Map());
      const floorMap = map.get(bCode)!;
      if (!floorMap.has(fl)) floorMap.set(fl, []);
      floorMap.get(fl)!.push(r);
    }

    const result: BuildingGroup[] = [];
    for (const [code, floorMap] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const floors: FloorGroup[] = [];
      let total = 0;
      for (const [floor, rms] of [...floorMap.entries()].sort((a, b) => a[0] - b[0])) {
        rms.sort((a, b) => a.number.localeCompare(b.number, "ru"));
        floors.push({ floor, rooms: rms });
        total += rms.length;
      }
      result.push({ code, floors, totalRooms: total });
    }
    return result;
  }, [rooms.data]);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="Управление"
        title="Аудитории"
        subtitle="Каталог аудиторий и пространств кампуса."
      />

      {/* Sync card */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              ref={syncInputRef}
              type="text"
              value={syncGroup}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncGroup(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSync()}
              placeholder="Группы через запятую (ТД-24, ПИ-24, ЮР-24-2...)"
              className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm focus:border-burgundy/50 focus:outline-none focus:ring-1 focus:ring-burgundy/30"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleSync}
            loading={syncIsu.isPending}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Импорт из ИСУ
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Введите группы — система загрузит их расписание и добавит все аудитории, которых ещё нет в базе.
        </p>
      </Card>

      {/* Rooms grouped by building → floor */}
      {rooms.isLoading ? (
        <LoadingState rows={6} />
      ) : grouped.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted text-sm">Аудиторий пока нет. Импортируйте их из ИСУ выше.</p>
        </Card>
      ) : (
        grouped.map((bg: BuildingGroup) => (
          <Card key={bg.code} className="overflow-hidden">
            {/* Building header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-burgundy/5 border-b border-burgundy/10">
              <div className="h-8 w-8 rounded-lg bg-burgundy/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-burgundy" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-navy text-sm">Корпус {bg.code}</h3>
                <p className="text-xs text-muted">{bg.totalRooms} аудитори{bg.totalRooms % 10 === 1 && bg.totalRooms % 100 !== 11 ? "я" : bg.totalRooms % 10 >= 2 && bg.totalRooms % 10 <= 4 && (bg.totalRooms % 100 < 10 || bg.totalRooms % 100 >= 20) ? "и" : "й"}</p>
              </div>
            </div>

            {/* Floors */}
            {bg.floors.map((fg: FloorGroup) => {
              const sectionKey = `${bg.code}-${fg.floor}`;
              const isCollapsed = collapsed.has(sectionKey);

              return (
                <div key={sectionKey}>
                  {/* Floor header */}
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center gap-2 px-5 py-2.5 bg-gray-50/80 border-b border-border/40 hover:bg-gray-100/80 transition-colors text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted" />
                    )}
                    <span className="text-xs font-semibold text-navy/70 uppercase tracking-wide">
                      {fg.floor} этаж
                    </span>
                    <span className="text-xs text-muted">({fg.rooms.length})</span>
                  </button>

                  {/* Room rows */}
                  {!isCollapsed && (
                    <div className="divide-y divide-border/30">
                      {fg.rooms.map((r: Room) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm text-navy">{r.number}</span>
                            {r.name && r.name !== r.number && (
                              <span className="ml-2 text-xs text-muted">{r.name}</span>
                            )}
                          </div>
                          {r.capacity > 0 && (
                            <span className="text-xs text-muted tabular-nums shrink-0">{r.capacity} мест</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        ))
      )}
    </div>
  );
}
