export type AcademicWeek = "1" | "2";
export type WeekdayKey = "1" | "2" | "3" | "4" | "5" | "6" | "7";

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  "1": "Понедельник",
  "2": "Вторник",
  "3": "Среда",
  "4": "Четверг",
  "5": "Пятница",
  "6": "Суббота",
  "7": "Воскресенье",
};

export function weekdayKeyOf(date: Date): WeekdayKey {
  const isoDay = ((date.getDay() + 6) % 7) + 1;
  return String(isoDay) as WeekdayKey;
}

export function weekdayLabel(key: WeekdayKey): string {
  return WEEKDAY_LABELS[key];
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysSinceMonday(date: Date) {
  const day = date.getDay();
  return (day + 6) % 7;
}

export function academicYearStart(year: number) {
  const sep1 = startOfDay(new Date(year, 8, 1));
  return addDays(sep1, -daysSinceMonday(sep1));
}

export function academicWeekNumber(date: Date) {
  const day = startOfDay(date);
  const academicYear = day.getMonth() < 8 ? day.getFullYear() - 1 : day.getFullYear();
  const start = academicYearStart(academicYear);
  const diff = Math.floor((day.getTime() - start.getTime()) / DAY_MS);
  return diff < 0 ? 1 : Math.floor(diff / 7) + 1;
}

export function academicWeekOf(date: Date): AcademicWeek {
  return academicWeekNumber(date) % 2 === 1 ? "1" : "2";
}

export function academicWeekCycle(anchor = new Date()) {
  const weekStart = addDays(startOfDay(anchor), -daysSinceMonday(anchor));
  const cycleStart = academicWeekOf(anchor) === "1" ? weekStart : addDays(weekStart, -7);
  const cycleEnd = addDays(cycleStart, 14);

  return {
    from: cycleStart,
    to: new Date(cycleEnd.getTime() - 1),
  };
}
