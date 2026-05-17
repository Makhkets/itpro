import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Download, FileJson, Map as MapIcon, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { scheduleApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtDate, fmtRelative, fmtTime } from "@/shared/lib/date";
import {
  academicWeekCycle,
  academicWeekOf,
  weekdayKeyOf,
  weekdayLabel,
  type WeekdayKey,
} from "@/shared/lib/academic-week";
import type { Schedule } from "@/shared/api/types";
import { readScheduleCache, saveScheduleCache } from "@/shared/lib/schedule-cache";
import { downloadScheduleIcs, downloadScheduleJson } from "@/shared/lib/schedule-export";
import { cn } from "@/shared/lib/cn";

type WeekTag = "both" | "1" | "2";

interface MergedLesson {
  key: string;
  representative: Schedule;
  weekTag: WeekTag;
}

interface WeekdaySection {
  weekday: WeekdayKey;
  title: string;
  lessons: MergedLesson[];
}

function timeKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function lessonSignature(s: Schedule): string {
  const start = new Date(s.startsAt);
  const end = new Date(s.endsAt);
  return [
    timeKey(start),
    timeKey(end),
    (s.title ?? "").trim().toLowerCase(),
    (s.teacherName ?? "").trim().toLowerCase(),
    (s.groupName ?? "").trim().toLowerCase(),
    (s.roomNumber ?? "").trim().toLowerCase(),
  ].join("|");
}

function buildWeekdaySections(items: Schedule[]): WeekdaySection[] {
  const byWeekday = new Map<WeekdayKey, Map<string, MergedLesson>>();
  for (const item of items) {
    const date = new Date(item.startsAt);
    const weekday = weekdayKeyOf(date);
    const week = academicWeekOf(date);
    const sig = lessonSignature(item);
    let bucket = byWeekday.get(weekday);
    if (!bucket) {
      bucket = new Map();
      byWeekday.set(weekday, bucket);
    }
    const existing = bucket.get(sig);
    if (!existing) {
      bucket.set(sig, { key: sig, representative: item, weekTag: week });
      continue;
    }
    if (existing.weekTag !== week) {
      existing.weekTag = "both";
      if (week === "1") existing.representative = item;
    }
  }

  const order: WeekdayKey[] = ["1", "2", "3", "4", "5", "6", "7"];
  return order
    .map<WeekdaySection | null>((weekday) => {
      const bucket = byWeekday.get(weekday);
      if (!bucket) return null;
      const lessons = [...bucket.values()].sort(
        (a, b) =>
          +new Date(a.representative.startsAt) - +new Date(b.representative.startsAt),
      );
      if (!lessons.length) return null;
      return { weekday, title: weekdayLabel(weekday), lessons };
    })
    .filter((s): s is WeekdaySection => s !== null);
}

