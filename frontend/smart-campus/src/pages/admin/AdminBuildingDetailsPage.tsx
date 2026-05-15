import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Layers } from "lucide-react";
import { buildingsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";

export default function AdminBuildingDetailsPage() {
  const { id = "" } = useParams();
  const building = useQuery({
    queryKey: ["building", id],
    queryFn: () => buildingsApi.byId(id),
    enabled: !!id,
  });
  const floors = useQuery({
    queryKey: ["building", id, "floors"],
    queryFn: () => buildingsApi.floors(id),
    enabled: !!id,
  });

  if (building.isLoading || !building.data) return <LoadingState rows={4} />;
  const b = building.data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/buildings"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> К корпусам
      </Link>

      <PageHeader
        eyebrow={`Код: ${b.code}`}
        title={b.name}
        subtitle={b.address}
      />

      {b.description && (
        <Card className="p-6">
          <p className="text-sm text-navy-75 whitespace-pre-wrap">
            {b.description}
          </p>
        </Card>
      )}

      <Card>
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Layers className="h-4 w-4 text-burgundy" />
          <h3 className="font-semibold text-navy">Этажи</h3>
          <Badge variant="muted">{floors.data?.length ?? 0}</Badge>
        </div>
        <div className="divide-y divide-border">
          {floors.data?.map((f) => (
            <div key={f.id} className="px-6 py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-navy text-white flex items-center justify-center font-display">
                {f.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-navy">{f.name ?? `Этаж ${f.number}`}</div>
                {f.mapImageUrl && (
                  <div className="text-xs text-muted truncate">
                    План: {f.mapImageUrl}
                  </div>
                )}
              </div>
            </div>
          ))}
          {floors.data?.length === 0 && (
            <div className="p-8 text-sm text-muted text-center">
              Этажей пока не добавлено.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
