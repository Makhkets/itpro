import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import type { BookingStatus, RoomType } from "@/shared/api/types";

type BadgeVariant =
  | "default"
  | "burgundy"
  | "navy"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-navy/5 text-navy",
  burgundy: "bg-burgundy-light text-burgundy",
  navy: "bg-navy text-white",
  success: "bg-[#E6F2EC] text-success",
  warning: "bg-[#FFF4E0] text-warning",
  danger: "bg-accent-red-light text-accent-red",
  info: "bg-[#E0EAFE] text-info",
  muted: "bg-navy/5 text-muted",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium leading-none",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  children,
}: {
  status: BookingStatus | "active" | "returned" | "overdue";
  children?: ReactNode;
}) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "warning", label: "Ожидает" },
    approved: { variant: "success", label: "Одобрено" },
    rejected: { variant: "danger", label: "Отклонено" },
    cancelled: { variant: "muted", label: "Отменено" },
    active: { variant: "info", label: "Активна" },
    returned: { variant: "success", label: "Возвращена" },
    overdue: { variant: "danger", label: "Просрочена" },
  };
  const cfg = map[status] ?? { variant: "default" as BadgeVariant, label: status };
  return (
    <Badge variant={cfg.variant}>
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
        aria-hidden
      />
      {children ?? cfg.label}
    </Badge>
  );
}

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  lecture: "Лекционная",
  computer_lab: "Компьютерный класс",
  coworking: "Коворкинг",
  meeting: "Переговорная",
  office: "Кабинет",
  library: "Библиотека",
  lab: "Лаборатория",
  other: "Прочее",
};

export function RoomTypeBadge({ type }: { type: RoomType }) {
  const variants: Record<RoomType, BadgeVariant> = {
    lecture: "burgundy",
    computer_lab: "info",
    coworking: "warning",
    meeting: "default",
    office: "muted",
    library: "success",
    lab: "danger",
    other: "muted",
  };
  return <Badge variant={variants[type]}>{ROOM_TYPE_LABEL[type]}</Badge>;
}
