import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { faqApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { FieldError, Input, Label, Textarea } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";

const schema = z.object({
  question: z.string().min(2),
  answer: z.string().min(2),
  category: z.string().optional(),
  keywords: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AdminFaqPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "faq"],
    queryFn: () => faqApi.list(),
  });
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const create = useMutation({
    mutationFn: (v: FormData) =>
      faqApi.create({
        question: v.question,
        answer: v.answer,
        category: v.category,
        keywords: v.keywords
          ?.split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Вопрос добавлен");
      qc.invalidateQueries({ queryKey: ["admin", "faq"] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const remove = useMutation({
    mutationFn: faqApi.delete,
    onSuccess: () => {
      toast.success("Удалено");
      qc.invalidateQueries({ queryKey: ["admin", "faq"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Управление"
        title="FAQ для абитуриентов"
        actions={
          <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Добавить вопрос
          </Button>
        }
      />

      {isLoading && <LoadingState rows={4} />}
      {!isLoading && !data?.length && <EmptyState title="Пока пусто" />}

      <div className="space-y-3">
        {data?.map((f) => (
          <Card key={f.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {f.category && <Badge variant="burgundy">{f.category}</Badge>}
                  {!f.isActive && <Badge variant="muted">скрыт</Badge>}
                </div>
                <h3 className="font-display text-lg text-navy">{f.question}</h3>
                <p className="text-sm text-navy-75 mt-2 whitespace-pre-wrap">
                  {f.answer}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove.mutate(f.id)}
              >
                <Trash2 className="h-4 w-4 text-accent-red" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Новый вопрос FAQ"
        size="lg"
      >
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <div>
            <Label required>Вопрос</Label>
            <Input {...form.register("question")} />
            <FieldError message={form.formState.errors.question?.message} />
          </div>
          <div>
            <Label required>Ответ</Label>
            <Textarea rows={5} {...form.register("answer")} />
            <FieldError message={form.formState.errors.answer?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Категория</Label>
              <Input placeholder="admission" {...form.register("category")} />
            </div>
            <div>
              <Label>Ключевые слова</Label>
              <Input placeholder="через запятую" {...form.register("keywords")} />
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
