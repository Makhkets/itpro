import { useQuery } from "@tanstack/react-query";
import { Landmark, Building2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { isuApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { LoadingState, ErrorState, EmptyState } from "@/shared/ui/states";
import type { ISUInstitute } from "@/shared/api/types";

export default function InstitutesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["isu", "institutes"],
    queryFn: isuApi.institutes,
  });

  const institutes = (data ?? []).filter((i) => i.unit === "inst");
  const adminUnits = (data ?? []).filter((i) => i.unit === "admin");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Университет"
        title="Институты и подразделения"
        subtitle="Структура ГГНТУ — институты и административные подразделения из ИСУ."
      />

      {isLoading && <LoadingState rows={4} />}
      {isError && (
        <ErrorState
          message="Не удалось загрузить данные из ИСУ"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && institutes.length === 0 && adminUnits.length === 0 && (
        <EmptyState
          title="Нет данных"
          icon={<Landmark className="h-6 w-6" />}
          description="Не удалось получить список институтов."
        />
      )}

      {institutes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl text-navy">Институты и факультеты</span>
            <span className="h-px flex-1 bg-border" />
            <Badge variant="muted">{institutes.length}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {institutes.map((inst, idx) => (
              <InstituteCard key={inst.id} inst={inst} index={idx} />
            ))}
          </div>
        </section>
      )}

      {adminUnits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl text-navy">Административные подразделения</span>
            <span className="h-px flex-1 bg-border" />
            <Badge variant="muted">{adminUnits.length}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {adminUnits.map((inst, idx) => (
              <InstituteCard key={inst.id} inst={inst} index={idx} isAdmin />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InstituteCard({ inst, index, isAdmin }: { inst: ISUInstitute; index: number; isAdmin?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-burgundy/10 flex items-center justify-center">
          {isAdmin ? (
            <Users className="h-5 w-5 text-burgundy" />
          ) : (
            <Building2 className="h-5 w-5 text-burgundy" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-navy capitalize leading-tight">
            {inst.name}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isAdmin ? "muted" : "info"}>
              {isAdmin ? "Подразделение" : "Институт"}
            </Badge>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
