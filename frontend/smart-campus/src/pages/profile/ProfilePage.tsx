import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AtSign,
  Building2,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  Send as SendIcon,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/store";
import { usersApi, brsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ROLE_LABEL } from "@/shared/lib/role";
import { fmtDate } from "@/shared/lib/date";
import { StudentCard } from "@/features/student-card/StudentCard";

function abbrev(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name;
  return words.map((w) => w[0].toUpperCase()).join("");
}

export default function ProfilePage() {
  const { user } = useAuth();
  const me = useQuery({ queryKey: ["me"], queryFn: () => usersApi.me() });
  const u = me.data ?? user;
  const [cardOpen, setCardOpen] = useState(false);
  const isStudent = u?.role === "student";

  // Fetch BRS profile to get group/department if missing
  const { data: brsProfile } = useQuery({
    queryKey: ["brs-profile-enrich"],
    queryFn: () => brsApi.profile(),
    enabled: isStudent && (!u?.groupName || !u?.department),
    retry: false,
  });

  const enriched = useMemo(() => {
    if (!brsProfile || typeof brsProfile !== "object") return { groupName: "", department: "" };
    const p = brsProfile as Record<string, unknown>;
    return {
      groupName: (p.group_name ?? p.groupName ?? p.group ?? "") as string,
      department: (p.institute ?? p.department ?? p.faculty ?? "") as string,
    };
  }, [brsProfile]);

  const displayGroup = u?.groupName || enriched.groupName;
  const displayDept = u?.department || enriched.department;

  if (!u) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader eyebrow="Профиль" title="Личные данные" />

      <Card className="p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 hero-lines opacity-10" />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-burgundy-light blur-3xl" />
        <div className="relative grid sm:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="h-24 w-24 rounded-3xl bg-navy text-white flex items-center justify-center text-4xl font-display font-semibold">
            {u.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-3xl text-navy">{u.fullName}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="burgundy">{ROLE_LABEL[u.role]}</Badge>
              {displayGroup && <Badge variant="default">Группа · {displayGroup}</Badge>}
              {displayDept && (
                <Badge variant="muted">{abbrev(displayDept)}</Badge>
              )}
            </div>
            {isStudent && (
              <button
                onClick={() => setCardOpen(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-burgundy text-white text-sm font-medium hover:bg-burgundy-dark transition-colors shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                Карточка студента
              </button>
            )}
          </div>
        </div>
      </Card>

      <StudentCard user={u} open={cardOpen} onClose={() => setCardOpen(false)} />

      <div className="grid md:grid-cols-2 gap-4">
        <InfoRow icon={<AtSign className="h-4 w-4" />} label="Email" value={u.email} />
        <InfoRow
          icon={<GraduationCap className="h-4 w-4" />}
          label="Роль"
          value={ROLE_LABEL[u.role]}
        />
        {displayGroup && (
          <InfoRow
            icon={<GraduationCap className="h-4 w-4" />}
            label="Группа"
            value={displayGroup}
          />
        )}
        {displayDept && (
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Факультет"
            value={`${abbrev(displayDept)} — ${displayDept}`}
          />
        )}
        <InfoRow
          icon={<SendIcon className="h-4 w-4" />}
          label="Telegram"
          value={
            u.isTelegramVerified ? (
              <span className="inline-flex items-center gap-2">
                <Badge variant="success">подключён</Badge>
                {u.telegramUsername && (
                  <span className="text-muted">@{u.telegramUsername}</span>
                )}
              </span>
            ) : (
              <Link to="/telegram" className="text-burgundy font-medium hover:underline">
                Подключить →
              </Link>
            )
          }
        />
        <InfoRow
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Согласие на ПДн"
          value={
            u.personalDataConsent ? (
              <Badge variant="success">подтверждено</Badge>
            ) : (
              <Link to="/privacy" className="text-burgundy font-medium hover:underline">
                Подтвердить →
              </Link>
            )
          }
        />
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="В системе с"
          value={fmtDate(u.createdAt, "d MMM yyyy")}
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-navy">Управление данными</h3>
            <p className="text-sm text-muted mt-1">
              Экспорт и удаление персональных данных доступны в разделе «Приватность».
            </p>
          </div>
          <Link to="/privacy">
            <Button variant="secondary">Открыть приватность</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className="h-10 w-10 rounded-xl bg-burgundy-light text-burgundy flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted font-medium">
          {label}
        </div>
        <div className="text-sm text-navy mt-0.5">{value}</div>
      </div>
    </Card>
  );
}
