import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Calendar, Download, FileJson, Map as MapIcon, Search, WifiOff, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { scheduleApi, brsApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Input } from "@/shared/ui/input";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/states";
import { fmtDate, fmtRelative, fmtTime } from "@/shared/lib/date";
import type { Schedule } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";
import {
  academicWeekCycle,
  academicWeekOf,
  weekdayKeyOf,
  weekdayLabel,
  type WeekdayKey,
} from "@/shared/lib/academic-week";
import {
  readLastScheduleCache,
  readScheduleCache,
  saveScheduleCache,
  type ScheduleCacheKey,
} from "@/shared/lib/schedule-cache";
import { downloadScheduleIcs, downloadScheduleJson } from "@/shared/lib/schedule-export";

type ScheduleType = "classes" | "exams";
type SearchMode = "group" | "teacher";
type DayGroup = [string, Schedule[]];

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

  const weekdayOrder: WeekdayKey[] = ["1", "2", "3", "4", "5", "6", "7"];
  return weekdayOrder
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
    .filter((section): section is WeekdaySection => section !== null);
}

const GROUP_KEYS = ["groupName", "group_name", "group", "studentGroup", "student_group"];

function pickGroupName(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of GROUP_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  for (const candidate of Object.values(record)) {
    const nested = pickGroupName(candidate);
    if (nested) return nested;
  }
  return "";
}

function groupByDay(items: Schedule[]): DayGroup[] {
  const acc: Record<string, Schedule[]> = {};
  [...items]
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .forEach((s) => {
      const k = new Date(s.startsAt).toDateString();
      (acc[k] ??= []).push(s);
    });
  return Object.entries(acc);
}

