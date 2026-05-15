import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import { ru } from "date-fns/locale";

export function fmtDate(iso?: string | null, pattern = "d MMM yyyy") {
  if (!iso) return "—";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  if (!isValid(d)) return "—";
  return format(d, pattern, { locale: ru });
}

export function fmtTime(iso?: string | null) {
  return fmtDate(iso, "HH:mm");
}

export function fmtDateTime(iso?: string | null) {
  return fmtDate(iso, "d MMM, HH:mm");
}

export function fmtRelative(iso?: string | null) {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true, locale: ru });
}

export function weekdayShort(iso?: string | null) {
  return fmtDate(iso, "EE");
}
