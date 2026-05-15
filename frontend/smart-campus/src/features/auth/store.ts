import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/shared/api/types";
import { tokenStorage } from "@/shared/api/client";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        tokenStorage.set(token);
        set({ user, token, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        tokenStorage.clear();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "sc.auth",
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
