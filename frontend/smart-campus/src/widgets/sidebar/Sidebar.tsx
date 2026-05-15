import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/store";
import { getNavigation } from "@/shared/config/navigation";
import { Wordmark } from "@/shared/ui/wordmark";
import { ROLE_LABEL } from "@/shared/lib/role";

export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const groups = getNavigation(user.role);

  return (
    <aside className="h-full w-full bg-navy text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 hero-lines opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-burgundy/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-accent-red/10 blur-3xl pointer-events-none" />

      <div className="relative px-6 pt-6 pb-5 border-b border-white/10">
        <Wordmark variant="dark" size="md" />
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.22em] text-white/40 font-semibold">
              {g.title}
            </div>
            <ul className="space-y-1">
              {g.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-white text-navy shadow-sm"
                          : "text-white/70 hover:text-white hover:bg-white/5",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-burgundy" />
                        )}
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-burgundy" : "text-white/60 group-hover:text-white",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-burgundy text-white flex items-center justify-center font-semibold text-sm shrink-0">
            {user.fullName?.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.fullName}</div>
            <div className="text-[11px] text-white/50 truncate">
              {ROLE_LABEL[user.role]}
              {user.groupName ? ` · ${user.groupName}` : ""}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-white/80 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
