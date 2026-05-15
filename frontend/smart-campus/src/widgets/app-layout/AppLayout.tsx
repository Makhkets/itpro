import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/widgets/sidebar/Sidebar";
import { Topbar } from "@/widgets/topbar/Topbar";
import { useAuth } from "@/features/auth/store";
import { usersApi } from "@/shared/api/modules";
import { setUnauthorizedHandler } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, isAuthenticated, logout } = useAuth();

  // refresh user from server
  useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const me = await usersApi.me();
      setUser(me);
      return me;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate("/login");
    });
  }, [logout, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen w-full flex bg-surface">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-[280px] shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-300",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={closeMobile}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Sidebar onItemClick={closeMobile} />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1400px] w-full mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
