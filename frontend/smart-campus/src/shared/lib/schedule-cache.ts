import type { Schedule } from "@/shared/api/types";

const PREFIX = "smartcampus:schedule:v1:";
const LAST_KEY = "smartcampus:schedule:last";

export interface ScheduleCacheKey {
  scheduleType: "classes" | "exams";
  searchMode: "group" | "teacher";
  query: string;
}

export interface ScheduleCacheEntry {
  key: ScheduleCacheKey;
  savedAt: string;
  items: Schedule[];
}

function storageKey(k: ScheduleCacheKey) {
  return `${PREFIX}${k.scheduleType}:${k.searchMode}:${k.query.toLowerCase().trim()}`;
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — игнорируем
  }
}

export function saveScheduleCache(key: ScheduleCacheKey, items: Schedule[]) {
  if (!key.query.trim() || !items?.length) return;
  const entry: ScheduleCacheEntry = {
    key,
    savedAt: new Date().toISOString(),
    items,
  };
  safeWrite(storageKey(key), entry);
  safeWrite(LAST_KEY, key);
}

export function readScheduleCache(key: ScheduleCacheKey): ScheduleCacheEntry | null {
  if (!key.query.trim()) return null;
  return safeRead<ScheduleCacheEntry>(storageKey(key));
}

export function readLastScheduleCache(): ScheduleCacheEntry | null {
  const last = safeRead<ScheduleCacheKey>(LAST_KEY);
  if (!last) return null;
  return readScheduleCache(last);
}

export function clearScheduleCache(key: ScheduleCacheKey) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}
