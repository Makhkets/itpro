import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  Compass,
  Copy,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  Navigation as NavigationIcon,
  Route,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import {
  type CampusBuilding,
  type CampusBuildingKind,
  GGNTU_BUILDINGS,
  GGNTU_CAMPUS_CENTER,
  KIND_META,
  formatDistance,
  haversineMeters,
  walkingMinutes,
} from "@/shared/config/campus";
import { cn } from "@/shared/lib/cn";
import "./campus-map.css";

type TileStyle = "light" | "dark";

const TILES: Record<TileStyle, { url: string; attribution: string }> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

function buildPinIcon(building: CampusBuilding, isActive: boolean) {
  const color = KIND_META[building.kind].color;
  const scale = isActive ? 1.05 : 1;
  const html = `
    <div class="ggntu-pin" style="--pin: ${color}; transform: scale(${scale});">
      <div class="ggntu-pin__pulse"></div>
      <div class="ggntu-pin__body">
        <span>${building.code}</span>
      </div>
      <div class="ggntu-pin__shadow"></div>
    </div>
  `;
  return L.divIcon({
    className: "ggntu-pin-wrapper",
    html,
    iconSize: [48, 60],
    iconAnchor: [24, 56],
    popupAnchor: [0, -52],
  });
}

export default function CampusMapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);

  const [activeId, setActiveId] = useState<string>(GGNTU_BUILDINGS[0].id);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<CampusBuildingKind | "all">(
    "all",
  );
  const [tileStyle, setTileStyle] = useState<TileStyle>("light");
  const [routeMode, setRouteMode] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GGNTU_BUILDINGS.filter((b) => {
      if (kindFilter !== "all" && b.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q)
      );
    });
  }, [query, kindFilter]);

  const active = useMemo(
    () => GGNTU_BUILDINGS.find((b) => b.id === activeId) ?? GGNTU_BUILDINGS[0],
    [activeId],
  );

  const routeInfo = useMemo(() => {
    if (GGNTU_BUILDINGS.length < 2) return null;
    const a = GGNTU_BUILDINGS[0];
    const b = GGNTU_BUILDINGS[1];
    const meters = haversineMeters(a.coords, b.coords);
    return {
      meters,
      label: formatDistance(meters),
      minutes: walkingMinutes(meters),
      from: a,
      to: b,
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: GGNTU_CAMPUS_CENTER,
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tile = L.tileLayer(TILES.light.url, {
      attribution: TILES.light.attribution,
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tile;

    GGNTU_BUILDINGS.forEach((b) => {
      const marker = L.marker(b.coords, {
        icon: buildPinIcon(b, b.id === activeId),
        riseOnHover: true,
      }).addTo(map);
      marker.bindTooltip(
        `<div class="ggntu-tooltip"><strong>${b.shortName}</strong><br/><span>${b.address}</span></div>`,
        { direction: "top", offset: [0, -50], opacity: 1 },
      );
      marker.on("click", () => setActiveId(b.id));
      markersRef.current[b.id] = marker;
    });

    const bounds = L.latLngBounds(GGNTU_BUILDINGS.map((b) => b.coords));
    map.fitBounds(bounds.pad(0.45));

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      tileLayerRef.current = null;
      routeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Обновляем активный маркер
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const b = GGNTU_BUILDINGS.find((x) => x.id === id);
      if (!b) return;
      marker.setIcon(buildPinIcon(b, id === activeId));
    });
    const map = mapRef.current;
    const marker = markersRef.current[activeId];
    if (map && marker) {
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 17), {
        duration: 0.8,
      });
    }
  }, [activeId]);

  // Переключение тайлов
  useEffect(() => {
    const map = mapRef.current;
    const layer = tileLayerRef.current;
    if (!map || !layer) return;
    const next = TILES[tileStyle];
    layer.setUrl(next.url);
  }, [tileStyle]);

  // Маршрут между корпусами
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }
    if (!routeMode || GGNTU_BUILDINGS.length < 2) return;
    const points = GGNTU_BUILDINGS.map((b) => b.coords) as L.LatLngExpression[];
    routeRef.current = L.polyline(points, {
      color: "#962237",
      weight: 4,
      opacity: 0.9,
      dashArray: "10 8",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    map.fitBounds(L.latLngBounds(points).pad(0.45));
  }, [routeMode]);

  function focusBuilding(id: string) {
    setActiveId(id);
  }

  function fitAll() {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(GGNTU_BUILDINGS.map((b) => b.coords));
    map.flyToBounds(bounds.pad(0.45), { duration: 0.6 });
  }

  function copyAddress() {
    navigator.clipboard
      .writeText(active.address)
      .then(() => toast.success("Адрес скопирован"))
      .catch(() => toast.error("Не удалось скопировать"));
  }

  function openYandex() {
    const [lat, lon] = active.coords;
    window.open(
      `https://yandex.ru/maps/?pt=${lon},${lat}&z=17&l=map&rtext=~${lat},${lon}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  function openGoogle() {
    const [lat, lon] = active.coords;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  function open2Gis() {
    const [lat, lon] = active.coords;
    window.open(
      `https://2gis.ru/geo/${lon}%2C${lat}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Цифровая карта"
        title="Кампус ГГНТУ на карте Грозного"
        subtitle="Главный кампус и учебные корпуса: интерактивная карта с маршрутами, контактами и подсказками."
        actions={
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Maximize2 className="h-4 w-4" />}
              onClick={fitAll}
            >
              Показать все
            </Button>
            <Button
              variant={routeMode ? "primary" : "outline"}
              size="sm"
              leftIcon={<Route className="h-4 w-4" />}
              onClick={() => setRouteMode((v) => !v)}
            >
              Маршрут между корпусами
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="space-y-3">
              <Input
                placeholder="Поиск по корпусу или адресу"
                leftIcon={<Search className="h-4 w-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={kindFilter === "all"}
                  onClick={() => setKindFilter("all")}
                >
                  Все
                </FilterChip>
                {(Object.keys(KIND_META) as CampusBuildingKind[])
                  .filter((k) =>
                    GGNTU_BUILDINGS.some((b) => b.kind === k),
                  )
                  .map((k) => (
                    <FilterChip
                      key={k}
                      active={kindFilter === k}
                      color={KIND_META[k].color}
                      onClick={() => setKindFilter(k)}
                    >
                      {KIND_META[k].label}
                    </FilterChip>
                  ))}
              </div>
            </div>
          </Card>

          <div className="space-y-2.5">
            {filtered.map((b) => (
              <BuildingListItem
                key={b.id}
                building={b}
                active={b.id === activeId}
                onClick={() => focusBuilding(b.id)}
              />
            ))}
            {filtered.length === 0 && (
              <Card className="p-6 text-sm text-muted text-center">
                По запросу ничего не найдено
              </Card>
            )}
          </div>

          {routeInfo && (
            <Card className="p-5 bg-gradient-to-br from-navy to-[#0f1422] text-white border-0 relative overflow-hidden">
              <div className="hero-lines" />
              <div className="relative space-y-3">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-burgundy" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/60 font-semibold">
                    Между корпусами
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl">
                    {routeInfo.label}
                  </span>
                  <span className="text-sm text-white/70">
                    ≈ {routeInfo.minutes} мин пешком
                  </span>
                </div>
                <div className="text-xs text-white/70">
                  {routeInfo.from.shortName} → {routeInfo.to.shortName}
                </div>
                <Button
                  size="sm"
                  variant={routeMode ? "outline" : "primary"}
                  className={cn(
                    "w-full",
                    routeMode &&
                      "bg-white/10 border-white/30 text-white hover:bg-white/15",
                  )}
                  leftIcon={<Route className="h-4 w-4" />}
                  onClick={() => setRouteMode((v) => !v)}
                >
                  {routeMode ? "Скрыть маршрут" : "Показать на карте"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Map column */}
        <div className="space-y-4">
          <Card className="relative overflow-hidden p-0">
            <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur shadow-card border border-border p-1">
              <button
                onClick={() => setTileStyle("light")}
                className={cn(
                  "h-8 px-3 text-xs rounded-lg font-medium transition-colors flex items-center gap-1.5",
                  tileStyle === "light"
                    ? "bg-navy text-white"
                    : "text-navy hover:bg-navy/5",
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Светлая
              </button>
              <button
                onClick={() => setTileStyle("dark")}
                className={cn(
                  "h-8 px-3 text-xs rounded-lg font-medium transition-colors flex items-center gap-1.5",
                  tileStyle === "dark"
                    ? "bg-navy text-white"
                    : "text-navy hover:bg-navy/5",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Тёмная
              </button>
            </div>

            <div
              ref={containerRef}
              className="ggntu-map h-[560px] lg:h-[640px] w-full"
              aria-label="Карта кампуса ГГНТУ"
            />
          </Card>

          <BuildingDetails
            building={active}
            onCopy={copyAddress}
            onYandex={openYandex}
            onGoogle={openGoogle}
            on2Gis={open2Gis}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-medium border transition-all",
        active
          ? "bg-navy text-white border-navy"
          : "bg-white text-navy border-border hover:border-navy/30",
      )}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </button>
  );
}

function BuildingListItem({
  building,
  active,
  onClick,
}: {
  building: CampusBuilding;
  active: boolean;
  onClick: () => void;
}) {
  const meta = KIND_META[building.kind];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border bg-surface-card p-4 transition-all",
        "hover:-translate-y-0.5 hover:shadow-card-hover",
        active
          ? "border-burgundy/60 ring-2 ring-burgundy/15 shadow-card-hover"
          : "border-border shadow-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-display text-base shrink-0"
          style={{ background: meta.color }}
        >
          {building.code}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base text-navy truncate">
              {building.shortName}
            </h3>
            {active && (
              <span className="text-[10px] uppercase tracking-wider text-burgundy font-bold">
                выбрано
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-[2px] shrink-0" />
            <span className="truncate">{building.address}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted">
            {building.floors !== undefined && (
              <span>{building.floors} этажей</span>
            )}
            {building.rooms !== undefined && (
              <>
                <span className="text-navy-25">·</span>
                <span>{building.rooms} ауд.</span>
              </>
            )}
            {building.yearBuilt && (
              <>
                <span className="text-navy-25">·</span>
                <span>с {building.yearBuilt}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function BuildingDetails({
  building,
  onCopy,
  onYandex,
  onGoogle,
  on2Gis,
}: {
  building: CampusBuilding;
  onCopy: () => void;
  onYandex: () => void;
  onGoogle: () => void;
  on2Gis: () => void;
}) {
  const meta = KIND_META[building.kind];
  return (
    <Card className="p-0 overflow-hidden">
      <div
        className="relative h-28 px-6 flex items-end pb-4"
        style={{
          background: `linear-gradient(135deg, ${meta.color} 0%, #171f33 110%)`,
        }}
      >
        <div className="hero-lines" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white font-display text-lg">
            {building.code}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/70 font-semibold">
              {meta.label}
            </div>
            <h2 className="font-display text-2xl text-white leading-tight">
              {building.name}
            </h2>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-burgundy mt-0.5 shrink-0" />
          <span className="text-navy-75">{building.address}</span>
        </div>

        <p className="text-sm text-navy-75 leading-relaxed">
          {building.description}
        </p>

        {building.highlights && building.highlights.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted mb-2 font-semibold">
              Что внутри
            </div>
            <div className="flex flex-wrap gap-1.5">
              {building.highlights.map((h) => (
                <Badge key={h} variant="muted">
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={<Building2 className="h-4 w-4" />}
            label="Этажей"
            value={building.floors ?? "—"}
          />
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Аудиторий"
            value={building.rooms ?? "—"}
          />
          <Stat
            icon={<Compass className="h-4 w-4" />}
            label="Год"
            value={building.yearBuilt ?? "—"}
          />
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Построить маршрут
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="navy"
              size="sm"
              leftIcon={<NavigationIcon className="h-4 w-4" />}
              onClick={onYandex}
              rightIcon={<ExternalLink className="h-3 w-3 opacity-70" />}
            >
              Яндекс
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<NavigationIcon className="h-4 w-4" />}
              onClick={onGoogle}
              rightIcon={<ExternalLink className="h-3 w-3 opacity-70" />}
            >
              Google
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<NavigationIcon className="h-4 w-4" />}
              onClick={on2Gis}
              rightIcon={<ExternalLink className="h-3 w-3 opacity-70" />}
            >
              2GIS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Copy className="h-4 w-4" />}
              onClick={onCopy}
            >
              Копировать
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-subtle border border-border p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted font-semibold">
        {icon}
        {label}
      </div>
      <div className="font-display text-xl text-navy mt-1">{value}</div>
    </div>
  );
}
