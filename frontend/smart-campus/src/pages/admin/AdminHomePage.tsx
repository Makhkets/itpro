import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  ClipboardCheck,
  DoorOpen,
  Inbox,
  Library,
  Send,
  Users,
} from "lucide-react";
import { analyticsApi } from "@/shared/api/modules";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";
import { Card } from "@/shared/ui/card";
import { LoadingState } from "@/shared/ui/states";

export default function AdminHomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsApi.summary(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Администратор"
        title="Сводка системы"
        subtitle="Ключевые показатели SmartCampus в реальном времени."
      />

      {isLoading || !data ? (
        <LoadingState rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              tone="navy"
              label="Пользователей"
              value={data.totalUsers}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              tone="burgundy"
              label="Бронирований"
              value={data.totalBookings}
              delta={`${data.pendingBookings} ожидают`}
              icon={<Inbox className="h-5 w-5" />}
            />
            <StatCard
              label="Корпусов"
              value={data.totalBuildings}
              icon={<Building2 className="h-5 w-5" />}
            />
            <StatCard
              label="Аудиторий"
              value={data.totalRooms}
              icon={<DoorOpen className="h-5 w-5" />}
            />
            <StatCard
              label="Сессий посещ."
              value={data.totalAttendanceSessions}
              delta={`Средняя ${Math.round(data.averageAttendanceRate * 100)}%`}
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
            <StatCard
              label="Книг в фонде"
              value={data.totalBooks}
              delta={`${data.activeLibraryLoans} выдач активно`}
              icon={<Library className="h-5 w-5" />}
            />
            <StatCard
              label="AI-запросов"
              value={data.aiQuestionsCount}
              icon={<Bot className="h-5 w-5" />}
            />
            <StatCard
              label="Сообщений Telegram"
              value={data.telegramMessagesCount}
              icon={<Send className="h-5 w-5" />}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { to: "/admin/bookings", label: "Бронирования", icon: Inbox, hint: "Согласование" },
              { to: "/admin/rooms", label: "Аудитории", icon: DoorOpen, hint: "CRUD" },
              { to: "/admin/buildings", label: "Корпуса", icon: Building2, hint: "Здания и этажи" },
              { to: "/admin/analytics", label: "Аналитика", icon: Activity, hint: "Графики и тренды" },
              { to: "/admin/audit-logs", label: "Аудит-лог", icon: ClipboardCheck, hint: "Безопасность" },
              { to: "/admin/faq", label: "FAQ", icon: Bot, hint: "Контент абитуриентов" },
            ].map((a) => (
              <Link key={a.to} to={a.to}>
                <Card className="p-5 hover:-translate-y-0.5 hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-burgundy-light text-burgundy flex items-center justify-center">
                      <a.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-navy">{a.label}</div>
                      <div className="text-xs text-muted">{a.hint}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
