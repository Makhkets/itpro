import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Layers,
  Library,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { libraryApi } from "@/shared/api/modules";
import type { LibraryBook } from "@/shared/api/types";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Input, Label, Select } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { EmptyState, LoadingState } from "@/shared/ui/states";
import { cn } from "@/shared/lib/cn";
import { demoBooks, searchDemoBooks } from "./demo-library";

type AvailabilityFilter = "all" | "available" | "unavailable";

const coverStyles = [
  "bg-gradient-to-br from-navy via-[#26334f] to-burgundy",
  "bg-gradient-to-br from-[#205b5d] via-navy to-[#111827]",
  "bg-gradient-to-br from-burgundy via-[#b74755] to-[#f1b45b]",
  "bg-gradient-to-br from-[#34515e] via-[#64748b] to-navy",
];

async function loadBooks(q: string, category: string) {
  try {
    const books = await libraryApi.searchBooks({
      q: q || undefined,
      category: category === "all" ? undefined : category,
    });
    if (books.length) return books;
  } catch {
    // MVP fallback: каталог остаётся живым, даже если backend ещё не поднят.
  }

  return searchDemoBooks({
    q: q || undefined,
    category: category === "all" ? undefined : category,
  });
}

function getBookMeta(books: LibraryBook[]) {
  const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
  const availableCopies = books.reduce(
    (sum, book) => sum + book.availableCopies,
    0,
  );
  const categories = Array.from(
    new Set(
      [...demoBooks, ...books]
        .map((book) => book.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, "ru"));

  return {
    totalCopies,
    availableCopies,
    categories,
    availableTitles: books.filter((book) => book.availableCopies > 0).length,
  };
}

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["library", "books", q, category],
    queryFn: () => loadBooks(q, category),
  });

  const books = data ?? [];
  const filteredBooks = useMemo(
    () =>
      books.filter((book) => {
        if (availability === "available") return book.availableCopies > 0;
        if (availability === "unavailable") return book.availableCopies === 0;
        return true;
      }),
    [availability, books],
  );
  const meta = useMemo(() => getBookMeta(books), [books]);
  const featured = filteredBooks.find((book) => book.availableCopies > 0) ??
    filteredBooks[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Библиотека"
        title="Цифровой каталог"
        subtitle="Поиск книг из swagger API: название, автор, ISBN, категория, наличие и онлайн-оформление."
        actions={
          <Link to="/library/loans/my">
            <Button variant="secondary" leftIcon={<BookOpen className="h-4 w-4" />}>
              Мои книги
            </Button>
          </Link>
        }
      />

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <section className="rounded-2xl border border-border bg-white overflow-hidden">
          <div className="p-5 md:p-6 bg-navy text-white relative">
            <div className="absolute inset-0 hero-lines opacity-35" />
            <div className="relative flex flex-col md:flex-row md:items-end gap-5 justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                  <Library className="h-4 w-4" />
                  Smart Campus Library
                </div>
                <h2 className="font-display text-3xl md:text-4xl mt-3">
                  Учебные книги рядом
                </h2>
                <p className="text-sm text-white/72 max-w-xl mt-2">
                  Быстро найдите издание, проверьте свободные экземпляры и
                  заберите его на нужной полке.
                </p>
              </div>
              {featured && (
                <Link to={`/library/books/${featured.id}`} className="shrink-0">
                  <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/15">
                    Открыть подборку
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-4">
              <div className="flex items-center gap-2 text-muted text-xs">
                <BookMarked className="h-4 w-4 text-burgundy" />
                Названий
              </div>
              <div className="font-display text-2xl text-navy mt-1">
                {books.length}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-muted text-xs">
                <Layers className="h-4 w-4 text-burgundy" />
                Экземпляров
              </div>
              <div className="font-display text-2xl text-navy mt-1">
                {meta.totalCopies}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-muted text-xs">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Доступно
              </div>
              <div className="font-display text-2xl text-navy mt-1">
                {meta.availableCopies}
              </div>
            </div>
          </div>
        </section>

        {featured && (
          <Link to={`/library/books/${featured.id}`}>
            <Card className="p-5 h-full hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex gap-4">
                <div className="h-32 w-24 rounded-xl bg-gradient-to-br from-burgundy via-[#b74755] to-navy text-white flex items-center justify-center shadow-sm relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 hero-lines opacity-40" />
                  <BookOpen className="h-8 w-8 opacity-70 relative" />
                  <span className="absolute bottom-2 right-2 text-[10px] text-white/60">
                    HIT
                  </span>
                </div>
                <div className="min-w-0">
                  <Badge variant="burgundy">Рекомендуем</Badge>
                  <h3 className="font-display text-xl text-navy leading-tight mt-3 line-clamp-2">
                    {featured.title}
                  </h3>
                  <p className="text-sm text-muted mt-1 truncate">
                    {featured.author ?? "Автор не указан"}
                  </p>
                  <p className="text-xs text-navy-75 mt-3 line-clamp-3">
                    {featured.description}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        )}
      </div>

      <Card className="p-4">
        <div className="grid lg:grid-cols-[1fr_220px_220px] gap-3">
          <div>
            <Label>Поиск</Label>
            <Input
              placeholder="Clean Code, алгоритмы, ISBN или автор"
              leftIcon={<Search className="h-4 w-4" />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div>
            <Label>Категория</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Все категории</option>
              {meta.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Наличие</Label>
            <Select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
            >
              <option value="all">Все книги</option>
              <option value="available">Можно взять</option>
              <option value="unavailable">Нет в наличии</option>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">
          <SlidersHorizontal className="h-3 w-3" />
          найдено {filteredBooks.length}
        </Badge>
        <Badge variant="success">доступно {meta.availableTitles}</Badge>
        {category !== "all" && <Badge variant="burgundy">{category}</Badge>}
      </div>

      {isLoading && <LoadingState rows={6} />}
      {!isLoading && !filteredBooks.length && (
        <EmptyState
          title="Книги не найдены"
          description="Попробуйте убрать фильтр категории или изменить поисковый запрос."
          icon={<Library className="h-6 w-6" />}
        />
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredBooks.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025 }}
          >
            <Link to={`/library/books/${book.id}`}>
              <Card className="p-5 h-full hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "h-28 w-20 rounded-xl shrink-0 flex items-center justify-center text-white shadow-sm relative overflow-hidden",
                      coverStyles[index % coverStyles.length],
                    )}
                  >
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-white/18" />
                    <BookOpen className="h-6 w-6 opacity-60" />
                    <span className="absolute bottom-2 right-2 text-[9px] text-white/70">
                      {book.isbn?.slice(-4) ?? "LIB"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg text-navy line-clamp-2 leading-tight">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted mt-1 truncate">
                      {book.author ?? "Автор не указан"}
                    </p>
                    <p className="text-xs text-navy-75 mt-3 line-clamp-2">
                      {book.description ?? "Описание пока не добавлено."}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-4">
                      {book.category && <Badge variant="muted">{book.category}</Badge>}
                      <Badge variant={book.availableCopies > 0 ? "success" : "danger"}>
                        {book.availableCopies > 0
                          ? `${book.availableCopies}/${book.totalCopies} свободно`
                          : "нет в наличии"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
