import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Map } from "lucide-react";
import { scheduleApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtTime } from "@/shared/lib/date";

export default function ScheduleCurrentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["schedule", "current"],
    queryFn: () => scheduleApi.current(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Сейчас"
        title="Текущее занятие"
        subtitle="Что идёт прямо сейчас и что следующее."
      />

      {isLoading && <LoadingState rows={2} />}

      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold mb-2">
              Сейчас идёт
            </div>
            {data?.currentLesson ? (
              <div>
                <h3 className="font-display text-2xl text-navy mb-1">
                  {data.currentLesson.title}
                </h3>
                <p className="text-sm text-muted">
                  {data.currentLesson.teacherName} ·{" "}
                  {fmtTime(data.currentLesson.startsAt)}–
                  {fmtTime(data.currentLesson.endsAt)}
                </p>
                {data.currentLesson.roomId && (
                  <Link to={`/navigation/room/${data.currentLesson.roomId}`}>
                    <Button
                      variant="primary"
                      className="mt-4"
                      leftIcon={<Map className="h-4 w-4" />}
                    >
                      Как пройти
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState
                title="Свободно"
                description="Сейчас нет занятий."
                icon={<Clock className="h-6 w-6" />}
              />
            )}
          </Card>

          <Card className="p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-semibold mb-2">
              Следующее
            </div>
            {data?.nextLesson ? (
              <div>
                <h3 className="font-display text-2xl text-navy mb-1">
                  {data.nextLesson.title}
                </h3>
                <p className="text-sm text-muted">
                  {data.nextLesson.teacherName} ·{" "}
                  {fmtTime(data.nextLesson.startsAt)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Других занятий не запланировано.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
