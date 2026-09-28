/**
 * VERA Auth Store (Zustand)
 * Manages user session, login/logout, role-based access.
 * Persists to localStorage for SPA navigation without Next.js routing.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "admin" | "reviewer" | "supervisor" | "medical_officer";

export interface VERAUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  department: string;
  lastLogin: string | null;
}

interface AuthState {
  user: VERAUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            set({ isLoading: false, error: data.error || "Login failed" });
            return false;
          }
          set({ user: data.user, isLoading: false, error: null });
          return true;
        } catch (err) {
          set({ isLoading: false, error: "Network error" });
          return false;
        }
      },

      logout: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (err) {
          // ignore
        }
        set({ user: null });
      },

      fetchMe: async () => {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            set({ user: data.user });
          } else {
            set({ user: null });
          }
        } catch (err) {
          set({ user: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "vera-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Navigation store — SPA view switching
export type ViewKey = "dashboard" | "cases" | "audit" | "upload" | "settings" | "profile";

interface NavState {
  currentView: ViewKey;
  selectedCaseId: string | null;
  setView: (view: ViewKey) => void;
  openCase: (caseId: string) => void;
  closeCase: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  currentView: "dashboard",
  selectedCaseId: null,
  setView: (view) => set({ currentView: view, selectedCaseId: null }),
  openCase: (caseId) => set({ selectedCaseId: caseId }),
  closeCase: () => set({ selectedCaseId: null }),
}));
