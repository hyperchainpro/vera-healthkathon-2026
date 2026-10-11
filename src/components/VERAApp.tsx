'use client';

import { useEffect } from "react";
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

export default function VERAApp() {
  const { user, fetchMe } = useAuthStore();
  const { currentView, selectedCaseId } = useNavStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (!user) {
    return <LoginView />;
  }

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
