import { apiClient } from "./client";

// ---------- Types ----------

export type EDMSDocumentStatus =
  | "draft"
  | "on_review"
  | "approved"
  | "rejected"
  | "signed"
  | "archived"
  | "cancelled";

export type EDMSDocumentDirection = "incoming" | "outgoing" | "internal";

export type EDMSPriority = "low" | "normal" | "high" | "critical";

export type EDMSDocumentType =
  | "statement"
  | "order"
  | "reference"
  | "application"
  | "memo"
  | "contract"
  | "report";

export interface EDMSParty {
  id: string;
  fullName: string;
  role: string;
  position?: string;
  email?: string;
}

export interface EDMSAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploaded: string;
}

export interface EDMSApprovalStep {
  id: string;
  order: number;
  approver: EDMSParty;
  status: "pending" | "approved" | "rejected" | "signed" | "skipped";
  comment?: string;
  actedAt?: string;
  slaHours: number;
  isCurrent: boolean;
  signatureId?: string;
}

export interface EDMSTimelineEvent {
  id: string;
  type:
    | "created"
    | "submitted"
    | "step_approved"
    | "step_rejected"
    | "signed"
    | "commented"
    | "archived";
  actor: EDMSParty;
  message: string;
  createdAt: string;
}

export interface EDMSSignature {
  id: string;
  signer: EDMSParty;
  method: "simple" | "enhanced_unqualified" | "enhanced_qualified";
  algorithm: string;
  thumbprint: string;
  signedAt: string;
  valid: boolean;
}

export interface EDMSDocument {
  id: string;
  regNumber: string;
  title: string;
  type: EDMSDocumentType | string;
  category: string;
  direction: EDMSDocumentDirection;
  status: EDMSDocumentStatus;
  priority: EDMSPriority;
  description?: string;
  body?: string;
  author: EDMSParty;
  recipient?: EDMSParty;
  department?: string;
  templateId?: string;
  routeId?: string;
  tags: string[];
  attachments: EDMSAttachment[];
  approvalRoute: EDMSApprovalStep[];
  signatures: EDMSSignature[];
  timeline: EDMSTimelineEvent[];
  fields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  signedAt?: string;
  archivedAt?: string;
}

