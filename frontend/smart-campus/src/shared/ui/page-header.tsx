import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface Crumb {
  to?: string;
  label: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center text-xs text-muted gap-1">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {c.to ? (
            <Link to={c.to} className="hover:text-navy transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="text-navy">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-2",
        className,
      )}
    >
      <div className="space-y-2 min-w-0">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.18em] text-burgundy font-semibold">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl md:text-4xl text-navy leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function useAutoBreadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    label: decodeURIComponent(p),
    to: i === parts.length - 1 ? undefined : "/" + parts.slice(0, i + 1).join("/"),
  }));
}
