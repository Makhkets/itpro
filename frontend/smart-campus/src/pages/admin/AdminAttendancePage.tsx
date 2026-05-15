import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { LoadingState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";

export default function AdminAttendancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "attendance"],
    queryFn: () => attendanceApi.sessions(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Управление"
        title="Сессии посещаемости"
        subtitle="Все занятия преподавателей с отметками."
      />

      {isLoading && <LoadingState rows={4} />}

      <div className="grid gap-3">
        {data?.map((s) => (
          <Card key={s.id} className="p-5 flex items-center gap-4">
            <div className="text-center w-24">
              <div className="text-xs text-muted">{fmtDate(s.startsAt, "d MMM")}</div>
              <div className="font-display text-lg text-navy">
                {fmtTime(s.startsAt)}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-navy">{s.title}</div>
              <div className="text-xs text-muted">
                Преподаватель …{s.teacherId.slice(-6)} · Аудитория …{s.roomId.slice(-6)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