export default function SchedulePage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  // Fetch BRS profile to get groupName if not in auth store
  const { data: brsProfile } = useQuery({
    queryKey: ["brs-profile-group"],
    queryFn: () => brsApi.profile(),
    enabled: isStudent && !user?.groupName,
    retry: false,
  });

  const groupName = useMemo(() => {
    if (user?.groupName?.trim()) return user.groupName.trim();
    return pickGroupName(brsProfile);
  }, [user?.groupName, brsProfile]);

  const [scheduleType, setScheduleType] = useState<ScheduleType>("classes");
  const [searchMode, setSearchMode] = useState<SearchMode>("group");
  const [query, setQuery] = useState(user?.groupName ?? "");
  const form = useForm({ defaultValues: { query: user?.groupName ?? "" } });
  const cycle = useMemo(() => academicWeekCycle(), []);
  const scheduleParams = useMemo(
    () =>
      scheduleType === "classes"
        ? { from: cycle.from.toISOString(), to: cycle.to.toISOString() }
        : undefined,
    [cycle.from, cycle.to, scheduleType],
  );

  useEffect(() => {
    if (!groupName || searchMode !== "group") return;
    if (query.trim()) return;
    form.setValue("query", groupName);
    setQuery(groupName);
  }, [form, groupName, query, searchMode]);

  const fetchFn = useMemo(() => {
    if (scheduleType === "exams") {
      return searchMode === "group"
        ? () => scheduleApi.examByGroup(query)
        : () => scheduleApi.examByTeacher(query);
    }
    return searchMode === "group"
      ? () => scheduleApi.byGroup(query, scheduleParams)
      : () => scheduleApi.byTeacher(query, scheduleParams);
  }, [scheduleType, searchMode, query, scheduleParams]);

  const cacheKey = useMemo<ScheduleCacheKey | null>(
    () => (query.trim() ? { scheduleType, searchMode, query: query.trim() } : null),
    [scheduleType, searchMode, query],
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

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["schedule", scheduleType, searchMode, query, scheduleParams],
    queryFn: fetchFn,
    enabled: !!query && isOnline,
    retry: isOnline ? 2 : false,
  });

  useEffect(() => {
    if (data && cacheKey) saveScheduleCache(cacheKey, data);
  }, [data, cacheKey]);

  // Если автозагрузка не сработала (нет query или оффлайн) — поднимаем последний кэш
  const fallback = useMemo(() => {
    if (data) return null;
    if (cacheKey) return readScheduleCache(cacheKey);
    return readLastScheduleCache();
  }, [data, cacheKey]);

  const effective = data ?? fallback?.items ?? null;
  const isFromCache = !data && !!fallback;
  const cachedAt = fallback?.savedAt;

  // Автоматически подставить запрос из последнего кэша, если пользователь зашёл без авторизации/оффлайн
  useEffect(() => {
    if (query.trim() || groupName) return;
    const last = readLastScheduleCache();
    if (last) {
      setSearchMode(last.key.searchMode);
      setScheduleType(last.key.scheduleType);
      form.setValue("query", last.key.query);
      setQuery(last.key.query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekdaySections = useMemo(() => {
    if (!effective || scheduleType !== "classes") return [];
    return buildWeekdaySections(effective);
  }, [effective, scheduleType]);

  const grouped = useMemo<DayGroup[]>(() => groupByDay(effective ?? []), [effective]);
  const hasSchedule = scheduleType === "classes" ? weekdaySections.length > 0 : grouped.length > 0;

  const downloadName = `${query || "schedule"}_${scheduleType}`;
  const handleDownloadIcs = () => {
    if (!effective?.length) {
      toast.error("Нет данных для скачивания");
      return;
    }
    downloadScheduleIcs(effective, downloadName);
    toast.success("Файл .ics сохранён");
  };
  const handleDownloadJson = () => {
    if (!effective?.length) {
      toast.error("Нет данных для скачивания");
      return;
    }
    downloadScheduleJson(effective, downloadName);
    toast.success("JSON сохранён");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Расписание"
        title={scheduleType === "classes" ? "Занятия и пары" : "Расписание экзаменов"}
        subtitle="Данные обновляются из ИСУ ГГНТУ. Откройте маршрут, чтобы быстро найти аудиторию."
      />

      <div className="flex flex-wrap gap-2">
        <Tabs
          items={[
            { key: "classes", label: "Занятия" },
            { key: "exams", label: "Экзамены" },
          ]}
          value={scheduleType}
          onChange={(k) => setScheduleType(k as ScheduleType)}
        />
        <Tabs
          items={[
            { key: "group", label: "По группе" },
            { key: "teacher", label: "По преподавателю" },
          ]}
          value={searchMode}
          onChange={(k) => setSearchMode(k as SearchMode)}
        />
      </div>

      {isStudent && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          disabled={!groupName}
          onClick={() => {
            if (!groupName) return;
            form.setValue("query", groupName);
            setQuery(groupName);
            setSearchMode("group");
          }}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all",
            !groupName
              ? "bg-white border-border/60 opacity-70 cursor-not-allowed"
              : query === groupName
                ? "bg-burgundy/5 border-burgundy/30 shadow-sm"
                : "bg-white border-border/60 hover:border-burgundy/30 hover:shadow-sm",
          )}
        >
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            groupName && query === groupName ? "bg-burgundy text-white" : "bg-burgundy-light text-burgundy",
          )}>
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-navy">Показать моё расписание</div>
            <div className="text-xs text-muted truncate">
              {groupName ? `Группа ${groupName}` : "Группа подгружается из ИСУ…"}
            </div>
          </div>
          {groupName && query === groupName && (
            <Badge variant="burgundy">активно</Badge>
          )}
        </motion.button>
      )}

      <Card className="p-4 md:p-5">
        <form
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
          onSubmit={form.handleSubmit((v) => setQuery(v.query))}
        >
          <Input
            placeholder={
              searchMode === "group"
                ? "Группа, например ИСТ-б-о-22-1"
                : "Фамилия преподавателя"
            }
            leftIcon={<Search className="h-4 w-4" />}
            {...form.register("query")}
          />
          <Button type="submit" variant="navy">
            Показать
          </Button>
        </form>
      </Card>

      {(isFromCache || !isOnline) && hasSchedule && (
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
              {cachedAt
                ? `Последнее обновление ${fmtRelative(cachedAt)}`
                : "Данные с прошлого визита"}
            </div>
          </div>
          {isOnline && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Обновить
            </Button>
          )}
        </motion.div>
      )}

      {hasSchedule && effective && effective.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleDownloadIcs}
          >
            Скачать .ics (календарь)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FileJson className="h-4 w-4" />}
            onClick={handleDownloadJson}
          >
            JSON
          </Button>
          {!isFromCache && cachedAt && (
            <span className="text-xs text-muted ml-auto">
              сохранено офлайн · {fmtRelative(cachedAt)}
            </span>
          )}
        </div>
      )}

      {isLoading && <LoadingState rows={6} />}
      {error && !isFromCache && (
        <ErrorState
          message={isOnline ? "Не удалось загрузить расписание" : "Нет соединения"}
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !error && !hasSchedule && (
        <EmptyState
          title={query ? "Занятий на ближайший цикл нет" : searchMode === "group" ? "Введите группу" : "Введите фамилию преподавателя"}
          icon={<Calendar className="h-6 w-6" />}
          description={
            query
              ? "Возможно, нет данных для этой группы или преподавателя."
              : searchMode === "group"
                ? "Укажите номер группы, чтобы увидеть расписание."
                : "Укажите фамилию преподавателя."
          }
        />
      )}

      {scheduleType === "classes" && weekdaySections.length > 0 && (
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

      {scheduleType === "classes"
        ? weekdaySections.map((section, index) => (
            <WeekdayScheduleSection key={section.weekday} section={section} index={index} />
          ))
        : grouped.map(([day, items], index) => (
            <DayScheduleGroup
              key={day}
              day={day}
              items={items}
              index={index}
              isExam={scheduleType === "exams"}
            />
          ))}
    </div>
  );
}

function WeekdayScheduleSection({
  section,
  index,
}: {
  section: WeekdaySection;
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl text-navy">{section.title}</h2>
        <span className="h-px flex-1 bg-border" />
        <Badge variant="muted">{section.lessons.length} занятий</Badge>
      </div>
      <div className="grid gap-3">
        {section.lessons.map((lesson) => (
          <LessonCard
            key={lesson.key}
            s={lesson.representative}
            weekTag={lesson.weekTag}
          />
        ))}
      </div>
    </motion.section>
  );
}

function DayScheduleGroup({
  day,
  items,
  index,
  isExam,
}: {
  day: string;
  items: Schedule[];
  index: number;
  isExam?: boolean;
}) {
  return (
    <motion.div
      key={day}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-xl text-navy">
          {fmtDate(items[0].startsAt, "EEEE, d MMMM")}
        </span>
        <span className="h-px flex-1 bg-border" />
        <Badge variant="muted">{items.length} {isExam ? "экзаменов" : "занятий"}</Badge>
      </div>
      <div className="grid gap-3">
        {items.map((s) => (
          <LessonCard key={s.id} s={s} isExam={isExam} />
        ))}
      </div>
    </motion.div>
  );
}

function WeekTagBadge({ tag }: { tag: WeekTag }) {
  if (tag === "both") return <Badge variant="burgundy">каждую неделю</Badge>;
  if (tag === "1") return <Badge variant="info">1-я неделя</Badge>;
  return <Badge variant="warning">2-я неделя</Badge>;
}

function LessonCard({
  s,
  isExam,
  weekTag,
}: {
  s: Schedule;
  isExam?: boolean;
  weekTag?: WeekTag;
}) {
  const now = Date.now();
  const isNow = now >= +new Date(s.startsAt) && now <= +new Date(s.endsAt);
  const isPast = now > +new Date(s.endsAt);
  const accentClass =
    weekTag === "1"
      ? "border-l-4 border-l-info"
      : weekTag === "2"
        ? "border-l-4 border-l-warning"
        : weekTag === "both"
          ? "border-l-4 border-l-burgundy"
          : "";
  return (
    <Card
      className={cn(
        "p-5 grid grid-cols-[80px_auto_1fr_auto] gap-5 items-center transition-all",
        accentClass,
        isNow && "ring-2 ring-burgundy/30 border-burgundy/30",
        isPast && !weekTag && "opacity-60",
      )}
    >
      <div className="text-center">
        <div className="font-display text-2xl leading-none text-navy">
          {fmtTime(s.startsAt)}
        </div>
        <div className="text-[11px] text-muted mt-1">
          до {fmtTime(s.endsAt)}
        </div>
        {isNow && (
          <Badge variant="burgundy" className="mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-burgundy animate-pulse" />
            идёт
          </Badge>
        )}
      </div>
      <div className="h-12 w-px bg-border" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-navy truncate">{s.title}</div>
          {weekTag && <WeekTagBadge tag={weekTag} />}
        </div>
        <div className="text-sm text-muted truncate">
          {s.teacherName ?? "—"}
          {s.groupName ? ` · ${s.groupName}` : ""}
        </div>
        <div className="text-xs text-muted mt-1.5 flex flex-wrap gap-2 items-center">
          {s.roomNumber && (
            <Badge variant="default">ауд. {s.roomNumber}</Badge>
          )}
          {s.source === "isu" && <Badge variant="info">ИСУ</Badge>}
          {isExam && <Badge variant="burgundy">Экзамен</Badge>}
        </div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        {s.roomId && (
          <Link to={`/navigation/room/${s.roomId}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<MapIcon className="h-4 w-4" />}
            >
              Как пройти
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
