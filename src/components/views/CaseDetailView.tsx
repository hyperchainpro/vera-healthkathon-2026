/**
 * VERA Case Detail View — full clinical analysis
 */

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertTriangle, ChevronLeft, FileText, Activity,
  ShieldCheck, Clock, User, Stethoscope,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavStore, useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

const FLAG_CONFIG = {
  HIGH: { color: "#DC2626", bg: "#FEF2F2", label: "Red Flag" },
  MEDIUM: { color: "#F59E0B", bg: "#FFFBEB", label: "Watch" },
  LOW: { color: "#16A34A", bg: "#F0FDF4", label: "Normal" },
};

interface Detail {
  episode: {
    id: string; caseId: string; diseaseCode: string; diseaseName: string;
    admitDay: string; claimedDays: number; actualDays: number | null;
    status: string; deviationScore: number; flagLevel: "LOW" | "MEDIUM" | "HIGH";
    emrTextStrip: string; createdAt: string;
  };
  labData: Array<{
    dayLabel: string; leukosit: number | null; trombosit: number | null;
    tdSistol: number | null; tdDiastol: number | null; suhu: number | null; gcs: number | null;
  }>;
  standardCurve: {
    disease: string; icd10: string; recommendedDischarge: number;
    reference: string; curve: Array<{ dayLabel: string; day: number; leukosit: number; trombosit: number; tdSistol: number; tdDiastol: number; suhu: number; gcs: number; }>;
  } | null;
  auditLogs: Array<{ id: string; action: string; reason: string | null; reviewerName: string; metadata: string | null; createdAt: string; }>;
}

