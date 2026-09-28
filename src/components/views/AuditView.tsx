/**
 * VERA Audit Trail View — all reviewer actions across episodes
 */

import { useEffect, useState } from "react";
import { Loader2, FileText, Filter, User, Activity, Search } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AuditLog {
  id: string; action: string; reason: string | null; metadata: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; avatar: string } | null;
  episode: { id: string; caseId: string; diseaseName: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  login: "#0EA5E9",
  logout: "#94A3B8",
  viewed: "#64748B",
  uploaded: "#16A34A",
  flagged: "#DC2626",
  overridden: "#F59E0B",
  evidence_exported: "#0F2A5C",
  created: "#16A34A",
};

export function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/audit?limit=200")
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actions = Array.from(new Set(logs.map(l => l.action)));
  const filtered = logs
    .filter(l => actionFilter === "all" || l.action === actionFilter)
    .filter(l => search === "" || (
      (l.user?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (l.episode?.caseId?.toLowerCase().includes(search.toLowerCase())) ||
      (l.action.toLowerCase().includes(search.toLowerCase()))
    ));

  return (
    <div className="p-8 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Total Log Entries</div>
          <div className="font-serif text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Playfair Display, serif" }}>
            {total.toLocaleString("id-ID")}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Action Types</div>
          <div className="font-serif text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Playfair Display, serif" }}>
            {actions.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Unique Reviewers</div>
          <div className="font-serif text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Playfair Display, serif" }}>
            {Array.from(new Set(logs.filter(l => l.user).map(l => l.user!.email))).length}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari reviewer, case ID, atau action..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-sky-400"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-sky-400"
        >
          <option value="all">Semua Action ({logs.length})</option>
          {actions.map(a => (
            <option key={a} value={a}>{a} ({logs.filter(l => l.action === a).length})</option>
          ))}
        </select>
      </div>

      {/* Logs table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600 uppercase">Action</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600 uppercase">Reviewer</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600 uppercase">Episode</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600 uppercase">Reason / Metadata</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600 uppercase">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(log => {
                  const color = ACTION_COLORS[log.action] || "#64748B";
                  return (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                          backgroundColor: color + "20", color: color,
                        }}>{log.action}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-[9px] font-bold text-white">
                              {log.user.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{log.user.name}</div>
                              <div className="text-[10px] text-slate-500">{log.user.role}</div>
                            </div>
                          </div>
                        ) : <span className="text-slate-400">system</span>}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {log.episode ? log.episode.caseId : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] max-w-md truncate">
                        {log.reason || (log.metadata ? log.metadata.substring(0, 80) : "—")}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[10px] text-slate-500 font-mono">
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
