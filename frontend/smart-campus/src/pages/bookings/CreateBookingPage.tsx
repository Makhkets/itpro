import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { bookingsApi, roomsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/shared/ui/input";
import { extractError } from "@/shared/api/client";

const schema = z.object({
  roomId: z.string().uuid("Выберите аудиторию"),
  title: z.string().min(2).max(255),
  purpose: z.string().optional(),
  bookingType: z.enum(["meeting", "lecture", "event", "study", "other"]),
  startsAt: z.string().min(1, "Укажите начало"),
  endsAt: z.string().min(1, "Укажите окончание"),
});
type FormData = z.infer<typeof schema>;

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const rooms = useQuery({
    queryKey: ["rooms", "bookable"],
    queryFn: () => roomsApi.list({ bookable: true }),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      roomId: sp.get("roomId") ?? "",
      bookingType: "meeting",
      startsAt: sp.get("startsAt") ?? "",
      endsAt: sp.get("endsAt") ?? "",
    },
  });

  useEffect(() => {
    if (sp.get("startsAt")) {
      form.setValue("startsAt", toLocalInput(sp.get("startsAt")!));
    }
    if (sp.get("endsAt")) {
      form.setValue("endsAt", toLocalInput(sp.get("endsAt")!));
    }
  }, [sp, form]);

  const create = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      toast.success("Заявка отправлена на рассмотрение");
      navigate("/bookings/my");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Бронирование"
        title="Новая заявка"
        subtitle="Заявка будет отправлена администратору на согласование."
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 md:p-8">
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((v) =>
              create.mutate({
                ...v,
                startsAt: new Date(v.startsAt).toISOString(),
                endsAt: new Date(v.endsAt).toISOString(),
              }),
            )}
          >
            <div>
              <Label required>Аудитория</Label>
              <Select {...form.register("roomId")}>
                <option value="">Выберите аудиторию</option>
                {rooms.data?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} · {r.name ?? r.type} · до {r.capacity}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.roomId?.message} />
            </div>

            <div>
              <Label required>Название</Label>
              <Input
                placeholder="Командная встреча, защита проекта…"
                {...form.register("title")}
              />
              <FieldError message={form.formState.errors.title?.message} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label required>Начало</Label>
                <Input type="datetime-local" {...form.register("startsAt")} />
                <FieldError message={form.formState.errors.startsAt?.message} />
              </div>
              <div>
                <Label required>Окончание</Label>
                <Input type="datetime-local" {...form.register("endsAt")} />
                <FieldError message={form.formState.errors.endsAt?.message} />
              </div>
            </div>

            <div>
              <Label>Тип бронирования</Label>
              <Select {...form.register("bookingType")}>
                <option value="meeting">Встреча</option>
                <option value="lecture">Лекция</option>
                <option value="event">Мероприятие</option>
                <option value="study">Самостоятельная работа</option>
                <option value="other">Другое</option>
              </Select>
            </div>

            <div>
              <Label>Цель</Label>
              <Textarea
                placeholder="Кратко опишите цель встречи…"
                {...form.register("purpose")}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
              >
                Отмена
              </Button>
              <Button type="submit" loading={create.isPending}>
                Отправить заявку
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
