import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";
import { faqApi } from "@/shared/api/modules";
import { Wordmark } from "@/shared/ui/wordmark";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { cn } from "@/shared/lib/cn";

export default function PublicFaqPage() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["faq", "public", q],
    queryFn: () => (q.trim() ? faqApi.search(q) : faqApi.list()),
  });

  const categories = useMemo(() => {
    const list = (data ?? []).map((f) => f.category).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [data]);
  const [category, setCategory] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      category ? (data ?? []).filter((f) => f.category === category) : data ?? [],
    [data, category],
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <header className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 hero-lines opacity-60" />
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-burgundy/25 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[480px] w-[480px] rounded-full bg-accent-red/15 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-8 pb-16">
          <div className="flex items-center justify-between mb-10">
            <Wordmark variant="dark" size="md" />
            <nav className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm text-white/70 hover:text-white px-4 h-10 inline-flex items-center"
              >
                Войти
              </Link>
              <Link to="/register">
                <Button variant="primary" size="md">
                  Регистрация
                </Button>
              </Link>
            </nav>
          </div>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium mb-6">
              <GraduationCap className="h-3.5 w-3.5 text-burgundy" />
              FAQ для абитуриентов 2026
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.02]">
              Поступление в ГГНТУ —{" "}
              <span className="text-burgundy">ясно</span>, по делу,
              без бюрократии.
            </h1>
            <p className="text-white/70 mt-6 max-w-2xl text-base md:text-lg">
              Найдите ответы на вопросы о направлениях, экзаменах,
              общежитии и студенческой жизни. Что-то непонятно — спросите AI.
            </p>

            <div className="mt-8 max-w-xl">
              <Input
                placeholder="Например: «когда начинается приём документов»"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="h-14 !bg-white text-base"
              />
            </div>

            <div className="mt-4">
              <Link to="/ai">
                <Button
                  variant="outline"
                  className="!border-white/40 !text-white hover:!bg-white/10"
                  leftIcon={<Bot className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Задать вопрос AI-ассистенту
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-12">
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <button
              onClick={() => setCategory(null)}
              className={cn(
                "px-4 h-9 rounded-full text-sm font-medium transition-colors border",
                !category
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-navy border-border hover:border-navy/30",
              )}
            >
              Все вопросы
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-4 h-9 rounded-full text-sm font-medium transition-colors border",
                  category === c
                    ? "bg-navy text-white border-navy"
                    : "bg-white text-navy border-border hover:border-navy/30",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <LoadingState rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="По вашему запросу пока ничего нет"
            description="Попробуйте задать вопрос AI-ассистенту — он ответит мгновенно."
            icon={<Sparkles className="h-6 w-6" />}
            action={
              <Link to="/ai">
                <Button leftIcon={<Bot className="h-4 w-4" />}>Спросить AI</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((f, i) => {
              const open = openId === f.id;
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "rounded-2xl border bg-white transition-all overflow-hidden",
                    open ? "border-burgundy/40 shadow-card-hover" : "border-border",
                  )}
                >
                  <button
                    onClick={() => setOpenId(open ? null : f.id)}
                    className="w-full text-left px-5 md:px-6 py-5 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {f.category && <Badge variant="burgundy">{f.category}</Badge>}
                      </div>
                      <h3 className="font-display text-xl text-navy">{f.question}</h3>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-muted shrink-0 transition-transform",
                        open && "rotate-180 text-burgundy",
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 md:px-6 pb-6 text-navy-75 leading-relaxed whitespace-pre-wrap border-t border-border pt-4">
                          {f.answer}
                          {f.keywords && f.keywords.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {f.keywords.map((k) => (
                                <span
                                  key={k}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-surface-subtle text-muted"
                                >
                                  #{k}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-950" />
          <div className="absolute inset-0 hero-lines opacity-50" />
          <div className="relative p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white">
              <h3 className="font-display text-3xl md:text-4xl mb-3">
                Не нашли ответ?
              </h3>
              <p className="text-white/70">
                AI-консультант ГГНТУ работает 24/7 и отвечает на вопросы об
                институтах, направлениях, проходных баллах и студенческой жизни.
              </p>
            </div>
            <div className="flex md:justify-end gap-3">
              <Link to="/ai">
                <Button size="lg" leftIcon={<Bot className="h-4 w-4" />}>
                  Спросить AI
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="!border-white/30 !text-white">
                  Зарегистрироваться
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Wordmark size="sm" />
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} ГГНТУ им. акад. М.Д. Миллионщикова
          </p>
        </div>
      </footer>
    </div>
  );
}
