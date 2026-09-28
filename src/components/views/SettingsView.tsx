/**
 * VERA Settings View — system config + user management
 */

import { useEffect, useState } from "react";
import { Settings, Users, Shield, Activity, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VERAUser {
  id: string; email: string; name: string; role: string;
  avatar: string; department: string; active: boolean;
  lastLogin: string | null; createdAt: string;
}

export function SettingsView() {
  const [users, setUsers] = useState<VERAUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(data => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ROLE_COLORS: Record<string, string> = {
    admin: "#DC2626",
    supervisor: "#F59E0B",
    reviewer: "#0EA5E9",
    medical_officer: "#16A34A",
  };

  return (
    <div className="p-8 space-y-5">
      {/* System config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-slate-900">Threshold Flag</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-red-50 rounded">
              <span className="text-red-700 font-semibold">HIGH (Red Flag)</span>
              <span className="font-mono text-red-700">0.6 – 1.0</span>
            </div>
            <div className="flex justify-between p-2 bg-amber-50 rounded">
              <span className="text-amber-700 font-semibold">MEDIUM (Watch)</span>
              <span className="font-mono text-amber-700">0.3 – 0.6</span>
            </div>
            <div className="flex justify-between p-2 bg-emerald-50 rounded">
              <span className="text-emerald-700 font-semibold">LOW (Normal)</span>
              <span className="font-mono text-emerald-700">0.0 – 0.3</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900">Kurva Standar</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="font-semibold text-slate-700">Pneumonia</span>
              <span className="font-mono text-slate-700">Pulang H5</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="font-semibold text-slate-700">Stroke (Ischemic)</span>
              <span className="font-mono text-slate-700">Pulang H5</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded opacity-50">
              <span className="font-semibold text-slate-700">CHF</span>
              <span className="font-mono text-slate-400">Coming soon</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded opacity-50">
              <span className="font-semibold text-slate-700">COPD</span>
              <span className="font-mono text-slate-400">Coming soon</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">AI Pipeline</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="font-semibold text-slate-700">LLM Backend</span>
              <span className="font-mono text-slate-700">3-tier fallback</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="font-semibold text-slate-700">Hallucination rate</span>
              <span className="font-mono text-emerald-600">1.89%</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="font-semibold text-slate-700">Anomaly detection</span>
              <span className="font-mono text-emerald-600">100%</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-50 rounded">
              <span className="font-semibold text-slate-700">Schema validation</span>
              <span className="font-mono text-slate-700">Zod strict</span>
            </div>
          </div>
        </Card>
      </div>

      {/* User management */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Manajemen User</h3>
            <span className="text-xs text-slate-500">({users.length} users)</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase">User</th>
                <th className="text-left py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase">Role</th>
                <th className="text-left py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase">Department</th>
                <th className="text-center py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase">Status</th>
                <th className="text-right py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const color = ROLE_COLORS[u.role] || "#64748B";
                return (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
                          {u.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                        backgroundColor: color + "20", color: color,
                      }}>{u.role}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{u.department}</td>
                    <td className="py-3 px-4 text-center">
                      {u.active ? (
                        <Badge variant="default" className="text-[10px] bg-emerald-100 text-emerald-700">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-[10px] text-slate-500 font-mono">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString("id-ID") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
