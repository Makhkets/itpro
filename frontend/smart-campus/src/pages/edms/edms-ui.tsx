import type { ReactNode } from "react";
import {
  FileText,
  ScrollText,
  FileSignature,
  ClipboardList,
  Inbox as InboxIcon,
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  Archive,
  Ban,
  Edit3,
  Briefcase,
  GraduationCap,
  Plane,
  UserPlus,
  Scale,
  Clipboard,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import {
  EDMS_STATUS_LABEL,
  EDMS_TYPE_LABEL,
  EDMS_PRIORITY_LABEL,
  type EDMSDocumentStatus,
  type EDMSPriority,
} from "@/shared/api/edms";

const STATUS_VARIANT: Record<EDMSDocumentStatus, Parameters<typeof Badge>[0]["variant"]> = {
  draft: "muted",
  on_review: "warning",
  approved: "info",
  rejected: "danger",
  signed: "success",
  archived: "default",
  cancelled: "muted",
};

const STATUS_ICON: Record<EDMSDocumentStatus, LucideIcon> = {
  draft: Edit3,
  on_review: ClipboardList,
  approved: FileCheck2,
  rejected: AlertTriangle,
  signed: ShieldCheck,
  archived: Archive,
  cancelled: Ban,
};

export function EDMSStatusBadge({ status }: { status: EDMSDocumentStatus }) {
  const variant = STATUS_VARIANT[status] ?? "default";
  const Icon = STATUS_ICON[status] ?? FileText;
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" />
      {EDMS_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const PRIORITY_VARIANT: Record<EDMSPriority, Parameters<typeof Badge>[0]["variant"]> = {
  low: "muted",
  normal: "default",
  high: "warning",
  critical: "danger",
};

export function EDMSPriorityBadge({ priority }: { priority: EDMSPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]}>
      {EDMS_PRIORITY_LABEL[priority] ?? priority}
    </Badge>
  );
}

const TYPE_ICON: Record<string, LucideIcon> = {
  statement: FileText,
  order: Scale,
  reference: FileCheck2,
  application: ClipboardList,
  memo: ScrollText,
  contract: FileSignature,
  report: ClipboardList,
};

export function EDMSTypeBadge({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? FileText;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-navy-75">
      <Icon className="h-3.5 w-3.5 text-burgundy" />
      {EDMS_TYPE_LABEL[type] ?? type}
    </span>
  );
}

export const TEMPLATE_ICON_MAP: Record<string, LucideIcon> = {
  graduation: GraduationCap,
  "file-text": FileText,
  plane: Plane,
  "user-plus": UserPlus,
  scale: Scale,
  clipboard: Clipboard,
  briefcase: Briefcase,
  inbox: InboxIcon,
};

export function TemplateIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TEMPLATE_ICON_MAP[name] ?? FileText;
  return <Icon className={cn("h-5 w-5", className)} />;
}

export function MetricRow({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const tones: Record<string, string> = {
    default: "text-navy",
    danger: "text-accent-red",
    warning: "text-warning",
    success: "text-success",
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-right">
        <div className={cn("font-display text-lg leading-none", tones[tone ?? "default"])}>
          {value}
        </div>
        {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
      </div>
    </div>
  );
}

export function HeroPanel({
  title,
  subtitle,
  ctaText,
  onCta,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  ctaText?: string;
  onCta?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-navy via-[#1f2a47] to-navy-950 text-white shadow-card-hover">
      <div className="absolute inset-0 hero-lines opacity-50 pointer-events-none" />
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-burgundy/30 blur-3xl pointer-events-none" />
      <div className="absolute right-1/3 bottom-0 h-40 w-40 rounded-full bg-burgundy/20 blur-2xl pointer-events-none" />
      <div className="relative p-7 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-burgundy font-semibold mb-3">
              SmartCampus · ЭДО
            </div>
            <h1 className="font-display text-3xl md:text-4xl leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm md:text-base text-white/70 leading-relaxed">
                {subtitle}
              </p>
            )}
            {ctaText && (
              <button
                onClick={onCta}
                className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-burgundy text-white text-sm font-medium hover:bg-burgundy-dark transition-colors shadow-glow"
              >
                {ctaText}
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
