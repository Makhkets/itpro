import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, Map } from "lucide-react";
import { scheduleApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["schedule", "teacher", user?.id],
    queryFn: () => scheduleApi.byTeacher(user!.id),
    enabled: !!user?.id,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Преподаватель"
        title="Моё расписание"
        subtitle="Занятия на ближайшую неделю. Создайте сессию посещаемости в один клик."
      />

      {isLoading && <LoadingState rows={5} />}
      {!isLoading && !data?.length && (
        <EmptyState title="Расписание пусто" icon={<Calendar className="h-6 w-6" />} />
      )}

      <div className="grid gap-3">
        {data?.map((s) => (
          <Card key={s.id} className="p-5 grid grid-cols-[80px_1fr_auto] gap-5 items-center">
            <div className="text-center">
              <div className="text-xs text-muted">{fmtDate(s.startsAt, "d MMM")}</div>
              <div className="font-display text-xl text-navy">{fmtTime(s.startsAt)}</div>
              <div className="text-[11px] text-muted">до {fmtTime(s.endsAt)}</div>
            </div>
            <div>
              <p className="font-medium text-navy">{s.title}</p>
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
                    leftIcon={<Map className="h-4 w-4" />}
                  >
                    Маршрут
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
