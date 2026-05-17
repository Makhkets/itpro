import { Send } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { DocumentList } from "./DocumentList";

export default function EDMSOutboxPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ЭДО"
        title={
          <span className="inline-flex items-center gap-3">
            <Send className="h-7 w-7 text-burgundy" />
            Мои документы
          </span>
        }
        subtitle="Документы, которые вы создали или отправили на согласование."
      />
      <DocumentList
        baseFilter={{ mine: true }}
        emptyTitle="Вы ещё не создали ни одного документа"
        emptyDescription="Создайте первый документ из шаблона или с чистого листа."
      />
    </div>
  );
}
