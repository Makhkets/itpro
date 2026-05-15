import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Accessibility, Clock, Map as MapIcon, MapPin, Route as RouteIcon } from "lucide-react";
import { buildingsApi, navigationApi } from "@/shared/api/modules";
import type { Building, CampusRoute } from "@/shared/api/types";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label, Select } from "@/shared/ui/input";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { cn } from "@/shared/lib/cn";

type BuildingPoint = Building & { x: number; y: number };

const ROUTE_TYPE_LABEL: Record<CampusRoute["routeType"], string> = {
  walking: "Пеший",
  indoor: "Внутри корпуса",
  accessible: "Доступная среда",
};

function collectBuildings(routes: CampusRoute[]) {
  const map = new Map<string, Building>();
  routes.forEach((route) => {
    if (route.fromBuilding) map.set(route.fromBuilding.id, route.fromBuilding);
    if (route.toBuilding) map.set(route.toBuilding.id, route.toBuilding);
  });
  return Array.from(map.values());
}

function buildPoints(buildings: Building[]): BuildingPoint[] {
  const geoBuildings = buildings.filter(
    (b) => typeof b.latitude === "number" && typeof b.longitude === "number",
  );
  const canUseGeo = geoBuildings.length >= 2;

  if (canUseGeo) {
    const lats = geoBuildings.map((b) => b.latitude as number);
    const lngs = geoBuildings.map((b) => b.longitude as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(0.000001, maxLat - minLat);
    const lngSpan = Math.max(0.000001, maxLng - minLng);

    return buildings.map((b, index) => {
      if (typeof b.latitude === "number" && typeof b.longitude === "number") {
        return {
          ...b,
          x: 12 + ((b.longitude - minLng) / lngSpan) * 76,
          y: 88 - ((b.latitude - minLat) / latSpan) * 76,
        };
      }
      const angle = (index / Math.max(1, buildings.length)) * Math.PI * 2;
      return { ...b, x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 26 };
    });
  }

  return buildings.map((b, index) => {
    const angle = (index / Math.max(1, buildings.length)) * Math.PI * 2 - Math.PI / 2;
    return {
      ...b,
      x: 50 + Math.cos(angle) * 34,
      y: 50 + Math.sin(angle) * 28,
    };
  });
}

export default function AdminNavigationPage() {
  const [fromBuildingId, setFromBuildingId] = useState("all");
  const [toBuildingId, setToBuildingId] = useState("all");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const routesQuery = useQuery({
    queryKey: ["routes", fromBuildingId, toBuildingId],
    queryFn: () =>
      navigationApi.routes({
        fromBuildingId: fromBuildingId === "all" ? undefined : fromBuildingId,
        toBuildingId: toBuildingId === "all" ? undefined : toBuildingId,
      }),
  });
  const buildingsQuery = useQuery({
    queryKey: ["buildings"],
    queryFn: () => buildingsApi.list(),
  });

  const routes = routesQuery.data ?? [];
  const buildings = useMemo(() => {
    const apiBuildings = buildingsQuery.data?.filter((b) => b.isActive) ?? [];
    return apiBuildings.length ? apiBuildings : collectBuildings(routes);
  }, [buildingsQuery.data, routes]);
  const points = useMemo(() => buildPoints(buildings), [buildings]);
  const pointById = useMemo(
    () => new Map(points.map((point) => [point.id, point])),
    [points],
  );
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  const loading = routesQuery.isLoading || buildingsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Управление"
        title="Маршруты между корпусами"
        subtitle="Цифровая карта кампуса, переходы, время в пути и доступность."
      />

      <Card className="p-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Откуда</Label>
            <Select
              value={fromBuildingId}
              onChange={(e) => {
                setFromBuildingId(e.target.value);
                setSelectedRouteId(null);
              }}
            >
              <option value="all">Все корпуса</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Куда</Label>
            <Select
              value={toBuildingId}
              onChange={(e) => {
                setToBuildingId(e.target.value);
                setSelectedRouteId(null);
              }}
            >
              <option value="all">Все корпуса</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {loading && <LoadingState rows={4} />}
      {!loading && !routes.length && (
        <EmptyState title="Маршрутов пока нет" icon={<MapIcon className="h-6 w-6" />} />
      )}

      {!loading && routes.length > 0 && (
        <div className="grid xl:grid-cols-[1.45fr_0.9fr] gap-5">
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-navy">Цифровая карта</h2>
                <p className="text-xs text-muted mt-1">
                  Точки берутся из координат корпуса, при их отсутствии строится MVP-схема.
                </p>
              </div>
              <Badge variant="info">{points.length} корп.</Badge>
            </div>

            <div className="relative aspect-[16/10] min-h-[360px] bg-[#eef3f6] overflow-hidden">
              <div className="absolute inset-0 bg-pattern-grid opacity-70" />
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="Карта маршрутов кампуса"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="routeShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodOpacity="0.25" />
                  </filter>
                </defs>

                {routes.map((route) => {
                  const from = pointById.get(route.fromBuildingId);
                  const to = pointById.get(route.toBuildingId);
                  if (!from || !to) return null;
                  const selected = selectedRoute?.id === route.id;
                  return (
                    <line
                      key={route.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={selected ? "#962237" : "#738195"}
                      strokeWidth={selected ? 1.2 : 0.6}
                      strokeLinecap="round"
                      strokeDasharray={route.routeType === "indoor" ? "2 1.6" : undefined}
                      opacity={selected ? 0.98 : 0.55}
                      filter={selected ? "url(#routeShadow)" : undefined}
                      onClick={() => setSelectedRouteId(route.id)}
                      className="cursor-pointer"
                    />
                  );
                })}

                {points.map((point) => {
                  const active =
                    selectedRoute?.fromBuildingId === point.id ||
                    selectedRoute?.toBuildingId === point.id;
                  return (
                    <g key={point.id}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={active ? 2.9 : 2.3}
                        fill={active ? "#962237" : "#171f33"}
                        stroke="#ffffff"
                        strokeWidth="0.9"
                        filter="url(#routeShadow)"
                      />
                      <text
                        x={point.x}
                        y={point.y - 4.2}
                        textAnchor="middle"
                        fontSize="3.1"
                        fontWeight="800"
                        fill="#171f33"
                        paintOrder="stroke"
                        stroke="#ffffff"
                        strokeWidth="0.9"
                      >
                        {point.code}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute left-4 bottom-4 flex flex-wrap gap-2">
                <Badge variant="navy">Корпус</Badge>
                <Badge variant="burgundy">Выбранный маршрут</Badge>
                <Badge variant="muted">Пунктир - переход внутри</Badge>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {selectedRoute && (
              <Card className="p-5 border-burgundy/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-burgundy">
                      Выбранный маршрут
                    </p>
                    <h3 className="font-display text-2xl text-navy mt-1">
                      {selectedRoute.fromBuilding?.code ?? "?"} {"->"}{" "}
                      {selectedRoute.toBuilding?.code ?? "?"}
                    </h3>
                  </div>
                  <Badge variant="burgundy">
                    {ROUTE_TYPE_LABEL[selectedRoute.routeType]}
                  </Badge>
                </div>
                {selectedRoute.title && (
                  <p className="font-medium text-navy mt-3">{selectedRoute.title}</p>
                )}
                <p className="text-sm text-navy-75 whitespace-pre-wrap mt-2">
                  {selectedRoute.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge variant="default">
                    <Clock className="h-3 w-3" />
                    {selectedRoute.estimatedMinutes} мин
                  </Badge>
                  {selectedRoute.distanceMeters && (
                    <Badge variant="default">{selectedRoute.distanceMeters} м</Badge>
                  )}
                  {selectedRoute.accessibilityNotes && (
                    <Badge variant="success">
                      <Accessibility className="h-3 w-3" />
                      доступно
                    </Badge>
                  )}
                </div>
                {selectedRoute.accessibilityNotes && (
                  <p className="text-xs text-muted mt-3">
                    {selectedRoute.accessibilityNotes}
                  </p>
                )}
              </Card>
            )}

            <div className="grid gap-3">
              {routes.map((r) => {
                const selected = selectedRoute?.id === r.id;
                return (
                  <Card
                    key={r.id}
                    className={cn(
                      "p-4 transition-all",
                      selected && "border-burgundy/50 shadow-card-hover",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedRouteId(r.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-display text-xl text-navy">
                          {r.fromBuilding?.code ?? "?"}
                        </div>
                        <RouteIcon className="h-4 w-4 text-burgundy shrink-0" />
                        <div className="font-display text-xl text-navy">
                          {r.toBuilding?.code ?? "?"}
                        </div>
                        <div className="ml-auto text-xs text-muted">
                          {r.estimatedMinutes} мин
                        </div>
                      </div>
                      <p className="text-sm text-navy-75 line-clamp-2 mt-2">
                        {r.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <Badge variant="muted">{ROUTE_TYPE_LABEL[r.routeType]}</Badge>
                        {r.distanceMeters && (
                          <Badge variant="default">{r.distanceMeters} м</Badge>
                        )}
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && points.length === 0 && (
        <Card className="p-6 text-sm text-muted flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Добавьте корпуса, чтобы карта смогла построить схему.
        </Card>
      )}
    </div>
  );
}
