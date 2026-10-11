'use client';

import { useEffect, useState } from "react";
import { useAuthStore, useNavStore } from "@/lib/auth-store";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { LoginView } from "@/components/views/LoginView";
import { DashboardView } from "@/components/views/DashboardView";
import { CasesView } from "@/components/views/CasesView";
import { CaseDetailView } from "@/components/views/CaseDetailView";
import { AuditView } from "@/components/views/AuditView";
import { UploadView } from "@/components/views/UploadView";
import { SettingsView } from "@/components/views/SettingsView";
import { ProfileView } from "@/components/views/ProfileView";

export default function Home() {
  const { user, fetchMe } = useAuthStore();
  const { currentView, selectedCaseId } = useNavStore();
  const [mounted, setMounted] = useState(false);

  // Mount + check session (only on client)
  useEffect(() => {
    setMounted(true);
    fetchMe();
  }, [fetchMe]);

  // During SSR or before client mount → show loading (avoid hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0F2A5C] flex items-center justify-center">
            <svg className="w-7 h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <div className="text-sm text-slate-500 font-semibold">VERA Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in → show login
  if (!user) {
    return <LoginView />;
  }

  // Render view based on nav state
  const renderView = () => {
    if (currentView === "cases" && selectedCaseId) {
      return <CaseDetailView />;
    }
    switch (currentView) {
      case "dashboard": return <DashboardView />;
      case "cases": return <CasesView />;
      case "audit": return <AuditView />;
      case "upload": return <UploadView />;
      case "settings": return <SettingsView />;
      case "profile": return <ProfileView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
