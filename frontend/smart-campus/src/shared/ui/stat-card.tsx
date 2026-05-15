import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  icon?: ReactNode;
  tone?: "default" | "burgundy" | "navy" | "success";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-white border-border",
    burgundy:
      "bg-gradient-to-br from-burgundy to-burgundy-dark text-white border-transparent",
    navy: "bg-gradient-to-br from-navy via-[#1f2a47] to-navy-950 text-white border-transparent",
    success: "bg-[#E6F2EC] border-success/20",
  };
  const labelTone =
    tone === "burgundy" || tone === "navy"
      ? "text-white/70"
      : "text-muted";
  const valueTone =
    tone === "burgundy" || tone === "navy"
      ? "text-white"
      : "text-navy";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5",
        tones[tone],
        className,
      )}
    >
      {(tone === "burgundy" || tone === "navy") && (
        <div className="absolute inset-0 hero-lines opacity-60 pointer-events-none" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs uppercase tracking-wider font-medium", labelTone)}>
            {label}
          </p>
          <p
            className={cn(
              "mt-2 font-display text-3xl leading-none",
              valueTone,
            )}
          >
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                "mt-2 text-xs",
                tone === "burgundy" || tone === "navy"
                  ? "text-white/70"
                  : "text-muted",
              )}
            >
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              tone === "burgundy" || tone === "navy"
                ? "bg-white/10 text-white"
                : "bg-burgundy-light text-burgundy",
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
