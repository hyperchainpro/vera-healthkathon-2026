/**
 * VERA Dashboard View — KPIs + charts + recent activity
 * Inspired by Vercel dashboard + Stripe analytics
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle, Clock, TrendingDown, Heart, Activity, ArrowUpRight,
  FileText, Users, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { useNavStore } from "@/lib/auth-store";

interface Stats {
  kpis: {
    total: number;
    redFlags: number;
    watch: number;
    normal: number;
    avgScore: number;
    estSavingsM: string;
    estTimeSavedHours: number;
  };
  diseaseDistribution: Array<{ name: string; count: number }>;
  dailyUploads: Array<{ date: string; total: number; red: number }>;
  topRedFlags: Array<{
    id: string; caseId: string; diseaseName: string;
    claimedDays: number; deviationScore: number; flagLevel: string; createdAt: string;
  }>;
  topReviewers: Array<{ email: string; name: string; actions: number }>;
}

const FLAG_COLORS = { HIGH: "#DC2626", MEDIUM: "#F59E0B", LOW: "#16A34A" };
const DISEASE_COLORS = ["#0EA5E9", "#0F2A5C", "#16A34A", "#F59E0B"];

export function DashboardView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { openCase, setView } = useNavStore();

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const k = stats.kpis;

  return (
    <div className="p-8 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4" style={{ borderLeftColor: "#DC2626" }}>
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Red Flag</span>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            {k.redFlags}
          </div>
          <div className="text-xs text-slate-500 mt-1">dari {k.total} episode</div>
        </Card>

        <Card className="p-5 border-l-4" style={{ borderLeftColor: "#0EA5E9" }}>
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-sky-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Waktu Hemat</span>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            {k.estTimeSavedHours}h
          </div>
          <div className="text-xs text-slate-500 mt-1">audit reviewer</div>
        </Card>

        <Card className="p-5 border-l-4" style={{ borderLeftColor: "#16A34A" }}>
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-emerald-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Estimasi Hemat</span>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            Rp {k.estSavingsM}M
          </div>
          <div className="text-xs text-slate-500 mt-1">/tahun (skala nasional)</div>
        </Card>

        <Card className="p-5 border-l-4" style={{ borderLeftColor: "#0F2A5C" }}>
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-blue-700" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Penyakit</span>
          </div>
          <div className="font-serif text-3xl font-black text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            {stats.diseaseDistribution.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">didukung VERA</div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload trend */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Trend Upload &amp; Red Flag</h3>
              <p className="text-[10px] text-slate-500">7 hari terakhir</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.dailyUploads}>
              <defs>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748B" }} stroke="#94A3B8" tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="#94A3B8" />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="total" stroke="#0EA5E9" strokeWidth={2} fill="url(#totalGrad)" name="Total Upload" />
              <Area type="monotone" dataKey="red" stroke="#DC2626" strokeWidth={2} fill="url(#redGrad)" name="Red Flag" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Disease distribution */}
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Distribusi Penyakit</h3>
            <p className="text-[10px] text-slate-500">Episode per kategori</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.diseaseDistribution}
                dataKey="count"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {stats.diseaseDistribution.map((_, i) => (
                  <Cell key={i} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {stats.diseaseDistribution.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DISEASE_COLORS[i] }} />
                  <span className="text-slate-700">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Red Flags + Top Reviewers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Red Flag Cases</h3>
              <p className="text-[10px] text-slate-500">Skor deviasi tertinggi</p>
            </div>
            <button
              onClick={() => setView("cases")}
              className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1"
            >
              Lihat semua <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {stats.topRedFlags.map((ep, i) => (
              <button
                key={ep.id}
                onClick={() => { setView("cases"); openCase(ep.id); }}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs text-slate-400 w-6">#{i + 1}</div>
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{ep.caseId}</div>
                    <div className="text-[10px] text-slate-500">{ep.diseaseName} · {ep.claimedDays} hari klaim</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                    backgroundColor: FLAG_COLORS[ep.flagLevel as keyof typeof FLAG_COLORS] + "20",
                    color: FLAG_COLORS[ep.flagLevel as keyof typeof FLAG_COLORS],
                  }}>
                    {ep.flagLevel}
                  </span>
                  <div className="font-mono text-sm font-bold" style={{ color: FLAG_COLORS[ep.flagLevel as keyof typeof FLAG_COLORS] }}>
                    {ep.deviationScore.toFixed(2)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Reviewer</h3>
              <p className="text-[10px] text-slate-500">Aktivitas 7 hari</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {stats.topReviewers.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>
            )}
            {stats.topReviewers.map((r, i) => (
              <div key={r.email} className="flex items-center gap-3">
                <div className="font-mono text-xs text-slate-400 w-6">#{i + 1}</div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-[10px] font-bold text-white">
                  {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">{r.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{r.email}</div>
                </div>
                <div className="text-xs font-bold text-slate-700">{r.actions}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
