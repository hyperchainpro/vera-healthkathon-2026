/**
 * VERA TopBar — search + notifications + user menu
 */

import { useAuthStore, useNavStore } from "@/lib/auth-store";
import { Search, Bell, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview metrik & trend audit klaim" },
  cases: { title: "Kasus Pasien", subtitle: "Daftar episode dengan Red Flag sorting" },
  audit: { title: "Audit Trail", subtitle: "Log semua aktivitas reviewer" },
  upload: { title: "Upload Kasus", subtitle: "Tambah episode baru ke VERA pipeline" },
  settings: { title: "Pengaturan", subtitle: "Konfigurasi threshold & manajemen user" },
  profile: { title: "Profil Reviewer", subtitle: "Informasi akun & statistik audit" },
};

function formatShortName(name?: string) {
  if (!name) return "Pengguna";
  const match = name.match(/^(dr\.\s+[^\s,]+|prof\.\s+[^\s,]+|[^\s,]+)/i);
  return match ? match[0] : name.split(" ")[0];
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  supervisor: "Supervisor",
  reviewer: "Verifikator Klaim",
  medical_officer: "Medical Officer",
};

export function TopBar() {
  const { user, logout } = useAuthStore();
  const { currentView, selectedCaseId } = useNavStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const view = VIEW_TITLES[currentView] || VIEW_TITLES.dashboard;
  const showingCaseDetail = currentView === "cases" && selectedCaseId !== null;

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            {showingCaseDetail ? "Detail Kasus Pasien" : view.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {showingCaseDetail ? "Analisis kurva pemulihan & bukti ilmiah" : view.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari case ID..."
              className="pl-9 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded-md focus:bg-white focus:border-slate-300 focus:outline-none w-64"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
                {user?.avatar || "?"}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900">{formatShortName(user?.name)}</div>
                <div className="text-[10px] text-slate-500">{ROLE_LABELS[user?.role || ""] || user?.role}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                  <div className="text-[10px] mt-1 text-slate-400">
                    Dept: {user?.department} · Role: {user?.role}
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); useNavStore.getState().setView("profile"); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Lihat Profil
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); useNavStore.getState().setView("settings"); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Pengaturan
                  </button>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    onClick={() => { logout(); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
