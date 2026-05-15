import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { notificationsApi } from "@/shared/api/modules";
import { useAuth } from "@/features/auth/store";
import { ROLE_LABEL } from "@/shared/lib/role";
import { fmtRelative } from "@/shared/lib/date";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);
  const [query, setQuery] = useState("");

  const queryClient = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ["notifications", { limit: 10 }],
    queryFn: () => notificationsApi.list({ pageSize: 10 }),
    refetchInterval: 60_000,
  });
  const unread = notifications?.filter((n) => !n.isRead).length ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.read(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const readAll = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 glass border-b border-border flex items-center px-4 md:px-6 gap-3">
      <button
        className="lg:hidden h-10 w-10 rounded-xl hover:bg-navy/5 flex items-center justify-center"
        onClick={onMenuClick}
        aria-label="Меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form
        className="flex-1 max-w-xl relative"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) navigate(`/rooms?q=${encodeURIComponent(query)}`);
        }}
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Найти аудиторию, преподавателя, книгу…"
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-subtle border border-transparent text-sm placeholder:text-navy-50 focus:bg-white focus:border-border focus:shadow-glow focus:outline-none transition-all"
        />
      </form>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="relative h-10 w-10 rounded-xl hover:bg-navy/5 flex items-center justify-center"
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5 text-navy" />
            {unread > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-burgundy ring-2 ring-white" />
            )}
          </button>
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 top-12 w-[360px] max-w-[92vw] bg-white rounded-2xl border border-border shadow-card-hover overflow-hidden"
              >
                <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                  <div>
                    <p className="font-semibold text-sm text-navy">Уведомления</p>
                    <p className="text-[11px] text-muted">{unread} непрочитанных</p>
                  </div>
                  {unread > 0 && (
                    <button
                      onClick={() => readAll.mutate()}
                      className="text-xs text-burgundy font-medium hover:underline"
                    >
                      Отметить все
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!notifications?.length && (
                    <div className="p-6 text-center text-sm text-muted">
                      Пока ничего нового
                    </div>
                  )}
                  {notifications?.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) markRead.mutate(n.id);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-surface-subtle transition-colors",
                        !n.isRead && "bg-burgundy-light/40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-burgundy shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-navy truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-muted line-clamp-2 mt-0.5">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-navy-50 mt-1">
                            {fmtRelative(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-3 border-t border-border bg-surface-subtle">
                  <Link
                    to="/notifications"
                    onClick={() => setBellOpen(false)}
                    className="block text-center text-sm font-medium text-burgundy hover:underline"
                  >
                    Все уведомления →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link
          to="/profile"
          className="hidden sm:flex items-center gap-3 pl-2 pr-3 h-10 rounded-xl hover:bg-navy/5 transition-colors"
        >
          <div className="h-8 w-8 rounded-lg bg-navy text-white flex items-center justify-center text-sm font-semibold">
            {user?.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 hidden md:block leading-tight">
            <div className="text-sm font-medium text-navy truncate max-w-[140px]">
              {user?.fullName}
            </div>
            <div className="text-[10px]">
              {user && (
                <Badge variant="burgundy" className="!py-0 !px-1.5">
                  {ROLE_LABEL[user.role]}
                </Badge>
              )}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
