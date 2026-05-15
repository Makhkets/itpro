import type { LibraryBook, LibraryLoan } from "@/shared/api/types";

export const demoBooks: LibraryBook[] = [
  {
    id: "demo-clean-code",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    category: "Разработка",
    description:
      "Практичная книга о понятном коде, именовании, функциях, тестах и дисциплине ежедневной разработки. Хороша для студентов, которые уже пишут проекты и хотят делать их поддерживаемыми.",
    totalCopies: 6,
    availableCopies: 3,
    location: "LIB-101, стеллаж A2",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "demo-algorithms",
    title: "Грокаем алгоритмы",
    author: "Адитья Бхаргава",
    isbn: "9785446109234",
    category: "Алгоритмы",
    description:
      "Визуальное и дружелюбное введение в базовые алгоритмы: поиск, сортировки, графы, жадные алгоритмы и динамическое программирование.",
    totalCopies: 8,
    availableCopies: 5,
    location: "LIB-101, стеллаж B1",
    createdAt: "2026-01-18T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "demo-database",
    title: "Проектирование баз данных",
    author: "Томас Коннолли",
    isbn: "9780321523068",
    category: "Базы данных",
    description:
      "Основы моделирования данных, нормализации, SQL и проектирования схем для учебных и производственных информационных систем.",
    totalCopies: 4,
    availableCopies: 1,
    location: "LIB-102, стеллаж C4",
    createdAt: "2026-02-02T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "demo-networks",
    title: "Компьютерные сети",
    author: "Эндрю Таненбаум",
    isbn: "9780132126953",
    category: "Сети",
    description:
      "Классический учебник по архитектуре сетей, протоколам, маршрутизации, транспортному уровню и безопасности.",
    totalCopies: 5,
    availableCopies: 0,
    location: "LIB-201, стеллаж D3",
    createdAt: "2026-02-14T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "demo-ai",
    title: "Искусственный интеллект: современный подход",
    author: "Стюарт Рассел, Питер Норвиг",
    isbn: "9780136042594",
    category: "AI",
    description:
      "Большой справочник по поиску, логике, машинному обучению, вероятностным моделям и интеллектуальным агентам.",
    totalCopies: 3,
    availableCopies: 2,
    location: "LIB-202, стеллаж E1",
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "demo-design",
    title: "Дизайн привычных вещей",
    author: "Дон Норман",
    isbn: "9780465050659",
    category: "UX",
    description:
      "Книга о том, почему интерфейсы бывают понятными или раздражающими, и как проектировать вещи вокруг реальных людей.",
    totalCopies: 7,
    availableCopies: 4,
    location: "LIB-103, стеллаж F2",
    createdAt: "2026-03-12T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
  },
];

export function getDemoBook(id: string) {
  return demoBooks.find((book) => book.id === id);
}

export function searchDemoBooks(params?: {
  q?: string;
  author?: string;
  category?: string;
}) {
  const q = params?.q?.trim().toLowerCase();
  const author = params?.author?.trim().toLowerCase();
  const category = params?.category?.trim().toLowerCase();

  return demoBooks.filter((book) => {
    const matchesQuery =
      !q ||
      [book.title, book.author, book.isbn, book.description, book.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    const matchesAuthor =
      !author || book.author?.toLowerCase().includes(author);
    const matchesCategory =
      !category || book.category?.toLowerCase() === category;

    return matchesQuery && matchesAuthor && matchesCategory;
  });
}

export function getDemoLoans(): LibraryLoan[] {
  const now = new Date();
  const issuedAt = new Date(now);
  issuedAt.setDate(now.getDate() - 6);
  const dueAt = new Date(now);
  dueAt.setDate(now.getDate() + 8);

  const overdueDueAt = new Date(now);
  overdueDueAt.setDate(now.getDate() - 3);

  return [
    {
      id: "demo-loan-clean-code",
      bookId: demoBooks[0].id,
      book: demoBooks[0],
      userId: "demo-user",
      status: "active",
      issuedAt: issuedAt.toISOString(),
      dueAt: dueAt.toISOString(),
    },
    {
      id: "demo-loan-networks",
      bookId: demoBooks[3].id,
      book: demoBooks[3],
      userId: "demo-user",
      status: "overdue",
      issuedAt: "2026-04-20T10:00:00Z",
      dueAt: overdueDueAt.toISOString(),
    },
  ];
}
