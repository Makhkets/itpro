import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Library,
} from "lucide-react";
import { libraryApi } from "@/shared/api/modules";
import type { LibraryLoan } from "@/shared/api/types";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/badge";
import { EmptyState, LoadingState } from "@/shared/ui/states";
import { fmtDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import { getDemoLoans } from "./demo-library";

async function loadMyLoans(): Promise<LibraryLoan[]> {
  try {
    const loans = await libraryApi.myLoans();
    if (loans.length) return loans;
  } catch {
    // MVP fallback для презентации без заполненной базы.
  }

  return getDemoLoans();
}

export default function LibraryLoansMyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["library", "loans", "my"],
    queryFn: loadMyLoans,
  });

  const loans = data ?? [];
  const stats = useMemo(
    () => ({
      active: loans.filter((loan) => loan.status === "active").length,
      overdue: loans.filter((loan) => loan.status === "overdue").length,
      returned: loans.filter((loan) => loan.status === "returned").length,
    }),
    [loans],
  );

  return (
    <div className="space-y-6">
      <Link
        to="/library"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> К каталогу
      </Link>

      <PageHeader
        eyebrow="Библиотека"
        title="Мои книги"
        subtitle="Активные выдачи, сроки возврата и история чтения."
        actions={
          <Link to="/library">
            <Button variant="secondary" leftIcon={<Library className="h-4 w-4" />}>
              Каталог
            </Button>
          </Link>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <BookOpen className="h-4 w-4 text-info" />
            Активные
          </div>
          <div className="font-display text-3xl text-navy mt-1">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <AlertTriangle className="h-4 w-4 text-accent-red" />
            Просрочено
          </div>
          <div className="font-display text-3xl text-navy mt-1">
            {stats.overdue}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Возвращено
          </div>
          <div className="font-display text-3xl text-navy mt-1">
            {stats.returned}
          </div>
        </Card>
      </div>

      {isLoading && <LoadingState rows={4} />}

      {!isLoading && !loans.length && (
        <EmptyState
          title="Вы пока не брали книги"
          description="Откройте каталог и оформите первую книгу онлайн."
          icon={<BookOpen className="h-6 w-6" />}
          action={
            <Link to="/library">
              <Button>Открыть каталог</Button>
            </Link>
          }
        />
      )}

      <div className="grid gap-3">
        {loans.map((loan) => {
          const overdue = loan.status === "overdue";
          return (
            <Card
              key={loan.id}
              className={cn(
                "p-5 flex flex-col sm:flex-row sm:items-center gap-4",
                overdue && "border-accent-red/40 bg-accent-red-light/40",
              )}
            >
              <div className="h-20 w-14 rounded-lg bg-gradient-to-br from-navy to-burgundy text-white flex items-center justify-center shrink-0 relative overflow-hidden">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-white/18" />
                <BookOpen className="h-5 w-5 opacity-75" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg text-navy truncate">
                    {loan.book?.title ?? "Книга"}
                  </h3>
                  <StatusBadge status={loan.status} />
                </div>
                <p className="text-sm text-muted truncate mt-1">
                  {loan.book?.author ?? "Автор не указан"}
                </p>
                <p className="text-xs text-muted mt-3 inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Выдана {fmtDate(loan.issuedAt, "d MMM")} · вернуть до{" "}
                  <span
                    className={cn(
                      "font-medium",
                      overdue ? "text-accent-red" : "text-navy",
                    )}
                  >
                    {fmtDate(loan.dueAt, "d MMM yyyy")}
                  </span>
                </p>
              </div>
              {loan.bookId && (
                <Link to={`/library/books/${loan.bookId}`} className="shrink-0">
                  <Button variant="secondary" size="sm">
                    Открыть
                  </Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
