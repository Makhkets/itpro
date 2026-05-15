import { cn } from "@/shared/lib/cn";

export function Wordmark({
  variant = "dark",
  size = "md",
}: {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
}) {
  const onDark = variant === "dark";
  const sizes = {
    sm: { wrap: "gap-2", a: "h-8 w-8", title: "text-sm", sub: "text-[10px]" },
    md: { wrap: "gap-3", a: "h-10 w-10", title: "text-base", sub: "text-[11px]" },
    lg: { wrap: "gap-3", a: "h-12 w-12", title: "text-lg", sub: "text-xs" },
  }[size];
  return (
    <div className={cn("flex items-center", sizes.wrap)}>
      <div
        className={cn(
          "relative rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
          sizes.a,
          onDark ? "bg-white/10 ring-1 ring-white/20" : "bg-navy",
        )}
      >
        <span
          className={cn(
            "font-display font-bold leading-none",
            onDark ? "text-white" : "text-white",
            size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-sm",
          )}
        >
          Г
        </span>
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-accent-red" />
      </div>
      <div className="min-w-0 leading-tight">
        <div
          className={cn(
            "font-display font-semibold tracking-tight",
            sizes.title,
            onDark ? "text-white" : "text-navy",
          )}
        >
          SmartCampus
        </div>
        <div
          className={cn(
            "uppercase tracking-[0.18em] font-medium",
            sizes.sub,
            onDark ? "text-white/60" : "text-muted",
          )}
        >
          ГГНТУ · им. М.Д. Миллионщикова
        </div>
      </div>
    </div>
  );
}
