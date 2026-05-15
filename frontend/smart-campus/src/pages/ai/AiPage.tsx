import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bot,
  ChevronRight,
  ArrowUp,
  PlusCircle,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { aiApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { fmtRelative } from "@/shared/lib/date";
import { extractError } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";

const SUGGESTIONS = [
  "Где находится аудитория A-305 и как до неё добраться?",
  "Какое расписание у группы ИСТ-25-2 сегодня?",
  "Какие документы нужны для поступления на ИТ-направления?",
  "Есть ли в библиотеке книга «Clean Architecture»?",
];

export default function AiPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessions = useQuery({
    queryKey: ["ai", "sessions"],
    queryFn: () => aiApi.sessions(),
  });

  const messages = useQuery({
    queryKey: ["ai", "messages", activeId],
    queryFn: () => aiApi.messages(activeId!),
    enabled: !!activeId,
  });

  const send = useMutation({
    mutationFn: (text: string) => aiApi.chat(text, activeId),
    onSuccess: (data) => {
      setActiveId(data.sessionId);
      qc.invalidateQueries({ queryKey: ["ai", "messages", data.sessionId] });
      qc.invalidateQueries({ queryKey: ["ai", "sessions"] });
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: aiApi.deleteSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai", "sessions"] });
      setActiveId(undefined);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.data?.length, send.isPending]);

  function submit(text: string) {
    const t = text.trim();
    if (!t) return;
    setDraft("");
    send.mutate(t);
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5 h-[calc(100vh-7rem)]">
      {/* Sessions */}
      <aside className="hidden lg:flex flex-col rounded-2xl bg-white border border-border overflow-hidden">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <Bot className="h-4 w-4 text-burgundy" />
          <div className="font-display text-lg text-navy">AI-сессии</div>
        </div>
        <button
          onClick={() => {
            setActiveId(undefined);
            setDraft("");
          }}
          className="mx-3 mt-3 mb-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Новая сессия
        </button>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sessions.isLoading && <LoadingState rows={3} />}
          {sessions.data?.length === 0 && (
            <p className="text-xs text-muted text-center py-6">
              История появится после первого вопроса.
            </p>
          )}
          {sessions.data?.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                activeId === s.id ? "bg-burgundy-light" : "hover:bg-surface-subtle",
              )}
              onClick={() => setActiveId(s.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy truncate">
                  {s.title || "Без названия"}
                </div>
                <div className="text-[11px] text-muted">
                  {fmtRelative(s.updatedAt)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove.mutate(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white text-muted"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <section className="rounded-2xl bg-white border border-border flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-burgundy to-burgundy-dark text-white flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl text-navy leading-none">
                Ассистент SmartCampus
              </div>
              <div className="text-xs text-muted mt-1">
                AI-консультант ГГНТУ · ответы за секунды
              </div>
            </div>
          </div>
          <Badge variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            онлайн
          </Badge>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {!activeId && !messages.data?.length && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 rounded-2xl bg-burgundy-light items-center justify-center text-burgundy mb-4">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="font-display text-3xl text-navy">
                  Чем помочь, {user?.fullName.split(" ")[1] ?? user?.fullName}?
                </h2>
                <p className="text-muted mt-2">
                  Спросите о расписании, аудиториях, поступлении или библиотеке.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => submit(s)}
                    className="text-left p-4 rounded-2xl border border-border bg-surface-subtle hover:bg-white hover:border-burgundy/30 hover:shadow-card transition-all group"
                  >
                    <p className="text-sm text-navy font-medium pr-6">{s}</p>
                    <div className="text-xs text-burgundy mt-2 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Спросить <ChevronRight className="h-3 w-3" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {messages.isLoading && activeId && <LoadingState rows={3} />}

          <div className="max-w-3xl mx-auto space-y-6">
            {messages.data?.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "flex gap-3",
                  m.role === "user" && "flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                    m.role === "user"
                      ? "bg-navy text-white"
                      : "bg-burgundy text-white",
                  )}
                >
                  {m.role === "user" ? (
                    <UserIcon className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap leading-relaxed",
                    m.role === "user"
                      ? "bg-navy text-white"
                      : "bg-surface-subtle text-navy border border-border",
                  )}
                >
                  {m.content}
                </div>
              </motion.div>
            ))}
            {send.isPending && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-xl bg-burgundy text-white flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-surface-subtle border border-border inline-flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-burgundy animate-bounce"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 md:px-8 pb-4 pt-3 border-t border-border bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
            className="relative max-w-3xl mx-auto"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(draft);
                }
              }}
              rows={1}
              placeholder="Спросите что угодно об университете…"
              className="w-full resize-none rounded-2xl border border-border bg-surface-subtle px-5 py-4 pr-14 text-sm focus:outline-none focus:bg-white focus:border-burgundy focus:shadow-glow min-h-[56px] max-h-40"
              style={{
                height: "auto",
              }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || send.isPending}
              className="absolute right-3 bottom-3 h-10 w-10 rounded-xl bg-burgundy text-white flex items-center justify-center hover:bg-burgundy-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
          <p className="text-[11px] text-muted text-center mt-2 max-w-3xl mx-auto">
            AI может ошибаться. Для важных вопросов проверяйте информацию в
            официальных источниках.
          </p>
        </div>
      </section>
    </div>
  );
}
