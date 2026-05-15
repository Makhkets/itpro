import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Map, Navigation } from "lucide-react";
import { navigationApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { LoadingState } from "@/shared/ui/states";
import { Badge } from "@/shared/ui/badge";

export default function NavigationPage() {
  const { roomId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["navigation", roomId],
    queryFn: () => navigationApi.room(roomId),
    enabled: !!roomId,
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Link
        to={`/rooms/${roomId}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> К аудитории
      </Link>

      <PageHeader
        eyebrow="Навигация"
        title={`Как добраться до ${data.room.number}`}
        subtitle={`${data.building.name} · этаж ${data.floor.number}`}
      />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card className="relative overflow-hidden">
          <div className="aspect-[4/3] bg-navy/5 relative">
            <div className="absolute inset-0 bg-pattern-grid" />
            {data.mapImageUrl ? (
              <img
                src={data.mapImageUrl}
                alt="План этажа"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 400 300"
                preserveAspectRatio="none"
              >
                <path
                  d="M40,260 L40,200 L160,200 L160,140 L260,140 L260,80 L360,80"
                  fill="none"
                  stroke="#962237"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />
                <circle cx="40" cy="260" r="6" fill="#171F33" />
                <text x="50" y="265" className="text-[10px]" fill="#171F33">
                  Вход
                </text>
                <circle cx="360" cy="80" r="8" fill="#962237" />
              </svg>
            )}
            {(typeof data.xCoord === "number" ||
              typeof data.yCoord === "number") && (
              <div
                className="absolute h-5 w-5 -ml-2.5 -mt-2.5"
                style={{
                  left: `${Math.min(95, Math.max(5, data.xCoord ?? 50))}%`,
                  top: `${Math.min(95, Math.max(5, data.yCoord ?? 50))}%`,
                }}
              >
                <div className="absolute inset-0 rounded-full bg-burgundy animate-ping opacity-70" />
                <div className="absolute inset-0 rounded-full bg-burgundy ring-2 ring-white" />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4 text-burgundy" />
              <h3 className="font-semibold text-navy">Маршрут</h3>
            </div>
            <p className="text-sm text-navy-75 whitespace-pre-wrap leading-relaxed">
              {data.navigationHint ??
                "От главного входа корпуса следуйте указателям к нужному этажу. Используйте лифт или лестницу справа от входа."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Badge variant="default">Корпус {data.building.code}</Badge>
              <Badge variant="default">Этаж {data.floor.number}</Badge>
            </div>
          </Card>

          {data.nearbyLandmarks && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Map className="h-4 w-4 text-burgundy" />
                <h3 className="font-semibold text-navy">Ориентиры</h3>
              </div>
              <p className="text-sm text-navy-75">{data.nearbyLandmarks}</p>
            </Card>
          )}

          {data.building.isOldBuilding && (
            <Card className="p-5 bg-warning/5 border-warning/30">
              <p className="text-xs text-warning font-semibold uppercase tracking-wider">
                Историческое здание
              </p>
              <p className="text-sm text-navy-75 mt-1">
                В этом корпусе могут быть нестандартная нумерация и переходы —
                заранее заложите дополнительное время.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
