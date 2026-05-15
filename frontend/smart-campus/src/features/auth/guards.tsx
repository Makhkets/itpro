import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./store";
import type { Role } from "@/shared/api/types";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export function RoleGuard({
  roles,
  children,
  fallback,
}: {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) {
    return (
      <>
        {fallback ?? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="font-display text-2xl text-navy">Доступ ограничен</p>
            <p className="text-sm text-muted mt-2">
              Этот раздел доступен только для других ролей.
            </p>
          </div>
        )}
      </>
    );
  }
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
