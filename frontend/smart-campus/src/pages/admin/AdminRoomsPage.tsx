import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { buildingsApi, roomsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { FieldError, Input, Label, Select } from "@/shared/ui/input";
import { DataTable } from "@/shared/ui/data-table";
import { RoomTypeBadge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";

const schema = z.object({
  buildingId: z.string().uuid(),
  floorId: z.string().uuid(),
  number: z.string().min(1),
  name: z.string().optional(),
  type: z
    .enum(["lecture", "computer_lab", "coworking", "meeting", "office", "library", "lab", "other"])
    .default("other"),
  capacity: z.coerce.number().min(0),
});
type FormData = z.infer<typeof schema>;

export default function AdminRoomsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const rooms = useQuery({ queryKey: ["rooms", "admin"], queryFn: () => roomsApi.list() });
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: () => buildingsApi.list() });
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { type: "other" } });
  const buildingId = form.watch("buildingId");
  const floors = useQuery({
    queryKey: ["building", buildingId, "floors"],
    queryFn: () => buildingsApi.floors(buildingId),
    enabled: !!buildingId,
  });

  const create = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      toast.success("Аудитория создана");
      qc.invalidateQueries({ queryKey: ["rooms"] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Управление"
        title="Аудитории"
        subtitle="Каталог аудиторий и пространств кампуса."
        actions={
          <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Добавить
          </Button>
        }
      />

      {rooms.isLoading ? (
        <LoadingState rows={6} />
      ) : (
        <DataTable
          data={rooms.data ?? []}
          rowKey={(r) => r.id}
          columns={[
            {
              key: "num",
              header: "Номер",
              cell: (r) => (
                <div>
                  <div className="font-medium text-navy">{r.number}</div>
                  <div className="text-xs text-muted">{r.name}</div>
                </div>
              ),
            },
            { key: "type", header: "Тип", cell: (r) => <RoomTypeBadge type={r.type} /> },
            {
              key: "loc",
              header: "Корпус / этаж",
              cell: (r) =>
                `${r.building?.code ?? "—"} · ${r.floor?.number ?? "—"}`,
            },
            { key: "cap", header: "Вместимость", cell: (r) => r.capacity },
          ]}
        />
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Новая аудитория"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Корпус</Label>
              <Select {...form.register("buildingId")}>
                <option value="">—</option>
                {buildings.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.name}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.buildingId?.message} />
            </div>
            <div>
              <Label required>Этаж</Label>
              <Select {...form.register("floorId")} disabled={!buildingId}>
                <option value="">—</option>
                {floors.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    Этаж {f.number}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.floorId?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Номер</Label>
              <Input placeholder="A-305" {...form.register("number")} />
            </div>
            <div>
              <Label>Название</Label>
              <Input placeholder="Лекционная 305" {...form.register("name")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Тип</Label>
              <Select {...form.register("type")}>
                <option value="lecture">Лекционная</option>
                <option value="computer_lab">Компьютерный класс</option>
                <option value="coworking">Коворкинг</option>
                <option value="meeting">Переговорная</option>
                <option value="office">Кабинет</option>
                <option value="library">Библиотека</option>
                <option value="lab">Лаборатория</option>
                <option value="other">Прочее</option>
              </Select>
            </div>
            <div>
              <Label>Вместимость</Label>
              <Input type="number" {...form.register("capacity")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
