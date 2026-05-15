import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { LoadingState } from "@/shared/ui/states";

export default function AttendanceByGroupPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "attendance", "byGroup"],
    queryFn: () => analyticsApi.attendanceByGroup(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Аналитика"
        title="Посещаемость по группам"
        subtitle="Сводка по всем подопечным группам."
      />

      {isLoading ? (
        <LoadingState rows={5} />
      ) : (
        <Card className="p-6">
          <pre className="text-xs text-navy-75 whitespace-pre-wrap font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
