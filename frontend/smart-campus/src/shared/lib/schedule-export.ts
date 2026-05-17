import type { Schedule } from "@/shared/api/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcs(value?: string | null) {
  if (!value) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string) {
  // RFC5545: строки не длиннее 75 октетов, перенос с пробелом
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return chunks.join("\r\n");
}

export function scheduleToIcs(items: Schedule[], calName = "Расписание ГГНТУ"): string {
  const now = toIcsDate(new Date().toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart Campus//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calName)}`,
  ];
  for (const s of items) {
    const dtStart = toIcsDate(s.startsAt);
    const dtEnd = toIcsDate(s.endsAt);
    if (!dtStart || !dtEnd) continue;
    const location = [s.roomNumber ? `ауд. ${s.roomNumber}` : "", s.room?.building, s.room?.floor != null ? `этаж ${s.room.floor}` : ""]
      .filter(Boolean)
      .join(", ");
    const descParts = [
      s.teacherName ? `Преподаватель: ${s.teacherName}` : "",
      s.groupName ? `Группа: ${s.groupName}` : "",
      s.source === "isu" ? "Источник: ИСУ ГГНТУ" : "",
    ].filter(Boolean);
    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:${s.id}@smartcampus.gstou`),
      `DTSTAMP:${now}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      foldLine(`SUMMARY:${escapeIcs(s.title)}`),
      foldLine(`DESCRIPTION:${escapeIcs(descParts.join("\n"))}`),
      foldLine(`LOCATION:${escapeIcs(location)}`),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_\-А-Яа-яЁё]+/g, "_").slice(0, 60) || "schedule";
}

export function downloadScheduleIcs(items: Schedule[], baseName: string) {
  const content = scheduleToIcs(items, `Расписание ${baseName}`);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  triggerDownload(blob, `${safeFilename(baseName)}.ics`);
}

export function downloadScheduleJson(items: Schedule[], baseName: string) {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  triggerDownload(blob, `${safeFilename(baseName)}.json`);
}
