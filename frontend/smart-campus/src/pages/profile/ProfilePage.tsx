import { useQuery } from "@tanstack/react-query";
import {
  AtSign,
  Building2,
  GraduationCap,
  ShieldCheck,
  Send as SendIcon,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/store";
import { usersApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ROLE_LABEL } from "@/shared/lib/role";
import { fmtDate } from "@/shared/lib/date";

export default function ProfilePage() {
  const { user } = useAuth();
  const me = useQuery({ queryKey: ["me"], queryFn: () => usersApi.me() });
  const u = me.data ?? user;
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
              {u.groupName && <Badge variant="default">Группа · {u.groupName}</Badge>}
              {u.department && (
                <Badge variant="muted">{u.department}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <InfoRow icon={<AtSign className="h-4 w-4" />} label="Email" value={u.email} />
        <InfoRow
          icon={<GraduationCap className="h-4 w-4" />}
          label="Роль"
          value={ROLE_LABEL[u.role]}
        />
        {u.groupName && (
          <InfoRow
            icon={<GraduationCap className="h-4 w-4" />}
            label="Группа"
            value={u.groupName}
          />
        )}
        {u.department && (
          <InfoRow
            icon={<Building2 className="h-4 w-4" />}
            label="Подразделение"
            value={u.department}
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
