import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  Map,
  Inbox,
  Bot,
  Bell,
  ShieldCheck,
  Send,
  Building2,
  BookOpenCheck,
  Library,
  ClipboardCheck,
  BarChart3,
  Shield,
  HelpCircle,
  Users,
  Sparkles,
} from "lucide-react";
import type { Role } from "@/shared/api/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function getNavigation(role: Role): NavGroup[] {
  const scheduleTo =
    role === "teacher" ? "/teacher/schedule" : "/schedule";
  const common: NavGroup = {
    title: "Общее",
    items: [
      { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard, end: true },
      { to: scheduleTo, label: "Расписание", icon: Calendar },
      { to: "/ai", label: "AI-ассистент", icon: Bot },
      { to: "/library", label: "Библиотека", icon: Library },
      { to: "/notifications", label: "Уведомления", icon: Bell },
      { to: "/telegram", label: "Telegram", icon: Send },
      { to: "/profile", label: "Профиль", icon: Users },
      { to: "/privacy", label: "Приватность", icon: ShieldCheck },
    ],
  };

  if (role === "student") {
    return [
      common,
      {
        title: "Учёба",
        items: [
          { to: "/attendance/my", label: "Посещаемость", icon: ClipboardCheck },
        ],
      },
      {
        title: "Кампус",
        items: [
          { to: "/rooms", label: "Аудитории", icon: DoorOpen },
          { to: "/bookings/my", label: "Мои бронирования", icon: BookOpenCheck },
        ],
      },
    ];
  }

  if (role === "teacher") {
    return [
      common,
      {
        title: "Преподавание",
        items: [
          { to: "/attendance/sessions", label: "Посещаемость", icon: ClipboardCheck },
          { to: "/attendance/by-group", label: "Аналитика группы", icon: BarChart3 },
        ],
      },
      {
        title: "Кампус",
        items: [
          { to: "/rooms", label: "Аудитории", icon: DoorOpen },
          { to: "/bookings/my", label: "Бронирования", icon: BookOpenCheck },
        ],
      },
    ];
  }

  if (role === "applicant") {
    return [
      common,
      {
        title: "Поступление",
        items: [
          { to: "/applicant", label: "Главное", icon: Sparkles },
          { to: "/applicant-faq", label: "FAQ абитуриента", icon: HelpCircle },
        ],
      },
    ];
  }

  if (role === "librarian") {
    return [
      common,
      {
        title: "Библиотека",
        items: [
          { to: "/library/manage/books", label: "Каталог книг", icon: Library },
          { to: "/library/manage/loans", label: "Выдачи", icon: BookOpenCheck },
          { to: "/analytics/library", label: "Аналитика", icon: BarChart3 },
        ],
      },
    ];
  }

  // admin
  return [
    common,
    {
      title: "Управление",
      items: [
        { to: "/admin", label: "Сводка", icon: LayoutDashboard, end: true },
        { to: "/admin/buildings", label: "Корпуса", icon: Building2 },
        { to: "/admin/rooms", label: "Аудитории", icon: DoorOpen },
        { to: "/admin/navigation", label: "Маршруты", icon: Map },
        { to: "/admin/bookings", label: "Бронирования", icon: Inbox },
        { to: "/admin/attendance", label: "Посещаемость", icon: ClipboardCheck },
        { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
      ],
    },
    {
      title: "Аналитика и безопасность",
      items: [
        { to: "/admin/analytics", label: "Аналитика", icon: BarChart3 },
        { to: "/admin/security", label: "Кибербезопасность", icon: Shield },
        { to: "/admin/audit-logs", label: "Аудит-лог", icon: ClipboardCheck },
      ],
    },
  ];
}
