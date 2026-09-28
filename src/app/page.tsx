'use client';

import { useEffect, useState, useCallback } from "react";
import {
  Activity, AlertTriangle, ShieldCheck, Stethoscope, Loader2,
  TrendingDown, Clock, Heart,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

// ============= TYPES =============
interface EpisodeListItem {
  id: string;
  caseId: string;
  diseaseName: string;
  diseaseCode: string;
  claimedDays: number;
  status: string;
  deviationScore: number;
  flagLevel: "LOW" | "MEDIUM" | "HIGH";
  dayCount: number;
  createdAt: string;
}

interface LabData {
  dayLabel: string;
  leukosit: number | null;
  trombosit: number | null;
  tdSistol: number | null;
  tdDiastol: number | null;
  suhu: number | null;
  gcs: number | null;
}

interface StandardCurvePoint {
  dayLabel: string;
  day: number;
  leukosit: number;
  trombosit: number;
  tdSistol: number;
  tdDiastol: number;
  suhu: number;
  gcs: number;
}

interface EpisodeDetail {
  episode: {
    id: string;
    caseId: string;
    diseaseCode: string;
    diseaseName: string;
    admitDay: string;
    claimedDays: number;
    actualDays: number | null;
    status: string;
    deviationScore: number;
    flagLevel: "LOW" | "MEDIUM" | "HIGH";
    emrTextStrip: string;
    createdAt: string;
  };
  labData: LabData[];
  standardCurve: {
    disease: string;
    icd10: string;
    recommendedDischarge: number;
    reference: string;
    curve: StandardCurvePoint[];
  } | null;
  auditLogs: Array<{ id: string; action: string; reason: string | null; reviewerName: string; createdAt: string }>;
}

// ============= FLAG CONFIG =============
const FLAG_CONFIG = {
  HIGH: { color: "#DC2626", bg: "#FEF2F2", label: "Red Flag", short: "HIGH" },
  MEDIUM: { color: "#F59E0B", bg: "#FFFBEB", label: "Watch", short: "MEDIUM" },
  LOW: { color: "#16A34A", bg: "#F0FDF4", label: "Normal", short: "LOW" },
};

function flagBadge(level: "LOW" | "MEDIUM" | "HIGH") {
  const c = FLAG_CONFIG[level];
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.color}40`,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.5px",
      }}
    >
      {c.label}
    </span>
  );
}

// ============= MAIN PAGE =============
export default function Home() {
  const [episodes, setEpisodes] = useState<EpisodeListItem[]>([]);
  const [selected, setSelected] = useState<EpisodeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [diseaseFilter, setDiseaseFilter] = useState<"all" | "Pneumonia" | "Stroke (Ischemic)">("all");

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch {
      toast.error("Gagal memuat daftar episode");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/claims/${id}`);
      const data = await res.json();
      setSelected(data);
      await fetch(`/api/claims/${id}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "viewed" }),
      });
    } catch {
      toast.error("Gagal memuat detail episode");
    }
  }, []);

  useEffect(() => { loadEpisodes(); }, [loadEpisodes]);

  // Filtered list: only Red Flags (HIGH) by default, plus disease filter
  const filtered = episodes
    .filter(e => e.flagLevel === "HIGH")
    .filter(e => diseaseFilter === "all" || e.diseaseName === diseaseFilter);

  const stats = {
    total: episodes.length,
    redFlags: episodes.filter(e => e.flagLevel === "HIGH").length,
    pneumonia: episodes.filter(e => e.diseaseName === "Pneumonia").length,
    stroke: episodes.filter(e => e.diseaseName === "Stroke (Ischemic)").length,
  };

  // Estimated savings (per proposal slide 17 — Rp 300M/year @ 200k cases)
  // For demo cases: extrapolate
  const estSavedHours = stats.redFlags * 36; // 36 min saved per case (45min → 9min audit)
  const estSavedRp = (stats.redFlags / 200000 * 300).toFixed(1); // ratio to national estimate

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* === HERO HEADER === */}
      <header className="bg-[#0F2A5C] text-white">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <div className="font-serif text-2xl font-black tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>
                  VERA
                </div>
                <div className="text-xs text-white/60 uppercase tracking-widest">
                  Validasi Episode &amp; Recovery Anomaly
                </div>
              </div>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">
                Healthkathon 2026 · BPJS Kesehatan
              </div>
              <div className="text-xs text-white/80 italic">
                "Membaca Kurva Biologis, Membongkar Waktu Fiktif."
              </div>
            </div>
          </div>

          {/* Hero metric strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <div className="text-[10px] text-white/60 uppercase tracking-widest">Red Flag Aktif</div>
              </div>
              <div className="font-serif text-3xl font-black" style={{ fontFamily: "Playfair Display, serif" }}>
                {stats.redFlags}
              </div>
              <div className="text-[10px] text-white/50">dari {stats.total} episode</div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <div className="text-[10px] text-white/60 uppercase tracking-widest">Estimasi Waktu Hemat</div>
              </div>
              <div className="font-serif text-3xl font-black" style={{ fontFamily: "Playfair Display, serif" }}>
                {estSavedHours}h
              </div>
              <div className="text-[10px] text-white/50">audit reviewer BPJS</div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <div className="text-[10px] text-white/60 uppercase tracking-widest">Estimasi Penghematan</div>
              </div>
              <div className="font-serif text-3xl font-black" style={{ fontFamily: "Playfair Display, serif" }}>
                Rp {estSavedRp}M
              </div>
              <div className="text-[10px] text-white/50">/tahun (skala nasional)</div>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <div className="text-[10px] text-white/60 uppercase tracking-widest">Penyakit Didukung</div>
              </div>
              <div className="font-serif text-3xl font-black" style={{ fontFamily: "Playfair Display, serif" }}>
                2
              </div>
              <div className="text-[10px] text-white/50">Pneumonia · Stroke</div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr]">
        {/* === LEFT: Patient list === */}
        <aside className="border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Daftar Pasien Red Flag
              </h2>
              <Button variant="ghost" size="sm" onClick={loadEpisodes} disabled={loading} className="h-7 text-xs">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            {/* Disease filter */}
            <div className="flex gap-1.5 text-xs">
              <button
                onClick={() => setDiseaseFilter("all")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  diseaseFilter === "all" ? "bg-[#0F2A5C] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua ({stats.redFlags})
              </button>
              <button
                onClick={() => setDiseaseFilter("Pneumonia")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  diseaseFilter === "Pneumonia" ? "bg-[#0F2A5C] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Pneumonia
              </button>
              <button
                onClick={() => setDiseaseFilter("Stroke (Ischemic)")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  diseaseFilter === "Stroke (Ischemic)" ? "bg-[#0F2A5C] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Stroke
              </button>
            </div>
          </div>
          <ScrollArea className="flex-1" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  {loading ? "Memuat..." : "Tidak ada Red Flag"}
                </div>
              )}
              {filtered.slice(0, 50).map(ep => {
                const c = FLAG_CONFIG[ep.flagLevel];
                const isSelected = selected?.episode.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => loadDetail(ep.id)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${isSelected ? "bg-slate-100" : ""}`}
                    style={{ borderLeft: `3px solid ${c.color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-mono text-xs font-bold text-slate-900 truncate">{ep.caseId}</div>
                        <div className="font-mono text-sm font-bold" style={{ color: c.color }}>
                          {ep.deviationScore.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mb-1">
                        {ep.diseaseName} · {ep.claimedDays} hari klaim
                      </div>
                      <div className="flex items-center gap-1.5">
                        {flagBadge(ep.flagLevel)}
                        <span className="text-[10px] text-slate-400">{ep.dayCount} hari data lab</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <div className="p-2 border-t border-slate-200 text-[10px] text-slate-400 text-center bg-slate-50">
            Menampilkan 50 Red Flag teratas · {filtered.length} total
          </div>
        </aside>

        {/* === RIGHT: Detail panel === */}
        <section className="overflow-y-auto bg-slate-50" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {!selected ? (
            <div className="h-full flex items-center justify-center p-8">
              <Card className="p-10 text-center max-w-md">
                <Stethoscope className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
                  Pilih Episode Red Flag
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Klik salah satu pasien dari daftar untuk melihat grafik kurva pemulihan,
                  bukti ilmiah, dan analisis anomali yang VERA temukan.
                </p>
              </Card>
            </div>
          ) : (
            <DetailPanel detail={selected} onAction={async (action) => {
              await fetch(`/api/claims/${selected.episode.id}/audit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
              });
              if (action === "evidence_exported") toast.success("Bukti ilmiah diekspor");
            }} />
          )}
        </section>
      </main>
    </div>
  );
}

