import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { attendanceApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { cn } from "@/shared/lib/cn";
import { extractError } from "@/shared/api/client";
import type { AttendanceStatus } from "@/shared/api/types";

const STATUSES: { v: AttendanceStatus; label: string; color: string }[] = [
  { v: "present", label: "Был", color: "bg-success text-white" },
  { v: "late", label: "Опозд.", color: "bg-warning text-white" },
  { v: "excused", label: "Уваж.", color: "bg-info text-white" },
  { v: "absent", label: "Прогул", color: "bg-accent-red text-white" },
];

export default function AttendanceSessionDetailsPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "session", id],
    queryFn: () => attendanceApi.records(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      const m: Record<string, AttendanceStatus> = {};
      data.forEach((r) => (m[r.studentId] = r.status));
      setMarks(m);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      attendanceApi.mark(
        id,
        Object.entries(marks).map(([studentId, status]) => ({
          studentId,
          status,
        })),
      ),
    onSuccess: () => {
      toast.success("Отметки сохранены");
      qc.invalidateQueries({ queryKey: ["attendance", "session", id] });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (isLoading) return <LoadingState rows={5} />;

  return (
    <div className="space-y-6">
      <Link
        to="/attendance/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> К сессиям
      </Link>

      <PageHeader
        eyebrow="Посещаемость"
        title="Отметки студентов"
        actions={
          <Button
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => save.mutate()}
            loading={save.isPending}
          >
            Сохранить
          </Button>
        }
      />

      <Card>
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <h3 className="font-semibold text-navy">Список студентов</h3>
          <Badge variant="muted">{data?.length ?? 0}</Badge>
        </div>
        <div className="divide-y divide-border">
          {data?.map((r) => (
            <div
              key={r.id}
              className="px-6 py-4 flex items-center gap-4"
            >
              <div className="h-9 w-9 rounded-lg bg-navy/5 text-navy flex items-center justify-center text-sm font-semibold shrink-0">
                {r.studentId.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-navy">
                  Студент · {r.studentId.slice(0, 8)}
                </div>
                <div className="text-xs text-muted">{r.comment ?? "—"}</div>
              </div>
              <div className="flex gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setMarks((m) => ({ ...m, [r.studentId]: s.v }))}
                    className={cn(
                      "px-3 h-9 rounded-lg text-xs font-medium transition-colors",
                      marks[r.studentId] === s.v
                        ? s.color
                        : "bg-navy/5 text-navy-75 hover:bg-navy/10",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
