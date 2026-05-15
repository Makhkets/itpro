import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Search } from "lucide-react";
import { libraryApi } from "@/shared/api/modules";
import type { LibraryBook } from "@/shared/api/types";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input, FieldError, Label, Textarea } from "@/shared/ui/input";
import { Dialog } from "@/shared/ui/dialog";
import { DataTable } from "@/shared/ui/data-table";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";

const schema = z.object({
  title: z.string().min(2),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  totalCopies: z.coerce.number().min(0),
  availableCopies: z.coerce.number().min(0),
  location: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function LibraryManageBooksPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryBook | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["library", "manage", q],
    queryFn: () => libraryApi.searchBooks(q || undefined),
  });
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { totalCopies: 1, availableCopies: 1 },
  });
  const create = useMutation({
    mutationFn: libraryApi.createBook,
    onSuccess: () => {
      toast.success("Книга добавлена");
      qc.invalidateQueries({ queryKey: ["library"] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const update = useMutation({
    mutationFn: (v: FormData) => libraryApi.updateBook(editing!.id, v),
    onSuccess: () => {
      toast.success("Книга обновлена");
      qc.invalidateQueries({ queryKey: ["library"] });
      setOpen(false);
      setEditing(null);
      form.reset({ totalCopies: 1, availableCopies: 1 });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ totalCopies: 1, availableCopies: 1 });
    setOpen(true);
  }

  function openEdit(book: LibraryBook) {
    setEditing(book);
    form.reset({
      title: book.title,
      author: book.author ?? "",
      isbn: book.isbn ?? "",
      category: book.category ?? "",
      description: book.description ?? "",
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      location: book.location ?? "",
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    form.reset({ totalCopies: 1, availableCopies: 1 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Библиотека"
        title="Управление каталогом"
        subtitle="Добавляйте, редактируйте и снимайте книги с полок."
        actions={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Добавить книгу
          </Button>
        }
      />

      <Card className="p-4">
        <Input
          placeholder="Поиск книги"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </Card>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : (
        <DataTable
          data={data ?? []}
          rowKey={(b) => b.id}
          columns={[
            {
              key: "title",
              header: "Книга",
              cell: (b) => (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-7 rounded bg-navy text-white/60 flex items-center justify-center">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-medium text-navy">{b.title}</div>
                    <div className="text-xs text-muted">{b.author}</div>
                  </div>
                </div>
              ),
            },
            {
              key: "cat",
              header: "Категория",
              cell: (b) => b.category && <Badge variant="muted">{b.category}</Badge>,
            },
            {
              key: "isbn",
              header: "ISBN",
              cell: (b) => <span className="text-xs text-muted">{b.isbn}</span>,
            },
            {
              key: "stock",
              header: "Наличие",
              cell: (b) => (
                <Badge variant={b.availableCopies > 0 ? "success" : "danger"}>
                  {b.availableCopies}/{b.totalCopies}
                </Badge>
              ),
            },
            { key: "loc", header: "Полка", cell: (b) => b.location },
            {
              key: "actions",
              header: "",
              cell: (b) => (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() => openEdit(b)}
                >
                  Изменить
                </Button>
              ),
              className: "text-right",
            },
          ]}
        />
      )}

      <Dialog
        open={open}
        onClose={closeDialog}
        title={editing ? "Редактировать книгу" : "Новая книга"}
        size="lg"
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) =>
            editing ? update.mutate(v) : create.mutate(v),
          )}
        >
          <div>
            <Label required>Название</Label>
            <Input {...form.register("title")} />
            <FieldError message={form.formState.errors.title?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Автор</Label>
              <Input {...form.register("author")} />
            </div>
            <div>
              <Label>ISBN</Label>
              <Input {...form.register("isbn")} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Категория</Label>
              <Input {...form.register("category")} />
            </div>
            <div>
              <Label required>Всего</Label>
              <Input type="number" {...form.register("totalCopies")} />
            </div>
            <div>
              <Label required>Доступно</Label>
              <Input type="number" {...form.register("availableCopies")} />
            </div>
          </div>
          <div>
            <Label>Полка / расположение</Label>
            <Input placeholder="LIB-101, shelf SE-2" {...form.register("location")} />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea {...form.register("description")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Отмена
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
