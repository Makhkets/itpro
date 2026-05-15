import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { libraryApi } from "@/shared/api/modules";
import type { LibraryBook } from "@/shared/api/types";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState, LoadingState } from "@/shared/ui/states";
import { extractError } from "@/shared/api/client";
import { getDemoBook } from "./demo-library";

async function loadBook(id: string): Promise<LibraryBook | undefined> {
  try {
    return await libraryApi.bookById(id);
  } catch {
    return getDemoBook(id);
  }
}

export default function LibraryBookPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [borrowedDemo, setBorrowedDemo] = useState(false);
  const isDemoBook = id.startsWith("demo-");

  const { data, isLoading } = useQuery({
    queryKey: ["library", "book", id],
    queryFn: () => loadBook(id),
    enabled: !!id,
  });

  const borrow = useMutation({
    mutationFn: async () => {
      if (isDemoBook) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        return null;
      }
      return libraryApi.borrow(id);
    },
    onSuccess: () => {
      if (isDemoBook) setBorrowedDemo(true);
      toast.success("Книга оформлена. Не забудьте вернуть в срок.");
      qc.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (!data) {
    return (
      <EmptyState
        title="Книга не найдена"
        description="Вернитесь в каталог и выберите другое издание."
        icon={<BookOpen className="h-6 w-6" />}
        action={
          <Link to="/library">
            <Button variant="secondary">К каталогу</Button>
          </Link>
        }
      />
    );
  }

  const book = data;
  const availableCopies = borrowedDemo
    ? Math.max(0, book.availableCopies - 1)
    : book.availableCopies;
  const canBorrow = availableCopies > 0 && !borrowedDemo;

  return (
    <div className="space-y-6 max-w-6xl">
      <Link
        to="/library"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> Назад в каталог
      </Link>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <section className="rounded-2xl bg-navy text-white p-6 relative overflow-hidden min-h-[380px]">
          <div className="absolute inset-0 hero-lines opacity-40" />
          <div className="relative h-full flex flex-col justify-between">
            <div>
              <div className="h-56 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <BookOpen className="h-16 w-16 opacity-70" />
              </div>
              <div className="mt-5 text-xs uppercase tracking-wider text-white/60">
                {book.category ?? "Библиотека"}
              </div>
            </div>
            <div>
              <p className="font-display text-2xl leading-tight line-clamp-3">
                {book.title}
              </p>
              <p className="text-sm text-white/65 mt-2">
                {book.author ?? "Автор не указан"}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <Card className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2 mb-5">
              {book.category && <Badge variant="burgundy">{book.category}</Badge>}
              <Badge variant={availableCopies > 0 ? "success" : "danger"}>
                {availableCopies > 0
                  ? `Доступно ${availableCopies} из ${book.totalCopies}`
                  : "Нет в наличии"}
              </Badge>
              {book.isbn && <Badge variant="info">ISBN {book.isbn}</Badge>}
            </div>

            <h1 className="font-display text-4xl md:text-5xl text-navy leading-tight">
              {book.title}
            </h1>
            <p className="text-lg text-muted mt-2">
              {book.author ?? "Автор не указан"}
            </p>

            <p className="text-sm text-navy-75 leading-relaxed mt-6 max-w-3xl">
              {book.description ?? "Описание пока не добавлено библиотекарем."}
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-7">
              <div className="rounded-xl bg-surface-subtle border border-border p-4">
                <div className="text-xs text-muted">Всего</div>
                <div className="font-display text-2xl text-navy mt-1">
                  {book.totalCopies}
                </div>
              </div>
              <div className="rounded-xl bg-surface-subtle border border-border p-4">
                <div className="text-xs text-muted">Свободно</div>
                <div className="font-display text-2xl text-navy mt-1">
                  {availableCopies}
                </div>
              </div>
              <div className="rounded-xl bg-surface-subtle border border-border p-4">
                <div className="text-xs text-muted">Срок</div>
                <div className="font-display text-2xl text-navy mt-1">14 дн.</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Button
                size="lg"
                loading={borrow.isPending}
                disabled={!canBorrow}
                onClick={() => borrow.mutate()}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {borrowedDemo ? "Уже оформлена" : "Взять книгу"}
              </Button>
              <Link to="/library/loans/my">
                <Button variant="secondary" size="lg">
                  Мои книги
                </Button>
              </Link>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-burgundy" />
                <h3 className="font-semibold text-navy">Где забрать</h3>
              </div>
              <p className="text-sm text-navy-75">
                {book.location ?? "Уточните расположение у библиотекаря."}
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-burgundy" />
                <h3 className="font-semibold text-navy">Условия выдачи</h3>
              </div>
              <p className="text-sm text-navy-75">
                Стандартный срок выдачи - 14 дней. Напоминания приходят в
                приложение и Telegram.
              </p>
            </Card>
          </div>

          <Card className="p-5 bg-burgundy-light/60 border-burgundy/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-burgundy shrink-0 mt-0.5" />
              <p className="text-sm text-navy-75">
                MVP-версия использует реальные endpoints библиотеки из swagger.
                Если backend недоступен, карточка работает на демо-данных с тем
                же контрактом.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
