import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { libraryApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { DataTable } from "@/shared/ui/data-table";
import { StatusBadge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { FieldError, Input, Label, Select } from "@/shared/ui/input";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { fmtDate } from "@/shared/lib/date";
import { extractError } from "@/shared/api/client";

const loanSchema = z.object({
  bookId: z.string().uuid("Укажите UUID книги"),
  userId: z.string().uuid("Укажите UUID читателя"),
  dueAt: z.string().optional(),
});
type LoanForm = z.infer<typeof loanSchema>;
type LoanStatusFilter = "all" | "active" | "returned" | "overdue";

export default function LibraryManageLoansPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LoanStatusFilter>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["library", "loans", status],
    queryFn: () => libraryApi.loans(status === "all" ? undefined : { status }),
  });
  const form = useForm<LoanForm>({
    resolver: zodResolver(loanSchema),
  });
  const ret = useMutation({
    mutationFn: (id: string) => libraryApi.returnLoan(id),
    onSuccess: () => {
      toast.success("Книга возвращена");
      qc.invalidateQueries({ queryKey: ["library", "loans"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const create = useMutation({
    mutationFn: (v: LoanForm) =>
      libraryApi.createLoan({
        bookId: v.bookId,
        userId: v.userId,
        dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      toast.success("Выдача оформлена");
      qc.invalidateQueries({ queryKey: ["library", "loans"] });
      qc.invalidateQueries({ queryKey: ["library", "manage"] });
      setOpen(false);
      form.reset();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Библиотека"
        title="Выдачи книг"
        subtitle="Все активные и просроченные выдачи."
        actions={
          <Button onClick={() => setOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Оформить выдачу
          </Button>
        }
      />

      <Card className="p-4">
        <div className="max-w-xs">
          <Label>Статус</Label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as LoanStatusFilter)}
          >
            <option value="all">Все выдачи</option>
            <option value="active">Активные</option>
            <option value="overdue">Просроченные</option>
            <option value="returned">Возвращённые</option>
          </Select>
        </div>
      </Card>

      {isLoading && <LoadingState rows={5} />}
      {!isLoading && !data?.length && <EmptyState title="Выдач пока нет" />}

      <DataTable
        data={data ?? []}
        rowKey={(l) => l.id}
        columns={[
          {
            key: "book",
            header: "Книга",
            cell: (l) => (
              <div>
                <div className="font-medium text-navy">{l.book?.title}</div>
                <div className="text-xs text-muted">{l.book?.author}</div>
              </div>
            ),
          },
          {
            key: "user",
            header: "Читатель",
            cell: (l) => (
              <span className="text-sm text-navy">…{l.userId.slice(-6)}</span>
            ),
          },
          {
            key: "issued",
            header: "Выдана",
            cell: (l) => fmtDate(l.issuedAt, "d MMM"),
          },
          {
            key: "due",
            header: "Вернуть до",
            cell: (l) => fmtDate(l.dueAt, "d MMM"),
          },
          {
            key: "status",
            header: "Статус",
            cell: (l) => <StatusBadge status={l.status} />,
          },
          {
            key: "act",
            header: "",
            cell: (l) =>
              l.status !== "returned" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => ret.mutate(l.id)}
                  loading={ret.isPending}
                >
                  Принять возврат
                </Button>
              ),
            className: "text-right",
          },
        ]}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Оформить выдачу"
        description="MVP-форма: вставьте UUID книги и пользователя из админки или API."
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
        >
          <div>
            <Label required>UUID книги</Label>
            <Input placeholder="bookId" {...form.register("bookId")} />
            <FieldError message={form.formState.errors.bookId?.message} />
          </div>
          <div>
            <Label required>UUID читателя</Label>
            <Input placeholder="userId" {...form.register("userId")} />
            <FieldError message={form.formState.errors.userId?.message} />
          </div>
          <div>
            <Label>Вернуть до</Label>
            <Input type="datetime-local" {...form.register("dueAt")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={create.isPending}>
              Оформить
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
