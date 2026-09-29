/**
 * VERA Sidebar Navigation — enterprise-grade left navigation
 * Inspired by Vercel dashboard + Linear + Palantir Foundry
 */

import { useNavStore, useAuthStore, type ViewKey } from "@/lib/auth-store";
import {
  LayoutDashboard, FolderOpen, FileText, Upload, Settings, User,
  Activity, ChevronRight,
} from "lucide-react";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & KPIs" },
  { key: "cases", label: "Kasus Pasien", icon: FolderOpen, description: "Daftar episode" },
  { key: "audit", label: "Audit Trail", icon: FileText, description: "Log aktivitas" },
  { key: "upload", label: "Upload Kasus", icon: Upload, description: "Tambah data baru" },
  { key: "settings", label: "Pengaturan", icon: Settings, description: "Konfigurasi sistem" },
  { key: "profile", label: "Profil", icon: User, description: "Akun reviewer" },
];

export function Sidebar() {
  const { currentView, setView } = useNavStore();
  const { user } = useAuthStore();

  return (
    <aside className="w-64 bg-[#0F2A5C] text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="font-serif text-xl font-black tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>
              VERA
            </div>
            <div className="text-[9px] text-white/50 uppercase tracking-widest">
              BPJS Health Audit
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-white/50 group-hover:text-white/80"}`} />
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className={`text-[10px] ${isActive ? "text-white/60" : "text-white/40"}`}>
                  {item.description}
                </div>
              </div>
              {isActive && <ChevronRight className="w-3 h-3 text-sky-400" />}
            </button>
          );
        })}
      </nav>

      {/* User card at bottom */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-sm font-bold text-white">
            {user?.avatar || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-[10px] text-white/50 truncate">{user?.role}</div>
          </div>
        </div>
        <div className="mt-3 px-3 text-[9px] text-white/40 uppercase tracking-widest">
          v2.0 · Healthkathon 2026
        </div>
      </div>
    </aside>
  );
}
