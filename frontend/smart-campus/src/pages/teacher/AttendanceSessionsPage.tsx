import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { attendanceApi, roomsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { FieldError, Input, Label, Select } from "@/shared/ui/input";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import { extractError } from "@/shared/api/client";

const schema = z.object({
  roomId: z.string().uuid("Выберите аудиторию"),
  title: z.string().min(2),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

export default function AttendanceSessionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "sessions"],
    queryFn: () => attendanceApi.sessions(),
  });
  const rooms = useQuery({
    queryKey: ["rooms", "all"],
    queryFn: () => roomsApi.list(),
  });
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: FormData) =>
      attendanceApi.createSession({
        ...v,
        startsAt: new Date(v.startsAt).toISOString(),
        endsAt: new Date(v.endsAt).toISOString(),
      }),
    onSuccess: () => {
      toast.success("Сессия создана");
      qc.invalidateQueries({ queryKey: ["attendance", "sessions"] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Преподаватель"
        title="Сессии посещаемости"
        subtitle="Создавайте сессии и отмечайте присутствие группы."
        actions={
          <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Новая сессия
          </Button>
        }
      />

      {isLoading && <LoadingState rows={4} />}
      {!isLoading && !data?.length && (
        <EmptyState title="Сессий пока нет" />
      )}

      <div className="grid gap-3">
        {data?.map((s) => (
          <Link key={s.id} to={`/attendance/sessions/${s.id}`}>
            <Card className="p-5 flex flex-wrap items-center gap-4 hover:border-navy/30 transition-colors cursor-pointer">
              <div className="text-center w-20 shrink-0">
                <div className="text-xs text-muted">{fmtDate(s.startsAt, "d MMM")}</div>
                <div className="font-display text-xl text-navy">{fmtTime(s.startsAt)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-navy">{s.title}</h3>
                <p className="text-xs text-muted">
                  {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Открыть →
              </Button>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Новая сессия посещаемости"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
        >
          <div>
            <Label required>Аудитория</Label>
            <Select {...form.register("roomId")}>
              <option value="">Выберите</option>
              {rooms.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} · {r.name ?? r.type}
                </option>
              ))}
            </Select>
            <FieldError message={form.formState.errors.roomId?.message} />
          </div>
          <div>
            <Label required>Название</Label>
            <Input placeholder="Лекция: Алгоритмы и структуры данных" {...form.register("title")} />
            <FieldError message={form.formState.errors.title?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Начало</Label>
              <Input type="datetime-local" {...form.register("startsAt")} />
            </div>
            <div>
              <Label required>Окончание</Label>
              <Input type="datetime-local" {...form.register("endsAt")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={create.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
