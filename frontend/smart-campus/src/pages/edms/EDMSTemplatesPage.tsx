import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { edmsApi, EDMS_CATEGORY_LABEL } from "@/shared/api/edms";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { LoadingState, EmptyState } from "@/shared/ui/states";
import { Badge } from "@/shared/ui/badge";
import { TemplateIcon } from "./edms-ui";

export default function EDMSTemplatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["edms", "templates"],
    queryFn: () => edmsApi.templates(),
  });

  const groups = (data ?? []).reduce<Record<string, typeof data>>(
    (acc, t) => {
      acc[t.category] = acc[t.category] ?? [];
      acc[t.category]!.push(t);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Библиотека ЭДО"
        title={
          <span className="inline-flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-burgundy" />
            Шаблоны документов
          </span>
        }
        subtitle="Готовые формы с предзаданным маршрутом. Выберите шаблон — заполните поля — получите документ за минуту."
      />

      {isLoading && <LoadingState rows={4} />}
      {!isLoading && !data?.length && (
        <EmptyState title="Шаблонов пока нет" />
      )}

      <div className="space-y-8">
        {Object.entries(groups).map(([category, items]) => (
          <section key={category}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-xl text-navy">
                {EDMS_CATEGORY_LABEL[category] ?? category}
              </h2>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">{items?.length} шаблонов</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items?.map((t) => (
                <Link key={t.id} to={`/edms/new?template=${t.id}`}>
                  <Card className="p-5 h-full hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark text-white flex items-center justify-center shrink-0">
                        <TemplateIcon name={t.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="muted">{t.code}</Badge>
                          {t.popularity > 100 && (
                            <Badge variant="burgundy">
                              <Sparkles className="h-3 w-3" />
                              Популярный
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-display text-base text-navy mt-2 leading-snug">
                          {t.title}
                        </h3>
                        <p className="text-xs text-muted mt-1.5 line-clamp-2">
                          {t.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {t.fields.length} полей · {t.popularity} использований
                      </span>
                      <span className="text-burgundy inline-flex items-center gap-1 font-medium">
                        Заполнить
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
