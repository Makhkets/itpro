import { Inbox } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { DocumentList } from "./DocumentList";

export default function EDMSInboxPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ЭДО"
        title={
          <span className="inline-flex items-center gap-3">
            <Inbox className="h-7 w-7 text-burgundy" />
            Входящие
          </span>
        }
        subtitle="Документы, ожидающие вашего решения как согласующего."
      />
      <DocumentList
        baseFilter={{ inbox: true }}
        emptyTitle="Входящих нет"
        emptyDescription="Все документы, которые шли через вас, рассмотрены."
        showCreateCTA={false}
      />
    </div>
  );
}
