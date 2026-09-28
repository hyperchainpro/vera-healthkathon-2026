/**
 * VERA Profile View — user info + my audit stats + my actions log
 */

import { useEffect, useState } from "react";
import {
  User as UserIcon, Activity, Clock, FileText, AlertTriangle,
  ShieldCheck, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";

interface MyLog {
  id: string; action: string; reason: string | null; createdAt: string;
  episode: { id: string; caseId: string; diseaseName: string } | null;
}

export function ProfileView() {
  const { user } = useAuthStore();
  const [myLogs, setMyLogs] = useState<MyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/audit?userId=${user.id}&limit=50`)
      .then(r => r.json())
      .then(data => setMyLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  // Stats from my logs
  const myStats = {
    total: myLogs.length,
    viewed: myLogs.filter(l => l.action === "viewed").length,
    flagged: myLogs.filter(l => l.action === "flagged").length,
    overridden: myLogs.filter(l => l.action === "overridden").length,
    exported: myLogs.filter(l => l.action === "evidence_exported").length,
    uploads: myLogs.filter(l => l.action === "uploaded" || l.action === "created").length,
    logins: myLogs.filter(l => l.action === "login").length,
  };

  const ACTION_COLORS: Record<string, string> = {
    login: "#0EA5E9", viewed: "#64748B", uploaded: "#16A34A",
    flagged: "#DC2626", overridden: "#F59E0B", evidence_exported: "#0F2A5C",
    created: "#16A34A",
  };

  return (
    <div className="p-8 space-y-5">
      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-2xl font-black text-white">
            {user.avatar}
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
              {user.name}
            </h1>
            <div className="text-sm text-slate-600 mt-0.5">{user.email}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                {user.role}
              </span>
              <span className="text-xs text-slate-500">📋 {user.department}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Member sejak</div>
            <div className="text-xs text-slate-700 font-mono mt-1">
              {new Date().getFullYear()}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Last login</div>
            <div className="text-xs text-slate-700 font-mono mt-1">
              {user.lastLogin ? new Date(user.lastLogin).toLocaleString("id-ID") : "—"}
            </div>
          </div>
        </div>
      </Card>

      {/* My stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total Actions", value: myStats.total, icon: Activity, color: "#0F2A5C" },
          { label: "Cases Viewed", value: myStats.viewed, icon: UserIcon, color: "#0EA5E9" },
          { label: "Cases Uploaded", value: myStats.uploads, icon: FileText, color: "#16A34A" },
          { label: "Red Flags Raised", value: myStats.flagged, icon: AlertTriangle, color: "#DC2626" },
          { label: "Overrides", value: myStats.overridden, icon: ShieldCheck, color: "#F59E0B" },
          { label: "Logins", value: myStats.logins, icon: Clock, color: "#64748B" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</div>
              </div>
              <div className="font-serif text-2xl font-bold text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
                {s.value}
              </div>
            </Card>
          );
        })}
      </div>

      {/* My action history */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Aktivitas Saya</h3>
            <span className="text-xs text-slate-500">({myLogs.length} entries)</span>
          </div>
        </div>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-4 font-semibold text-slate-600 uppercase">Action</th>
                  <th className="text-left py-2 px-4 font-semibold text-slate-600 uppercase">Episode</th>
                  <th className="text-left py-2 px-4 font-semibold text-slate-600 uppercase">Reason</th>
                  <th className="text-right py-2 px-4 font-semibold text-slate-600 uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {myLogs.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">Belum ada aktivitas</td></tr>
                )}
                {myLogs.map(log => {
                  const color = ACTION_COLORS[log.action] || "#64748B";
                  return (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                          backgroundColor: color + "20", color,
                        }}>{log.action}</span>
                      </td>
                      <td className="py-2 px-4 font-mono text-slate-700">
                        {log.episode?.caseId || "—"}
                      </td>
                      <td className="py-2 px-4 text-slate-600 text-[11px] max-w-md truncate">
                        {log.reason || "—"}
                      </td>
                      <td className="py-2 px-4 text-right text-[10px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
