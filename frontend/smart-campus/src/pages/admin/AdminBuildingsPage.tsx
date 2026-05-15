import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { buildingsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(8),
  address: z.string().optional(),
  description: z.string().optional(),
  navigationMode: z.enum(["text", "map", "hybrid"]).default("text"),
  isOldBuilding: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AdminBuildingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: () => buildingsApi.list(),
  });
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { navigationMode: "text" },
  });
  const create = useMutation({
    mutationFn: buildingsApi.create,
    onSuccess: () => {
      toast.success("Корпус создан");
      qc.invalidateQueries({ queryKey: ["buildings"] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Управление"
        title="Корпуса"
        subtitle="Каталог зданий университета."
        actions={
          <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Добавить корпус
          </Button>
        }
      />

      {isLoading && <LoadingState rows={4} />}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((b) => (
          <Link key={b.id} to={`/admin/buildings/${b.id}`}>
            <Card className="p-6 h-full hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-navy text-white flex items-center justify-center font-display text-lg">
                  {b.code}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl text-navy truncate">
                    {b.name}
                  </h3>
                  <p className="text-xs text-muted truncate">
                    {b.address ?? "адрес не указан"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="muted">{b.navigationMode}</Badge>
                {b.isOldBuilding && <Badge variant="warning">историческое</Badge>}
                {!b.isActive && <Badge variant="danger">скрыт</Badge>}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Новый корпус"
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
        >
          <div className="grid sm:grid-cols-[1fr_120px] gap-3">
            <div>
              <Label required>Название</Label>
              <Input placeholder="Главный корпус" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div>
              <Label required>Код</Label>
              <Input placeholder="A" {...form.register("code")} />
              <FieldError message={form.formState.errors.code?.message} />
            </div>
          </div>
          <div>
            <Label>Адрес</Label>
            <Input {...form.register("address")} />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea {...form.register("description")} />
          </div>
          <div>
            <Label>Режим навигации</Label>
            <Select {...form.register("navigationMode")}>
              <option value="text">Текстовый</option>
              <option value="map">Карта</option>
              <option value="hybrid">Гибрид</option>
            </Select>
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
