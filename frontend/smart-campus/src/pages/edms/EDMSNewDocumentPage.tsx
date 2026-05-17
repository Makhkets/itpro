import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Send,
  Sparkles,
  GitBranch,
  Save,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  edmsApi,
  EDMS_CATEGORY_LABEL,
  type EDMSTemplate,
  type EDMSDocumentType,
  type EDMSPriority,
  type EDMSCreateDocumentInput,
} from "@/shared/api/edms";
import { extractError } from "@/shared/api/client";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input, Textarea, Select, Label } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { LoadingState } from "@/shared/ui/states";
import { TemplateIcon } from "./edms-ui";

type Step = "template" | "fill" | "route";

const TYPE_OPTIONS: { value: EDMSDocumentType; label: string }[] = [
  { value: "statement", label: "Заявление" },
  { value: "application", label: "Заявка" },
  { value: "memo", label: "Служебная записка" },
  { value: "reference", label: "Запрос справки" },
  { value: "order", label: "Приказ" },
  { value: "contract", label: "Договор" },
  { value: "report", label: "Отчёт" },
];

export default function EDMSNewDocumentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search] = useSearchParams();
  const initialTemplateId = search.get("template") ?? "";

  const [step, setStep] = useState<Step>(initialTemplateId ? "fill" : "template");
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EDMSDocumentType>("statement");
  const [priority, setPriority] = useState<EDMSPriority>("normal");
  const [fields, setFields] = useState<Record<string, string>>({});

  const templatesQ = useQuery({
    queryKey: ["edms", "templates"],
    queryFn: () => edmsApi.templates(),
  });
  const templates = templatesQ.data ?? [];
  const selectedTemplate: EDMSTemplate | undefined = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  const routeQ = useQuery({
    queryKey: ["edms", "route", selectedTemplate?.routeId],
    queryFn: () => edmsApi.route(selectedTemplate!.routeId),
    enabled: !!selectedTemplate?.routeId,
  });

  // Префилл из шаблона
  useEffect(() => {
    if (selectedTemplate && !title) {
      setTitle(selectedTemplate.title);
    }
  }, [selectedTemplate, title]);

  const create = useMutation({
    mutationFn: (submit: boolean) => {
      const input: EDMSCreateDocumentInput = {
        title,
        description,
        type,
        priority,
        category: selectedTemplate?.category ?? "general",
        templateId: selectedTemplate?.id,
        routeId: selectedTemplate?.routeId,
        body: renderTemplateBody(selectedTemplate?.body, fields),
        fields,
        submit,
      };
      return edmsApi.create(input);
    },
    onSuccess: (doc, submit) => {
      toast.success(
        submit
          ? "Документ направлен на согласование"
          : "Черновик документа сохранён",
      );
      qc.invalidateQueries({ queryKey: ["edms"] });
      navigate(`/edms/documents/${doc.id}`);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const fieldsValid =
    !selectedTemplate ||
    selectedTemplate.fields
      .filter((f) => f.required)
      .every((f) => (fields[f.key] ?? "").trim() !== "");

  return (
    <div className="space-y-6">
      <Link
        to="/edms"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />К рабочему столу ЭДО
      </Link>

      <PageHeader
        eyebrow="Новый документ"
        title="Создать документ в ЭДО"
        subtitle="Подберите шаблон, заполните форму и отправьте на согласование. Маршрут запустится автоматически."
      />

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {(["template", "fill", "route"] as Step[]).map((s, i, arr) => {
          const active = step === s;
          const passed =
            arr.indexOf(step) > i || (arr.indexOf(step) === i && i < 2);
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-7 px-3 rounded-full flex items-center gap-2 ${
                  active
                    ? "bg-navy text-white"
                    : passed
                    ? "bg-burgundy-light text-burgundy"
                    : "bg-navy/5 text-muted"
                }`}
              >
                <span className="font-medium">{i + 1}</span>
                <span>
                  {s === "template"
                    ? "Шаблон"
                    : s === "fill"
                    ? "Заполнение"
                    : "Маршрут"}
                </span>
              </div>
              {i < arr.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted" />
              )}
            </div>
          );
        })}
      </div>

      {step === "template" && (
        <div className="space-y-4">
          {templatesQ.isLoading && <LoadingState rows={3} />}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Card
              className={`p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover transition-all ${
                templateId === "" ? "ring-2 ring-burgundy" : ""
              }`}
              onClick={() => {
                setTemplateId("");
                setTitle("");
                setStep("fill");
              }}
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-navy text-white flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <Badge variant="muted">С нуля</Badge>
                  <h3 className="font-display text-base text-navy mt-2">
                    Пустой документ
                  </h3>
                  <p className="text-xs text-muted mt-1.5">
                    Сами укажете тему, текст и маршрут.
                  </p>
                </div>
              </div>
            </Card>
            {templates.map((t) => (
              <Card
                key={t.id}
                className={`p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover transition-all ${
                  templateId === t.id ? "ring-2 ring-burgundy" : ""
                }`}
                onClick={() => {
                  setTemplateId(t.id);
                  setTitle(t.title);
                  setFields({});
                  setStep("fill");
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark text-white flex items-center justify-center shrink-0">
                    <TemplateIcon name={t.icon} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="muted">{t.code}</Badge>
                      <span className="text-[11px] text-muted">
                        {EDMS_CATEGORY_LABEL[t.category] ?? t.category}
                      </span>
                    </div>
                    <h3 className="font-display text-base text-navy mt-2 leading-snug">
                      {t.title}
                    </h3>
                    <p className="text-xs text-muted mt-1.5 line-clamp-2">
                      {t.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === "fill" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-6 space-y-4">
            <h2 className="font-display text-xl text-navy">Основные сведения</h2>
            <div>
              <Label required>Заголовок</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Заявление на акад. отпуск"
              />
            </div>
            <div>
              <Label>Краткое описание</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="1-2 предложения по сути обращения"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Тип документа</Label>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as EDMSDocumentType)}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Приоритет</Label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as EDMSPriority)}
                >
                  <option value="low">Низкий</option>
                  <option value="normal">Обычный</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Срочно</option>
                </Select>
              </div>
            </div>

            {selectedTemplate && selectedTemplate.fields.length > 0 && (
              <>
                <div className="pt-3 border-t border-border">
                  <h3 className="font-display text-base text-navy inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-burgundy" />
                    Поля шаблона «{selectedTemplate.title}»
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {selectedTemplate.fields.map((f) => (
                    <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                      <Label required={f.required}>{f.label}</Label>
                      {f.type === "textarea" ? (
                        <Textarea
                          value={fields[f.key] ?? ""}
                          onChange={(e) =>
                            setFields({ ...fields, [f.key]: e.target.value })
                          }
                          placeholder={f.placeholder}
                        />
                      ) : f.type === "select" ? (
                        <Select
                          value={fields[f.key] ?? ""}
                          onChange={(e) =>
                            setFields({ ...fields, [f.key]: e.target.value })
                          }
                        >
                          <option value="">— Выберите —</option>
                          {f.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                          value={fields[f.key] ?? ""}
                          onChange={(e) =>
                            setFields({ ...fields, [f.key]: e.target.value })
                          }
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
              <Button
                variant="secondary"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setStep("template")}
              >
                К шаблонам
              </Button>
              <div className="flex-1" />
              <Button
                variant="secondary"
                leftIcon={<Save className="h-4 w-4" />}
                disabled={!title || !fieldsValid}
                loading={create.isPending}
                onClick={() => create.mutate(false)}
              >
                Сохранить черновик
              </Button>
              <Button
                variant="primary"
                rightIcon={<Send className="h-4 w-4" />}
                disabled={!title || !fieldsValid || !selectedTemplate?.routeId}
                loading={create.isPending}
                onClick={() => create.mutate(true)}
              >
                Отправить на согласование
              </Button>
            </div>
          </Card>

          {/* Маршрут / превью */}
          <Card className="p-6">
            <h3 className="font-display text-lg text-navy inline-flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-burgundy" />
              Маршрут согласования
            </h3>
            {!selectedTemplate?.routeId && (
              <p className="text-sm text-muted mt-3">
                Маршрут будет задан после выбора шаблона. Без маршрута документ
                сохраняется как черновик.
              </p>
            )}
            {selectedTemplate && routeQ.data && (
              <>
                <div className="mt-3 text-sm text-navy-75">
                  {routeQ.data.description}
                </div>
                <ol className="mt-4 space-y-2">
                  {routeQ.data.steps.map((s) => (
                    <li
                      key={s.order}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface-subtle border border-border"
                    >
                      <div className="h-7 w-7 rounded-full bg-burgundy text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {s.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-navy truncate">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-muted inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          SLA {s.slaHours} ч
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 p-3 rounded-xl bg-burgundy-light/50 text-xs text-burgundy">
                  Среднее время цикла маршрута: ~{routeQ.data.avgHours} ч.
                  Использовался {routeQ.data.usageCount} раз.
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function renderTemplateBody(
  body: string | undefined,
  fields: Record<string, string>,
): string {
  if (!body) return "";
  return body.replace(/{{(\w+)}}/g, (_, key) => fields[key] ?? `{{${key}}}`);
}

