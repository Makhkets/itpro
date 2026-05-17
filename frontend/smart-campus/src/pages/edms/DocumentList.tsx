import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, FileText, ArrowRight, Plus } from "lucide-react";
import {
  edmsApi,
  EDMS_CATEGORY_LABEL,
  EDMS_DIRECTION_LABEL,
  EDMS_TYPE_LABEL,
  type EDMSDocument,
  type EDMSListFilter,
} from "@/shared/api/edms";
import { Card } from "@/shared/ui/card";
import { Input, Select } from "@/shared/ui/input";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { Button } from "@/shared/ui/button";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import { EDMSStatusBadge, EDMSTypeBadge, EDMSPriorityBadge } from "./edms-ui";

export function DocumentList({
  baseFilter,
  emptyTitle,
  emptyDescription,
  showCreateCTA = true,
}: {
  baseFilter: EDMSListFilter;
  emptyTitle: string;
  emptyDescription?: string;
  showCreateCTA?: boolean;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [direction, setDirection] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filter: EDMSListFilter = {
    ...baseFilter,
    q: q || undefined,
    type: type || undefined,
    category: category || undefined,
    direction: (direction || undefined) as EDMSListFilter["direction"],
    pageSize: 30,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["edms", "documents", filter],
    queryFn: () => edmsApi.list(filter),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Поиск по названию, регномеру, автору…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Фильтры
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Любой тип</option>
              {Object.entries(EDMS_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Все категории</option>
              {Object.entries(EDMS_CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="">Любое направление</option>
              {Object.entries(EDMS_DIRECTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      {isLoading && <LoadingState rows={5} />}
      {!isLoading && !data?.items.length && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={<FileText className="h-6 w-6" />}
          action={
            showCreateCTA ? (
              <Link to="/edms/new">
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                  Создать документ
                </Button>
              </Link>
            ) : null
          }
        />
      )}

      <div className="grid gap-3">
        {data?.items.map((d) => (
          <DocCard key={d.id} doc={d} />
        ))}
      </div>

      {data && data.total > 0 && (
        <div className="text-xs text-muted text-center pt-2">
          Показано {data.items.length} из {data.total}
        </div>
      )}
    </div>
  );
}

function DocCard({ doc }: { doc: EDMSDocument }) {
  const isOverdue =
    !!doc.dueAt &&
    new Date(doc.dueAt) < new Date() &&
    !["signed", "archived", "cancelled"].includes(doc.status);

  return (
    <Link to={`/edms/documents/${doc.id}`}>
      <Card className="p-5 hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-burgundy-light text-burgundy items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <EDMSStatusBadge status={doc.status} />
              {doc.priority !== "normal" && doc.priority !== "low" && (
                <EDMSPriorityBadge priority={doc.priority} />
              )}
              {isOverdue && (
                <span className="text-[10px] uppercase font-semibold text-accent-red bg-accent-red-light px-2 py-0.5 rounded-full">
                  Просрочен SLA
                </span>
              )}
              <span className="text-[11px] text-muted ml-auto">
                {doc.regNumber}
              </span>
            </div>
            <h3 className="font-display text-lg text-navy mt-1.5 leading-snug">
              {doc.title}
            </h3>
            {doc.description && (
              <p className="text-sm text-muted line-clamp-1 mt-1">
                {doc.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-muted">
              <EDMSTypeBadge type={doc.type} />
              <span>·</span>
              <span>
                {EDMS_CATEGORY_LABEL[doc.category] ?? doc.category}
              </span>
              <span>·</span>
              <span>
                {doc.author.fullName} ({doc.author.position ?? doc.author.role})
              </span>
              <span>·</span>
              <span>
                {fmtDate(doc.updatedAt, "d MMM yyyy")} {fmtTime(doc.updatedAt)}
              </span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted shrink-0 mt-1.5" />
        </div>
      </Card>
    </Link>
  );
}
