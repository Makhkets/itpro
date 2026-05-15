import { useQuery } from "@tanstack/react-query";
import { BookOpen, BookOpenCheck, Layers, AlertTriangle } from "lucide-react";
import { analyticsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";
import { LoadingState } from "@/shared/ui/states";

export default function LibraryAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "library"],
    queryFn: () => analyticsApi.librarySummary(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Аналитика"
        title="Библиотека"
        subtitle="Сводка по фонду, выдачам и просрочкам."
      />

      {isLoading ? (
        <LoadingState rows={2} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            tone="navy"
            label="Книг в фонде"
            value={data?.totalBooks ?? 0}
            icon={<Layers className="h-5 w-5" />}
          />
          <StatCard
            tone="burgundy"
            label="Свободных экз."
            value={data?.availableCopies ?? 0}
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label="Активных выдач"
            value={data?.activeLoans ?? 0}
            icon={<BookOpenCheck className="h-5 w-5" />}
          />
          <StatCard
            label="Просрочено"
            value={data?.overdueLoans ?? 0}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>
      )}
    </div>
  );
}
