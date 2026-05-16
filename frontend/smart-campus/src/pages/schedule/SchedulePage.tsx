import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Calendar, Map, Search } from "lucide-react";
import { motion } from "framer-motion";
import { scheduleApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Input } from "@/shared/ui/input";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import type { Schedule } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";

type ScheduleType = "classes" | "exams";
type SearchMode = "group" | "teacher";

export default function SchedulePage() {
  const { user } = useAuth();
  const [view, setView] = useState<"today" | "week">("today");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("classes");
  const [searchMode, setSearchMode] = useState<SearchMode>("group");
  const [query, setQuery] = useState(user?.groupName ?? "");
  const form = useForm({ defaultValues: { query: user?.groupName ?? "" } });

  const fetchFn = useMemo(() => {
    if (scheduleType === "exams") {
      return searchMode === "group"
        ? () => scheduleApi.examByGroup(query)
        : () => scheduleApi.examByTeacher(query);
    }
    return searchMode === "group"
      ? () => scheduleApi.byGroup(query)
      : () => scheduleApi.byTeacher(query);
  }, [scheduleType, searchMode, query]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["schedule", scheduleType, searchMode, query],
    queryFn: fetchFn,
    enabled: !!query,
  });

  const filtered = useMemo(() => {
    if (!data) return [] as Schedule[];
    if (view === "today") {
      const today = new Date().toDateString();
      return data.filter((s) => new Date(s.startsAt).toDateString() === today);
    }
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return data.filter((s) => {
      const t = new Date(s.startsAt).getTime();
      return t >= now - 12 * 60 * 60 * 1000 && t <= week;
    });
  }, [data, view]);

  const grouped = useMemo<[string, Schedule[]][]>(() => {
    const acc: Record<string, Schedule[]> = {};
    [...filtered]
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .forEach((s) => {
        const k = new Date(s.startsAt).toDateString();
        (acc[k] ??= []).push(s);
      });
    return Object.entries(acc);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Расписание"
        title={scheduleType === "classes" ? "Занятия и пары" : "Расписание экзаменов"}
        subtitle="Данные обновляются из ИСУ ГГНТУ. Откройте маршрут, чтобы быстро найти аудиторию."
        actions={
          <Tabs
            items={[
              { key: "today", label: "Сегодня" },
              { key: "week", label: "Неделя" },
            ]}
            value={view}
            onChange={(k) => setView(k as "today" | "week")}
          />
        }
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

      {isLoading && <LoadingState rows={6} />}
      {error && (
        <ErrorState
          message="Не удалось загрузить расписание"
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !error && grouped.length === 0 && (
        <EmptyState
          title={query ? "Занятий на выбранный период нет" : searchMode === "group" ? "Введите группу" : "Введите фамилию преподавателя"}
          icon={<Calendar className="h-6 w-6" />}
          description={
            query
              ? "Возможно, выбран не тот период или нет данных для данного запроса."
              : searchMode === "group"
                ? "Укажите номер группы, чтобы увидеть расписание."
                : "Укажите фамилию преподавателя."
          }
        />
      )}

      {grouped.map(([day, items], di) => (
        <motion.div
          key={day}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: di * 0.05 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <span className="font-display text-xl text-navy">
              {fmtDate(items[0].startsAt, "EEEE, d MMMM")}
            </span>
            <span className="h-px flex-1 bg-border" />
            <Badge variant="muted">{items.length} {scheduleType === "exams" ? "экзаменов" : "занятий"}</Badge>
          </div>
          <div className="grid gap-3">
            {items.map((s) => (
              <LessonCard key={s.id} s={s} isExam={scheduleType === "exams"} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function LessonCard({ s, isExam }: { s: Schedule; isExam?: boolean }) {
  const now = Date.now();
  const isNow = now >= +new Date(s.startsAt) && now <= +new Date(s.endsAt);
  const isPast = now > +new Date(s.endsAt);
  return (
    <Card
      className={cn(
        "p-5 grid grid-cols-[80px_auto_1fr_auto] gap-5 items-center transition-all",
        isNow && "ring-2 ring-burgundy/30 border-burgundy/30",
        isPast && "opacity-60",
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
        <div className="font-medium text-navy truncate">{s.title}</div>
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
              leftIcon={<Map className="h-4 w-4" />}
            >
              Как пройти
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
