import type { Role } from "@/shared/api/types";

export const ROLE_LABEL: Record<Role, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  applicant: "Абитуриент",
  librarian: "Библиотекарь",
  admin: "Администратор",
};

export const ROLE_COLOR: Record<Role, string> = {
  student: "bg-burgundy-light text-burgundy",
  teacher: "bg-[#E8EBF4] text-navy",
  applicant: "bg-[#FFF4E0] text-warning",
  librarian: "bg-[#E6F2EC] text-success",
  admin: "bg-accent-red-light text-accent-red",
};

export function hasRole(role: Role | undefined, allowed: Role[]) {
  return role ? allowed.includes(role) : false;
}
