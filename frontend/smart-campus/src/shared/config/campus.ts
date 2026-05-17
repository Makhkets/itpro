export type CampusBuildingKind =
  | "main"
  | "academic"
  | "dormitory"
  | "sport"
  | "service";

export interface CampusBuilding {
  id: string;
  code: string;
  name: string;
  shortName: string;
  kind: CampusBuildingKind;
  address: string;
  description: string;
  coords: [number, number];
  yearBuilt?: number;
  floors?: number;
  rooms?: number;
  highlights?: string[];
  photoUrl?: string;
}

// Координаты выверены по OpenStreetMap для города Грозный.
// Главный кампус — пр. Х. А. Исаева, 100.
// Учебный корпус №1 — ул. им. А. Г. Авторханова, 14/53.
export const GGNTU_BUILDINGS: CampusBuilding[] = [
  {
    id: "main",
    code: "ГК",
    name: "Главный кампус ГГНТУ",
    shortName: "Главный кампус",
    kind: "main",
    address: "пр-т Х. А. Исаева, 100, Грозный",
    description:
      "Сердце университета: ректорат, центральная библиотека, мультимедийные аудитории и пространства для коворкинга.",
    coords: [43.31265, 45.69156],
    yearBuilt: 2017,
    floors: 7,
    rooms: 180,
    highlights: ["Ректорат", "Центральная библиотека", "Конференц-зал", "Коворкинги"],
  },
  {
    id: "corpus-1",
    code: "К1",
    name: "Учебный корпус №1",
    shortName: "Корпус №1",
    kind: "academic",
    address: "ул. им. А. Г. Авторханова, 14/53, Грозный",
    description:
      "Учебный корпус с лекционными аудиториями, лабораториями и факультетскими деканатами.",
    coords: [43.31797, 45.6889],
    yearBuilt: 1972,
    floors: 5,
    rooms: 96,
    highlights: ["Лекционные залы", "Лаборатории", "Деканаты", "Кафедры"],
  },
];

export const GGNTU_CAMPUS_CENTER: [number, number] = [43.3153, 45.6902];

export const KIND_META: Record<
  CampusBuildingKind,
  { label: string; color: string; ring: string }
> = {
  main: {
    label: "Главный кампус",
    color: "#962237",
    ring: "ring-burgundy/30",
  },
  academic: {
    label: "Учебный корпус",
    color: "#171f33",
    ring: "ring-navy/30",
  },
  dormitory: {
    label: "Общежитие",
    color: "#2563eb",
    ring: "ring-blue-300",
  },
  sport: {
    label: "Спортивный",
    color: "#16794c",
    ring: "ring-emerald-300",
  },
  service: {
    label: "Сервис",
    color: "#b7791f",
    ring: "ring-amber-300",
  },
};

export function haversineMeters(
  a: [number, number],
  b: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.round(meters / 10) * 10} м`;
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} км`;
}

export function walkingMinutes(meters: number): number {
  // Средняя скорость пешехода ~ 80 м/мин
  return Math.max(1, Math.round(meters / 80));
}