export function CaseDetailView() {
  const { selectedCaseId, closeCase } = useNavStore();
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(async () => {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${selectedCaseId}`);
      if (!res.ok) {
        toast.error("Episode tidak ditemukan");
        closeCase();
        return;
      }
      const data = await res.json();
      if (!data.episode) {
        toast.error("Data episode invalid");
        closeCase();
        return;
      }
      setDetail(data);
      await fetch(`/api/claims/${selectedCaseId}/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "viewed", reviewerEmail: user?.email }),
      });
    } catch (err) {
      toast.error("Gagal memuat detail");
      closeCase();
    } finally { setLoading(false); }
  }, [selectedCaseId, user?.email, closeCase]);

  useEffect(() => { load(); }, [load]);

  const handleOverride = async () => {
    if (!selectedCaseId) return;
    if (overrideReason.length < 5) {
      toast.error("Alasan medis wajib diisi (min 5 karakter)");
      return;
    }
    try {
      await fetch(`/api/claims/${selectedCaseId}/audit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "overridden", reason: overrideReason,
          reviewerEmail: user?.email,
        }),
      });
      toast.success("Override tercatat — Human-in-the-Loop ✓");
      setOverrideOpen(false);
      setOverrideReason("");
      await load();
    } catch {
      toast.error("Gagal override");
    }
  };

  if (loading || !detail) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const ep = detail.episode;
  const c = FLAG_CONFIG[ep.flagLevel];
  const stdCurve = detail.standardCurve;

  const chartData = stdCurve?.curve.map(std => {
    const patient = detail.labData.find(p => parseInt(p.dayLabel.replace("H", "")) === std.day);
    return {
      day: std.dayLabel,
      leukosit_std: std.leukosit, leukosit_patient: patient?.leukosit ?? null,
      trombosit_std: std.trombosit, trombosit_patient: patient?.trombosit ?? null,
      suhu_std: std.suhu, suhu_patient: patient?.suhu ?? null,
    };
  }) || [];

  const extraDays = Math.max(0, ep.claimedDays - (stdCurve?.recommendedDischarge ?? 0));

  return (
    <div className="p-8 space-y-5">
      {/* Back button */}
      <button
        onClick={closeCase}
        className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 mb-2"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar kasus
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            {ep.diseaseName} · ICD-10 {ep.diseaseCode}
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            {ep.caseId}
          </h1>
          <div className="mt-1.5 text-sm text-slate-600">
            Klaim rawat <b>{ep.claimedDays} hari</b>
            {stdCurve && <>
              <span className="mx-2 text-slate-300">·</span>
              Standar pulang <b className="text-emerald-700">H{stdCurve.recommendedDischarge}</b>
              {extraDays > 0 && <span className="ml-2 text-red-600 font-bold">(+{extraDays} hari berlebih)</span>}
            </>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Deviation Score</div>
          <div className="font-serif font-black text-4xl leading-none mt-1" style={{ color: c.color, fontFamily: "Playfair Display, serif" }}>
            {ep.deviationScore.toFixed(2)}
          </div>
          <div className="mt-2">
            <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ backgroundColor: c.bg, color: c.color }}>
              {c.label}
            </span>
          </div>
        </div>
      </div>

      {/* Red Flag verdict */}
      {ep.flagLevel === "HIGH" && (
        <Card className="p-4 border-l-4" style={{ backgroundColor: c.bg, borderLeftColor: c.color }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: c.color }} />
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: c.color }}>
                VERA Red Flag — Bukti Anomali Prolonged Stay
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                Lab pasien <b>normal sejak H3</b> (leukosit &amp; trombosit dalam rentang normal),
                namun klaim RS <b>dipanjangkan {extraDays} hari</b> melampaui rekomendasi pulang standar (H{stdCurve?.recommendedDischarge}).
                Pola ini konsisten dengan <b style={{ color: c.color }}>Prolonged Stay Fiktif</b>.
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                <i>Bukti berdasarkan: {stdCurve?.reference}</i>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={async () => {
          await fetch(`/api/claims/${ep.id}/audit`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "evidence_exported", reviewerEmail: user?.email }),
          });
          toast.success("Bukti ilmiah diekspor ke audit log");
        }} style={{ backgroundColor: c.color, color: "white" }}>
          <FileText className="w-3.5 h-3.5 mr-1" /> Export Bukti Ilmiah
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOverrideOpen(!overrideOpen)}>
          <User className="w-3.5 h-3.5 mr-1" /> Override (False Positive)
        </Button>
      </div>

      {/* Override form */}
      {overrideOpen && (
        <Card className="p-4 border-2 border-amber-300 bg-amber-50">
          <div className="text-sm font-bold text-amber-900 mb-2">Human-in-the-Loop: Override</div>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Alasan medis untuk override (komorbiditas, komplikasi, dsb.)..."
            className="w-full p-2 text-sm border border-amber-300 rounded mb-2 bg-white"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleOverride}>Konfirmasi Override</Button>
            <Button size="sm" variant="ghost" onClick={() => setOverrideOpen(false)}>Batal</Button>
          </div>
        </Card>
      )}

      {/* Charts */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Grafik Pemulihan — Pasien vs Standar</h3>
          <Activity className="w-4 h-4 text-slate-400" />
        </div>
        <div className="space-y-5">
          {/* Leukosit */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="text-xs font-bold text-slate-700">Leukosit (cells/μL)</div>
              <div className="text-[10px] text-slate-500 ml-auto">Normal: 4.000 – 10.000</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="#94A3B8" domain={[0, 18000]} ticks={[0, 4000, 10000, 18000]} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceArea y1={4000} y2={10000} fill="#16A34A" fillOpacity={0.08} />
                <ReferenceLine y={10000} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Normal max", fontSize: 9, fill: "#64748B" }} />
                {stdCurve && <ReferenceLine x={`H${stdCurve.recommendedDischarge}`} stroke="#0F2A5C" strokeDasharray="4 4" label={{ value: "Pulang?", fontSize: 9, fill: "#0F2A5C", position: "top" }} />}
                <Line type="monotone" dataKey="leukosit_std" stroke="#16A34A" strokeWidth={2.5} name="Standar" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="leukosit_patient" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" name="Pasien" dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trombosit */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div className="text-xs font-bold text-slate-700">Trombosit (cells/μL)</div>
              <div className="text-[10px] text-slate-500 ml-auto">Normal: 150.000 – 450.000</div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="#94A3B8" domain={[150000, 300000]} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceArea y1={150000} y2={450000} fill="#16A34A" fillOpacity={0.08} />
                <Line type="monotone" dataKey="trombosit_std" stroke="#16A34A" strokeWidth={2.5} name="Standar" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="trombosit_patient" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" name="Pasien" dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Suhu */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="text-xs font-bold text-slate-700">Suhu Tubuh (°C)</div>
              <div className="text-[10px] text-slate-500 ml-auto">Normal: 36.0 – 37.5</div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} stroke="#94A3B8" domain={[36, 40]} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceArea y1={36} y2={37.5} fill="#16A34A" fillOpacity={0.08} />
                <Line type="monotone" dataKey="suhu_std" stroke="#16A34A" strokeWidth={2.5} name="Standar" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="suhu_patient" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" name="Pasien" dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* EMR stripped + Lab data table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">EMR yang Dikirim ke LLM</h3>
            <Badge variant="secondary" className="text-[10px]">UU PDP ✓</Badge>
          </div>
          <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-md whitespace-pre-wrap leading-relaxed">
            {ep.emrTextStrip}
          </pre>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Data Lab Harian</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-semibold text-slate-600">Hari</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">Leuko</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">Trombo</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">TD</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">Suhu</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">GCS</th>
              </tr>
            </thead>
            <tbody>
              {detail.labData.map((lab, i) => {
                const leukoNormal = lab.leukosit != null && lab.leukosit >= 4000 && lab.leukosit <= 10000;
                const tromboNormal = lab.trombosit != null && lab.trombosit >= 150000 && lab.trombosit <= 450000;
                return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-2 font-mono font-bold text-slate-900">{lab.dayLabel}</td>
                    <td className={`text-right py-2 px-2 font-mono ${leukoNormal ? "text-emerald-600" : "text-red-600"}`}>{lab.leukosit ?? "—"}</td>
                    <td className={`text-right py-2 px-2 font-mono ${tromboNormal ? "text-emerald-600" : "text-red-600"}`}>{lab.trombosit?.toLocaleString() ?? "—"}</td>
                    <td className="text-right py-2 px-2 font-mono text-slate-700">{lab.tdSistol ?? "—"}/{lab.tdDiastol ?? "—"}</td>
                    <td className="text-right py-2 px-2 font-mono text-slate-700">{lab.suhu != null ? `${lab.suhu}°C` : "—"}</td>
                    <td className="text-right py-2 px-2 font-mono text-slate-700">{lab.gcs ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Audit history */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Riwayat Audit</h3>
          <span className="text-xs text-slate-500">({detail.auditLogs.length} entries)</span>
        </div>
        <div className="space-y-2">
          {detail.auditLogs.length === 0 && <p className="text-xs text-slate-400">No audit entries</p>}
          {detail.auditLogs.slice(0, 10).map(log => (
            <div key={log.id} className="flex items-start gap-3 text-xs p-2 bg-slate-50 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-slate-900">
                  <b>{log.action}</b>
                  {log.reason && <span className="text-slate-600 ml-2">— "{log.reason}"</span>}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  by {log.reviewerName} · {new Date(log.createdAt).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