function WeekTagBadge({ tag }: { tag: WeekTag }) {
  if (tag === "both") return <Badge variant="burgundy">каждую неделю</Badge>;
  if (tag === "1") return <Badge variant="info">1-я неделя</Badge>;
  return <Badge variant="warning">2-я неделя</Badge>;
}

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const cycle = useMemo(() => academicWeekCycle(), []);
  const scheduleParams = useMemo(
    () => ({ from: cycle.from.toISOString(), to: cycle.to.toISOString() }),
    [cycle.from, cycle.to],
  );

  const cacheKey = useMemo(
    () => (user?.id ? { scheduleType: "classes" as const, searchMode: "teacher" as const, query: user.id } : null),
    [user?.id],
  );

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["schedule", "teacher", user?.id, scheduleParams],
    queryFn: () => scheduleApi.byTeacher(user!.id, scheduleParams),
    enabled: !!user?.id && isOnline,
    retry: isOnline ? 2 : false,
  });

  useEffect(() => {
    if (data && cacheKey) saveScheduleCache(cacheKey, data);
  }, [data, cacheKey]);

  const fallback = useMemo(() => (data ? null : cacheKey ? readScheduleCache(cacheKey) : null), [data, cacheKey]);
  const effective = data ?? fallback?.items ?? [];
  const isFromCache = !data && !!fallback;
  const cachedAt = fallback?.savedAt;

  const weekdaySections = useMemo(() => buildWeekdaySections(effective), [effective]);

  const downloadName = `teacher_${user?.fullName ?? user?.id ?? "schedule"}`;
  const handleDownloadIcs = () => {
    if (!effective.length) {
      toast.error("Нет данных для скачивания");
      return;
    }
    downloadScheduleIcs(effective, downloadName);
    toast.success("Файл .ics сохранён");
  };
  const handleDownloadJson = () => {
    if (!effective.length) {
      toast.error("Нет данных для скачивания");
      return;
    }
    downloadScheduleJson(effective, downloadName);
    toast.success("JSON сохранён");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Преподаватель"
        title="Моё расписание"
        subtitle="Занятия разделены на первую и вторую учебную неделю. Создайте сессию посещаемости в один клик."
      />

      {(isFromCache || !isOnline) && weekdaySections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-warning/30 bg-[#FFF7E6]"
        >
          <div className="h-8 w-8 rounded-lg bg-warning/20 text-warning flex items-center justify-center shrink-0">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-navy">
              {isOnline ? "Показано из кэша" : "Оффлайн-режим"}
            </div>
            <div className="text-xs text-muted">
              {cachedAt ? `Последнее обновление ${fmtRelative(cachedAt)}` : "Данные с прошлого визита"}
            </div>
          </div>
          {isOnline && (
            <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              Обновить
            </Button>
          )}
        </motion.div>
      )}

      {effective.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleDownloadIcs}
          >
            Скачать .ics
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FileJson className="h-4 w-4" />}
            onClick={handleDownloadJson}
          >
            JSON
          </Button>
        </div>
      )}

      {isLoading && <LoadingState rows={5} />}
      {!isLoading && !weekdaySections.length && (
        <EmptyState title="Расписание пусто" icon={<Calendar className="h-6 w-6" />} />
      )}

      {weekdaySections.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-burgundy" /> каждую неделю
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-info" /> только 1-я неделя
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" /> только 2-я неделя
          </span>
        </div>
      )}

      <div className="space-y-6">
        {weekdaySections.map((section) => (
          <section key={section.weekday} className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl text-navy">{section.title}</h2>
              <span className="h-px flex-1 bg-border" />
              <Badge variant="muted">{section.lessons.length} занятий</Badge>
            </div>
            <div className="grid gap-3">
              {section.lessons.map(({ key, representative: s, weekTag }) => (
                <Card
                  key={key}
                  className={cn(
                    "p-5 grid grid-cols-[80px_1fr_auto] gap-5 items-center",
                    weekTag === "1" && "border-l-4 border-l-info",
                    weekTag === "2" && "border-l-4 border-l-warning",
                    weekTag === "both" && "border-l-4 border-l-burgundy",
                  )}
                >
                  <div className="text-center">
                    <div className="text-xs text-muted">{fmtDate(s.startsAt, "d MMM")}</div>
                    <div className="font-display text-xl text-navy">{fmtTime(s.startsAt)}</div>
                    <div className="text-[11px] text-muted">до {fmtTime(s.endsAt)}</div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-navy">{s.title}</p>
                      <WeekTagBadge tag={weekTag} />
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {s.groupName} {s.roomNumber ? `· ауд. ${s.roomNumber}` : ""}
                    </p>
                    <div className="mt-2">
                      {s.source === "isu" && <Badge variant="info">ИСУ</Badge>}
                    </div>
                  </div>
                  {s.roomId && (
                    <div className="flex gap-2">
                      <Link to={`/navigation/room/${s.roomId}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<MapIcon className="h-4 w-4" />}
                        >
                          Маршрут
                        </Button>
                      </Link>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
