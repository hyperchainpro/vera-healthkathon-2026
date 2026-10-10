/**
 * VERA Cases View — searchable list with filters
 */

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertTriangle, ShieldCheck, Clock, Search, Filter,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavStore } from "@/lib/auth-store";

interface Episode {
  id: string; caseId: string; diseaseName: string; diseaseCode: string;
  claimedDays: number; status: string; deviationScore: number;
  flagLevel: "LOW" | "MEDIUM" | "HIGH"; dayCount: number; createdAt: string;
}

const FLAG_CONFIG = {
  HIGH: { color: "#DC2626", bg: "#FEF2F2", label: "Red Flag" },
  MEDIUM: { color: "#F59E0B", bg: "#FFFBEB", label: "Watch" },
  LOW: { color: "#16A34A", bg: "#F0FDF4", label: "Normal" },
};

export function CasesView() {
  const { openCase, selectedCaseId } = useNavStore();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [flagFilter, setFlagFilter] = useState<"all" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [diseaseFilter, setDiseaseFilter] = useState<"all" | "Pneumonia" | "Stroke (Ischemic)">("all");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Apply filters
  const filtered = episodes
    .filter(e => flagFilter === "all" || e.flagLevel === flagFilter)
    .filter(e => diseaseFilter === "all" || e.diseaseName === diseaseFilter)
    .filter(e => 
      search === "" || 
      e.caseId.toLowerCase().includes(search.toLowerCase()) || 
      e.diseaseName.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total: episodes.length,
    high: episodes.filter(e => e.flagLevel === "HIGH").length,
    medium: episodes.filter(e => e.flagLevel === "MEDIUM").length,
    low: episodes.filter(e => e.flagLevel === "LOW").length,
  };

  return (
    <div className="p-8 space-y-5">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs">
          {(["all", "HIGH", "MEDIUM", "LOW"] as const).map(f => {
            const count = f === "all" ? stats.total : stats[f.toLowerCase() as "high" | "medium" | "low"];
            const c = f !== "all" ? FLAG_CONFIG[f] : { color: "#0F2A5C", bg: "#EFF6FF", label: "Semua" };
            return (
              <button
                key={f}
                onClick={() => { setFlagFilter(f); setPage(1); }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-2 ${
                  flagFilter === f ? "text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                style={flagFilter === f ? { backgroundColor: c.color } : {}}
              >
                {f === "all" ? "Semua" : c.label}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  flagFilter === f ? "bg-white/20" : "bg-slate-200 text-slate-600"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setDiseaseFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              diseaseFilter === "all" ? "bg-[#0F2A5C] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>Semua Penyakit</button>
          <button
            onClick={() => { setDiseaseFilter("Pneumonia"); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              diseaseFilter === "Pneumonia" ? "bg-[#0F2A5C] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>Pneumonia</button>
          <button
            onClick={() => { setDiseaseFilter("Stroke (Ischemic)"); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              diseaseFilter === "Stroke (Ischemic)" ? "bg-[#0F2A5C] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>Stroke</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Cari case ID (mis. PNEU-2026-0971) atau nama penyakit..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-sky-400"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Tidak ada episode yang cocok dengan filter
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Case ID</th>
                <th className="text-left py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Penyakit</th>
                <th className="text-center py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Klaim Hari</th>
                <th className="text-center py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Data Lab</th>
                <th className="text-center py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Deviation Score</th>
                <th className="text-center py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Flag</th>
                <th className="text-right py-2.5 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(ep => {
                const c = FLAG_CONFIG[ep.flagLevel];
                return (
                  <tr
                    key={ep.id}
                    onClick={() => openCase(ep.id)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    style={{ borderLeft: `3px solid ${c.color}` }}
                  >
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">{ep.caseId}</td>
                    <td className="py-3 px-4 text-xs text-slate-700">{ep.diseaseName}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs">{ep.claimedDays}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs">{ep.dayCount}</td>
                    <td className="py-3 px-4 text-center font-mono text-sm font-bold" style={{ color: c.color }}>
                      {ep.deviationScore.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                        backgroundColor: c.bg, color: c.color,
                      }}>{c.label}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-[10px] text-slate-500 uppercase">{ep.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50">
            <div className="text-xs text-slate-500">
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
              ><ChevronLeft className="w-3.5 h-3.5" /></button>
              <span className="text-xs font-mono px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
              ><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
