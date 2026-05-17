import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Ban,
  Check,
  Clock,
  Download,
  FileSignature,
  History,
  MessageSquare,
  Paperclip,
  Printer,
  Send,
  ShieldCheck,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  edmsApi,
  EDMS_CATEGORY_LABEL,
  EDMS_DIRECTION_LABEL,
  type EDMSApprovalStep,
  type EDMSSignature,
  type EDMSTimelineEvent,
} from "@/shared/api/edms";
import { extractError } from "@/shared/api/client";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { Label, Textarea } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { LoadingState, ErrorState } from "@/shared/ui/states";
import { fmtDate, fmtTime } from "@/shared/lib/date";
import { useAuth } from "@/features/auth/store";
import {
  EDMSStatusBadge,
  EDMSPriorityBadge,
  EDMSTypeBadge,
} from "./edms-ui";

type ActionType = "approve" | "reject" | "sign" | "cancel" | null;

export default function EDMSDocumentPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);

  const [action, setAction] = useState<ActionType>(null);
  const [comment, setComment] = useState("");
  const [newComment, setNewComment] = useState("");

  const { data: doc, isLoading, isError, refetch } = useQuery({
    queryKey: ["edms", "document", id],
    queryFn: () => edmsApi.get(id),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["edms"] });
  };

  const approve = useMutation({
    mutationFn: () => edmsApi.approve(id, comment),
    onSuccess: () => {
      toast.success("Согласовано");
      invalidate();
      setAction(null);
      setComment("");
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const reject = useMutation({
    mutationFn: () => edmsApi.reject(id, comment),
    onSuccess: () => {
      toast.success("Документ отклонён");
      invalidate();
      setAction(null);
      setComment("");
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const sign = useMutation({
    mutationFn: () => edmsApi.sign(id, "enhanced_qualified"),
    onSuccess: () => {
      toast.success("Документ подписан УКЭП");
      invalidate();
      setAction(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const cancel = useMutation({
    mutationFn: () => edmsApi.cancel(id),
    onSuccess: () => {
      toast.success("Документ отозван");
      invalidate();
      setAction(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const submit = useMutation({
    mutationFn: () => edmsApi.submit(id),
    onSuccess: () => {
      toast.success("Документ направлен на согласование");
      invalidate();
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const archive = useMutation({
    mutationFn: () => edmsApi.archive(id),
    onSuccess: () => {
      toast.success("Документ перемещён в архив");
      invalidate();
    },
    onError: (e) => toast.error(extractError(e)),
  });
  const addComment = useMutation({
    mutationFn: () => edmsApi.comment(id, newComment),
    onSuccess: () => {
      toast.success("Комментарий добавлен");
      invalidate();
      setNewComment("");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (isError || !doc)
    return <ErrorState message="Документ недоступен" onRetry={() => refetch()} />;

  const currentStep = doc.approvalRoute.find((s) => s.isCurrent);
  const isMyTurn =
    !!currentStep &&
    doc.status === "on_review" &&
    (currentStep.approver.id === user?.id ||
      currentStep.approver.role === user?.role ||
      user?.role === "admin");
  const isAuthor = doc.author.id === user?.id;
  const canSign =
    (doc.status === "approved" || doc.status === "on_review") &&
    (isMyTurn || user?.role === "admin");

  return (
    <div className="space-y-6">
      <Link
        to="/edms"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" />К ЭДО
      </Link>

      <PageHeader
        eyebrow={`${doc.regNumber} · ${EDMS_DIRECTION_LABEL[doc.direction]}`}
        title={doc.title}
        subtitle={doc.description}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Печать
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => toast.success("PDF подготовлен (демо)")}
            >
              PDF
            </Button>
            {doc.status === "draft" && isAuthor && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send className="h-4 w-4" />}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Отправить
              </Button>
            )}
          </div>
        }
      />

      {/* Статусная шапка */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <EDMSStatusBadge status={doc.status} />
          <EDMSPriorityBadge priority={doc.priority} />
          <EDMSTypeBadge type={doc.type} />
          <span className="text-xs text-muted">
            · {EDMS_CATEGORY_LABEL[doc.category] ?? doc.category}
          </span>
          {doc.tags.map((t) => (
            <Badge key={t} variant="muted">
              #{t}
            </Badge>
          ))}
          <div className="ml-auto text-xs text-muted">
            обновлено {fmtDate(doc.updatedAt, "d MMM yyyy")} {fmtTime(doc.updatedAt)}
          </div>
        </div>
      </Card>

      {/* Призыв к действию для согласующего */}
      {isMyTurn && (
        <div className="rounded-3xl bg-gradient-to-r from-burgundy to-burgundy-dark text-white p-5 md:p-6 flex flex-wrap items-center gap-4 shadow-glow">
          <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <div className="font-display text-lg leading-tight">
              Документ ждёт вашего решения
            </div>
            <div className="text-white/75 text-sm mt-0.5">
              Шаг «{currentStep!.approver.position ?? currentStep!.approver.role}»
              {currentStep!.slaHours
                ? ` · SLA ${currentStep!.slaHours} ч`
                : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="navy"
              size="md"
              leftIcon={<Check className="h-4 w-4" />}
              onClick={() => setAction("approve")}
            >
              Согласовать
            </Button>
            <Button
              variant="destructive"
              size="md"
              leftIcon={<X className="h-4 w-4" />}
              onClick={() => setAction("reject")}
            >
              Отклонить
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Левая колонка: тело + комментарии */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h3 className="font-display text-lg text-navy mb-3">
              Содержание
            </h3>
            <div className="whitespace-pre-wrap text-sm text-navy leading-relaxed">
              {doc.body || doc.description || "—"}
            </div>

            {Object.keys(doc.fields ?? {}).length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="text-sm font-semibold text-navy mb-3">
                  Поля документа
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(doc.fields).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-border bg-surface-subtle p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted font-medium">
                        {k}
                      </div>
                      <div className="text-sm text-navy mt-0.5">{v || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Вложения */}
          <Card className="p-6">
            <h3 className="font-display text-lg text-navy mb-3 inline-flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-burgundy" />
              Вложения · {doc.attachments.length}
            </h3>
            {doc.attachments.length === 0 ? (
              <p className="text-sm text-muted">Файлы не приложены.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {doc.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-burgundy/40 hover:bg-surface-subtle transition-all"
                  >
                    <div className="h-10 w-10 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-navy truncate">
                        {a.name}
                      </div>
                      <div className="text-[11px] text-muted">
                        {formatSize(a.size)} · {a.mimeType}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Подписи */}
          {doc.signatures.length > 0 && (
            <Card className="p-6 bg-gradient-to-br from-[#F0F5EC] to-white border-success/30">
              <h3 className="font-display text-lg text-navy mb-3 inline-flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success" />
                Электронные подписи
              </h3>
              <div className="space-y-3">
                {doc.signatures.map((s) => (
                  <SignatureRow key={s.id} sig={s} />
                ))}
              </div>
            </Card>
          )}

          {/* Хронология / комментарии */}
          <Card className="p-6">
            <h3 className="font-display text-lg text-navy inline-flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-burgundy" />
              Хронология
            </h3>
            <ol className="relative border-l border-border ml-1.5 space-y-3">
              {doc.timeline.map((e) => (
                <TimelineRow key={e.id} ev={e} />
              ))}
            </ol>

            <div className="mt-5 pt-5 border-t border-border">
              <Label>Оставить комментарий</Label>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Вопрос автору, уточнение, заметка для следующего согласующего…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  variant="primary"
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                  disabled={!newComment.trim()}
                  loading={addComment.isPending}
                  onClick={() => addComment.mutate()}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Правая колонка: маршрут, автор, действия */}
        <div className="space-y-4">
          {/* Маршрут */}
          <Card className="p-6">
            <h3 className="font-display text-lg text-navy mb-3">
              Маршрут согласования
            </h3>
            <ol className="space-y-2">
              {doc.approvalRoute.map((s) => (
                <RouteStep key={s.id} step={s} />
              ))}
              {doc.approvalRoute.length === 0 && (
                <p className="text-sm text-muted">
                  Маршрут не привязан — документ в свободной форме.
                </p>
              )}
            </ol>
          </Card>

          {/* Автор */}
          <Card className="p-6">
            <h3 className="font-display text-lg text-navy mb-3">Автор</h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-burgundy-light text-burgundy flex items-center justify-center">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-navy">
                  {doc.author.fullName}
                </div>
                <div className="text-xs text-muted truncate">
                  {doc.author.position ?? doc.author.role}
                  {doc.author.email ? ` · ${doc.author.email}` : ""}
                </div>
              </div>
            </div>
            {doc.department && (
              <div className="mt-3 pt-3 border-t border-border text-sm text-muted">
                Подразделение: <span className="text-navy">{doc.department}</span>
              </div>
            )}
            {doc.dueAt && (
              <div className="mt-2 text-sm text-muted inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Срок: <span className="text-navy">{fmtDate(doc.dueAt, "d MMM yyyy")}</span>
              </div>
            )}
          </Card>

          {/* Действия */}
          <Card className="p-6 space-y-2">
            <h3 className="font-display text-lg text-navy mb-2">Действия</h3>
            {canSign && (
              <Button
                className="w-full"
                variant="primary"
                leftIcon={<FileSignature className="h-4 w-4" />}
                onClick={() => setAction("sign")}
              >
                Подписать УКЭП
              </Button>
            )}
            {isAuthor && doc.status === "draft" && (
              <Button
                className="w-full"
                variant="navy"
                leftIcon={<Send className="h-4 w-4" />}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Отправить на согласование
              </Button>
            )}
            {isAuthor &&
              (doc.status === "draft" || doc.status === "on_review") && (
                <Button
                  className="w-full"
                  variant="outline"
                  leftIcon={<Ban className="h-4 w-4" />}
                  onClick={() => setAction("cancel")}
                >
                  Отозвать документ
                </Button>
              )}
            {(doc.status === "signed" ||
              doc.status === "rejected" ||
              doc.status === "cancelled") &&
              (isAuthor || user?.role === "admin") && (
                <Button
                  className="w-full"
                  variant="ghost"
                  leftIcon={<Archive className="h-4 w-4" />}
                  loading={archive.isPending}
                  onClick={() => archive.mutate()}
                >
                  В архив
                </Button>
              )}
            <Link to="/edms/registry" className="block pt-1">
              <Button variant="ghost" size="sm" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                В реестр документов
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog
        open={action === "approve" || action === "reject"}
        onClose={() => setAction(null)}
        title={action === "approve" ? "Согласовать документ" : "Отклонить документ"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>
              Отмена
            </Button>
            <Button
              variant={action === "approve" ? "primary" : "destructive"}
              loading={approve.isPending || reject.isPending}
              onClick={() =>
                action === "approve" ? approve.mutate() : reject.mutate()
              }
            >
              {action === "approve" ? "Согласовать" : "Отклонить"}
            </Button>
          </>
        }
      >
        <Label>Комментарий (необязательно)</Label>
        <Textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            action === "approve"
              ? "Комментарий для автора и истории"
              : "Укажите причину отклонения"
          }
        />
      </Dialog>

      <Dialog
        open={action === "sign"}
        onClose={() => setAction(null)}
        title="Подписание усиленной квалифицированной ЭП"
        description="Документ будет подписан УКЭП с алгоритмом ГОСТ Р 34.10-2012."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              loading={sign.isPending}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => sign.mutate()}
            >
              Подписать
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-4 bg-surface-subtle">
            <div className="text-xs text-muted">Подписант</div>
            <div className="font-medium text-navy mt-0.5">
              {user?.fullName ?? "—"}
            </div>
            <div className="text-xs text-muted mt-1">
              {user?.email ?? ""} · роль {user?.role ?? ""}
            </div>
          </div>
          <div className="rounded-xl border border-success/30 bg-[#F0F5EC] p-4 text-sm text-success">
            Подпись имеет юридическую силу и фиксируется в аудит-логе. Отозвать
            подпись можно только через канцелярию.
          </div>
        </div>
      </Dialog>

      <Dialog
        open={action === "cancel"}
        onClose={() => setAction(null)}
        title="Отозвать документ?"
        description="После отзыва маршрут остановится. Документ можно архивировать или удалить."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>
              Нет
            </Button>
            <Button
              variant="destructive"
              loading={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Отозвать
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Действие будет зафиксировано в истории и видно всем участникам.
        </p>
      </Dialog>
    </div>
  );
}

function RouteStep({ step }: { step: EDMSApprovalStep }) {
  const map: Record<EDMSApprovalStep["status"], { color: string; icon: typeof Check; label: string }> = {
    pending: { color: "bg-navy/5 text-navy", icon: Clock, label: "Ожидает" },
    approved: { color: "bg-[#E6F2EC] text-success", icon: Check, label: "Согласовано" },
    signed: { color: "bg-[#E6F2EC] text-success", icon: ShieldCheck, label: "Подписано" },
    rejected: { color: "bg-accent-red-light text-accent-red", icon: X, label: "Отклонено" },
    skipped: { color: "bg-navy/5 text-muted", icon: ArrowRight, label: "Пропущено" },
  };
  const m = map[step.status];
  const Icon = m.icon;
  return (
    <li
      className={`flex items-start gap-3 p-3 rounded-xl border ${
        step.isCurrent
          ? "border-burgundy bg-burgundy-light/40"
          : "border-border bg-white"
      }`}
    >
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted">Шаг {step.order}</span>
          <Badge variant={step.isCurrent ? "burgundy" : "muted"}>{m.label}</Badge>
        </div>
        <div className="font-medium text-navy text-sm mt-1">
          {step.approver.fullName || step.approver.position || step.approver.role}
        </div>
        <div className="text-[11px] text-muted">
          {step.approver.position ?? step.approver.role} · SLA {step.slaHours} ч
        </div>
        {step.comment && (
          <div className="mt-2 rounded-lg bg-navy/5 text-xs text-navy-75 px-3 py-2">
            «{step.comment}»
          </div>
        )}
      </div>
    </li>
  );
}

function SignatureRow({ sig }: { sig: EDMSSignature }) {
  return (
    <div className="rounded-xl border border-success/30 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-navy">{sig.signer.fullName}</span>
            <Badge variant="success">
              {sig.method === "enhanced_qualified" ? "УКЭП" : sig.method === "enhanced_unqualified" ? "УНЭП" : "ПЭП"}
            </Badge>
            {sig.valid && <Badge variant="success">Действительна</Badge>}
          </div>
          <div className="text-xs text-muted mt-1">
            {sig.signer.position ?? sig.signer.role} · {sig.algorithm}
          </div>
          <div className="text-[11px] text-muted mt-2 font-mono break-all">
            Отпечаток: {sig.thumbprint}
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Подписано {fmtDate(sig.signedAt, "d MMM yyyy")} {fmtTime(sig.signedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ ev }: { ev: EDMSTimelineEvent }) {
  return (
    <li className="ml-4 pl-3">
      <div className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-burgundy ring-4 ring-burgundy-light" />
      <div className="text-sm text-navy">{ev.message}</div>
      <div className="text-[11px] text-muted mt-0.5">
        {ev.actor.fullName} · {fmtDate(ev.createdAt, "d MMM yyyy")}{" "}
        {fmtTime(ev.createdAt)}
      </div>
    </li>
  );
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

