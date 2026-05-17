import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Download } from "lucide-react";
import {
  edmsApi,
  EDMS_STATUS_LABEL,
  type EDMSDocumentStatus,
  type EDMSListFilter,
} from "@/shared/api/edms";
import { PageHeader } from "@/shared/ui/page-header";
import { Tabs } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { DocumentList } from "./DocumentList";
import { toast } from "sonner";

type Tab = "all" | EDMSDocumentStatus;

export default function EDMSRegistryPage() {
  const [status, setStatus] = useState<Tab>("all");

  // Pull counts for tabs labels
  const counts = useQuery({
    queryKey: ["edms", "registry-counts"],
    queryFn: () => edmsApi.analytics(),
  });

  const filter: EDMSListFilter =
    status === "all" ? {} : { status: status as EDMSDocumentStatus };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ЭДО"
        title={
          <span className="inline-flex items-center gap-3">
            <Database className="h-7 w-7 text-burgundy" />
            Реестр документов
          </span>
        }
        subtitle="Юридически значимая база всех документов с поиском, фильтрами и экспортом."
        actions={
          <Button
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => toast.success("Экспорт реестра подготовлен (демо)")}
          >
            Экспорт CSV
          </Button>
        }
      />

      <Tabs
        items={[
          { key: "all", label: "Все", count: counts.data?.totalDocuments },
          {
            key: "on_review",
            label: EDMS_STATUS_LABEL.on_review,
            count: counts.data?.byStatus.on_review,
          },
          {
            key: "approved",
            label: EDMS_STATUS_LABEL.approved,
            count: counts.data?.byStatus.approved,
          },
          {
            key: "signed",
            label: EDMS_STATUS_LABEL.signed,
            count: counts.data?.byStatus.signed,
          },
          {
            key: "rejected",
            label: EDMS_STATUS_LABEL.rejected,
            count: counts.data?.byStatus.rejected,
          },
          {
            key: "archived",
            label: EDMS_STATUS_LABEL.archived,
            count: counts.data?.byStatus.archived,
          },
        ]}
        value={status}
        onChange={(k) => setStatus(k as Tab)}
      />

      <DocumentList
        key={status}
        baseFilter={filter}
        emptyTitle="Нет документов в этой категории"
      />
    </div>
  );
}