export interface EDMSDocumentList {
  items: EDMSDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EDMSTemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface EDMSTemplate {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  body: string;
  fields: EDMSTemplateField[];
  routeId: string;
  roles: string[];
  popularity: number;
  icon: string;
  updatedAt: string;
}

export interface EDMSRouteStep {
  order: number;
  role: string;
  title: string;
  slaHours: number;
  isParallel: boolean;
}

export interface EDMSRoute {
  id: string;
  title: string;
  description: string;
  steps: EDMSRouteStep[];
  usageCount: number;
  avgHours: number;
  updatedAt: string;
}

export interface EDMSAnalytics {
  totalDocuments: number;
  inProgress: number;
  awaitingMyAction: number;
  signedThisMonth: number;
  overdueDocuments: number;
  averageCycleHours: number;
  slaComplianceRate: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  trend: { date: string; created: number; signed: number; rejected: number }[];
  topAuthors: { author: EDMSParty; count: number }[];
  bottlenecks: { step: string; avgHours: number; pending: number }[];
}

export interface EDMSCreateDocumentInput {
  title: string;
  type?: EDMSDocumentType | string;
  category?: string;
  direction?: EDMSDocumentDirection;
  priority?: EDMSPriority;
  description?: string;
  body?: string;
  department?: string;
  templateId?: string;
  routeId?: string;
  tags?: string[];
  fields?: Record<string, string>;
  dueAt?: string;
  recipient?: EDMSParty;
  submit?: boolean;
}

export interface EDMSUpdateDocumentInput {
  title?: string;
  description?: string;
  body?: string;
  priority?: EDMSPriority;
  tags?: string[];
  fields?: Record<string, string>;
  dueAt?: string;
}

export interface EDMSListFilter {
  status?: EDMSDocumentStatus | "";
  type?: string;
  category?: string;
  direction?: EDMSDocumentDirection | "";
  priority?: EDMSPriority | "";
  authorId?: string;
  tag?: string;
  q?: string;
  mine?: boolean;
  inbox?: boolean;
  page?: number;
  pageSize?: number;
}

// ---------- API ----------

const get = <T>(url: string, params?: Record<string, unknown>) =>
  apiClient.get<T>(url, { params }).then((r) => r.data);
const post = <T>(url: string, data?: unknown) =>
  apiClient.post<T>(url, data).then((r) => r.data);
const patch = <T>(url: string, data?: unknown) =>
  apiClient.patch<T>(url, data).then((r) => r.data);

export const edmsApi = {
  list: (filter?: EDMSListFilter) =>
    get<EDMSDocumentList>("/edms/documents", filter as Record<string, unknown>),
  get: (id: string) => get<EDMSDocument>(`/edms/documents/${id}`),
  create: (data: EDMSCreateDocumentInput) =>
    post<EDMSDocument>("/edms/documents", data),
  update: (id: string, data: EDMSUpdateDocumentInput) =>
    patch<EDMSDocument>(`/edms/documents/${id}`, data),
  submit: (id: string) => post<EDMSDocument>(`/edms/documents/${id}/submit`),
  approve: (id: string, comment?: string) =>
    post<EDMSDocument>(`/edms/documents/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) =>
    post<EDMSDocument>(`/edms/documents/${id}/reject`, { comment }),
  sign: (id: string, method?: string, pin?: string) =>
    post<EDMSDocument>(`/edms/documents/${id}/sign`, { method, pin }),
  comment: (id: string, message: string) =>
    post<EDMSDocument>(`/edms/documents/${id}/comment`, { message }),
  attach: (
    id: string,
    file: { name: string; size: number; mimeType: string; url?: string },
  ) =>
    post<EDMSDocument>(`/edms/documents/${id}/attachments`, {
      ...file,
      url: file.url ?? "#",
    }),
  archive: (id: string) => post<EDMSDocument>(`/edms/documents/${id}/archive`),
  cancel: (id: string) => post<EDMSDocument>(`/edms/documents/${id}/cancel`),

  templates: () => get<EDMSTemplate[]>("/edms/templates"),
  template: (id: string) => get<EDMSTemplate>(`/edms/templates/${id}`),

  routes: () => get<EDMSRoute[]>("/edms/routes"),
  route: (id: string) => get<EDMSRoute>(`/edms/routes/${id}`),

  analytics: () => get<EDMSAnalytics>("/edms/analytics"),
};

// ---------- Labels (UI helpers) ----------

export const EDMS_STATUS_LABEL: Record<EDMSDocumentStatus, string> = {
  draft: "Черновик",
  on_review: "На согласовании",
  approved: "Согласован",
  rejected: "Отклонён",
  signed: "Подписан",
  archived: "В архиве",
  cancelled: "Отозван",
};

export const EDMS_TYPE_LABEL: Record<string, string> = {
  statement: "Заявление",
  order: "Приказ",
  reference: "Справка",
  application: "Заявка",
  memo: "Служебная записка",
  contract: "Договор",
  report: "Отчёт",
};

export const EDMS_CATEGORY_LABEL: Record<string, string> = {
  academic: "Учебная часть",
  hr: "Кадры",
  financial: "Финансы",
  legal: "Юридический",
  admission: "Приёмная комиссия",
  general: "Общий",
};

export const EDMS_DIRECTION_LABEL: Record<EDMSDocumentDirection, string> = {
  incoming: "Входящий",
  outgoing: "Исходящий",
  internal: "Внутренний",
};

export const EDMS_PRIORITY_LABEL: Record<EDMSPriority, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  critical: "Срочно",
};