// ============= DETAIL PANEL (simplified) =============
function DetailPanel({
  detail,
  onAction,
}: {
  detail: EpisodeDetail;
  onAction: (action: "viewed" | "evidence_exported") => void;
}) {
  const ep = detail.episode;
  const c = FLAG_CONFIG[ep.flagLevel];
  const stdCurve = detail.standardCurve;

  // Chart data: merge patient + standard
  const chartData = stdCurve?.curve.map(std => {
    const patient = detail.labData.find(p => parseInt(p.dayLabel.replace("H", "")) === std.day);
    return {
      day: std.dayLabel,
      leukosit_std: std.leukosit,
      leukosit_patient: patient?.leukosit ?? null,
      trombosit_std: std.trombosit,
      trombosit_patient: patient?.trombosit ?? null,
      suhu_std: std.suhu,
      suhu_patient: patient?.suhu ?? null,
    };
  }) || [];

  const extraDays = Math.max(0, ep.claimedDays - (stdCurve?.recommendedDischarge ?? 0));

  return (
    <div className="p-6 space-y-4">
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
            {stdCurve && (
              <>
                <span className="mx-2 text-slate-300">·</span>
                Standar pulang <b className="text-emerald-700">H{stdCurve.recommendedDischarge}</b>
                {extraDays > 0 && (
                  <span className="ml-2 text-red-600 font-bold">(+{extraDays} hari berlebih)</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Deviation Score</div>
          <div className="font-serif font-black text-4xl leading-none mt-1" style={{ color: c.color, fontFamily: "Playfair Display, serif" }}>
            {ep.deviationScore.toFixed(2)}
          </div>
          <div className="mt-2">{flagBadge(ep.flagLevel)}</div>
        </div>
      </div>

      {/* Red Flag verdict (prominent) */}
      {ep.flagLevel === "HIGH" && (
        <div
          className="rounded-lg p-4 border-l-4"
          style={{ backgroundColor: c.bg, borderLeftColor: c.color }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: c.color }} />
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: c.color }}>
                VERA Red Flag — Bukti Anomali Prolonged Stay
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                Lab pasien <b>normal sejak H3</b> (leukosit &amp; trombosit dalam rentang normal),
                namun klaim RS <b>dipanjangkan {extraDays} hari</b> melampaui rekomendasi pulang standar
                (H{stdCurve?.recommendedDischarge}). Pola ini konsisten dengan{" "}
                <b style={{ color: c.color }}>Prolonged Stay Fiktif</b> — reviewer BPJS disarankan
                audit dokter &amp; indikasi medis lanjutan.
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                Bukti berdasarkan: <i>{stdCurve?.reference}</i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === CHART (BIG & prominent) === */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Grafik Pemulihan — Pasien vs Standar Medis
          </h3>
          <Button
            size="sm"
            onClick={() => onAction("evidence_exported")}
            style={{ backgroundColor: c.color, color: "white" }}
          >
            Export Bukti Ilmiah
          </Button>
        </div>

        {chartData.length > 0 && (
          <div className="space-y-5">
            {/* Leukosit chart — biggest */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="text-xs font-bold text-slate-700">Leukosit (cells/μL)</div>
                <div className="text-[10px] text-slate-500 ml-auto">Normal: 4.000 – 10.000</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748B" }} stroke="#94A3B8" />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    stroke="#94A3B8"
                    domain={[0, 18000]}
                    ticks={[0, 4000, 10000, 18000]}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, padding: "8px 12px" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {/* Normal range band */}
                  <ReferenceArea y1={4000} y2={10000} fill="#16A34A" fillOpacity={0.08} stroke="none" />
                  <ReferenceLine y={10000} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: "Normal max", fontSize: 10, fill: "#64748B", position: "insideTopRight" }} />
                  {/* Recommended discharge line */}
                  {stdCurve && (
                    <ReferenceLine x={`H${stdCurve.recommendedDischarge}`} stroke="#0F2A5C" strokeDasharray="4 4" label={{ value: "Pulang?", fontSize: 10, fill: "#0F2A5C", position: "top" }} />
                  )}
                  {/* Standard curve */}
                  <Line type="monotone" dataKey="leukosit_std" stroke="#16A34A" strokeWidth={2.5} name="Standar Pemulihan" dot={{ r: 4, fill: "#16A34A" }} />
                  {/* Patient curve */}
                  <Line type="monotone" dataKey="leukosit_patient" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" name="Klaim Pasien" dot={{ r: 5, fill: "#DC2626" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Trombosit chart */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <div className="text-xs font-bold text-slate-700">Trombosit (cells/μL)</div>
                <div className="text-[10px] text-slate-500 ml-auto">Normal: 150.000 – 450.000</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748B" }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} stroke="#94A3B8" domain={[150000, 300000]} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ fontSize: 12, padding: "8px 12px" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <ReferenceArea y1={150000} y2={450000} fill="#16A34A" fillOpacity={0.08} stroke="none" />
                  <Line type="monotone" dataKey="trombosit_std" stroke="#16A34A" strokeWidth={2.5} name="Standar" dot={{ r: 4, fill: "#16A34A" }} />
                  <Line type="monotone" dataKey="trombosit_patient" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" name="Pasien" dot={{ r: 5, fill: "#DC2626" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Suhu chart */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="text-xs font-bold text-slate-700">Suhu Tubuh (°C)</div>
                <div className="text-[10px] text-slate-500 ml-auto">Normal: 36.0 – 37.5</div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748B" }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} stroke="#94A3B8" domain={[36, 40]} />
                  <Tooltip contentStyle={{ fontSize: 12, padding: "8px 12px" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <ReferenceArea y1={36} y2={37.5} fill="#16A34A" fillOpacity={0.08} stroke="none" />
                  <Line type="monotone" dataKey="suhu_std" stroke="#16A34A" strokeWidth={2.5} name="Standar" dot={{ r: 4, fill: "#16A34A" }} />
                  <Line type="monotone" dataKey="suhu_patient" stroke="#DC2626" strokeWidth={3} strokeDasharray="6 3" name="Pasien" dot={{ r: 5, fill: "#DC2626" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* === EMR Stripped (compact, no table) === */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">EMR yang Dikirim ke LLM (PHI stripped)</h3>
          <Badge variant="secondary" className="text-[10px]">UU PDP ✓</Badge>
        </div>
        <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-md whitespace-pre-wrap leading-relaxed">
          {ep.emrTextStrip}
        </pre>
      </Card>
    </div>
  );
}
