'use client';

import { useEffect, useState, useCallback } from "react";
import {
  Activity, Upload, AlertTriangle, ShieldCheck, FileText,
  ChevronRight, Clock, User, Stethoscope, Loader2, CheckCircle2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface AuditLog {
  id: string;
  action: string;
  reason: string | null;
  reviewerName: string;
  metadata: string | null;
  createdAt: string;
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
  auditLogs: AuditLog[];
}

// ============= FLAG LEVEL HELPERS =============
const FLAG_CONFIG = {
  HIGH: { color: "#DC2626", bg: "#FEF2F2", label: "Red Flag" },
  MEDIUM: { color: "#F59E0B", bg: "#FFFBEB", label: "Watch" },
  LOW: { color: "#16A34A", bg: "#F0FDF4", label: "Normal" },
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
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<"all" | "HIGH" | "MEDIUM" | "LOW">("HIGH");

  // Upload form state
  const [caseId, setCaseId] = useState("");
  const [emrText, setEmrText] = useState("");
  const [claimedDays, setClaimedDays] = useState(7);

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
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
      // Log "viewed" action
      await fetch(`/api/claims/${id}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "viewed" }),
      });
    } catch (err) {
      toast.error("Gagal memuat detail episode");
    }
  }, []);

  useEffect(() => { loadEpisodes(); }, [loadEpisodes]);

  const handleUpload = async () => {
    if (!caseId || !emrText) {
      toast.error("Case ID dan EMR Text wajib diisi");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          emrText,
          claimedDays,
          diseaseName: "Pneumonia",
          diseaseCode: "J18.9",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Episode ${data.caseId} — flag: ${data.flagLevel} (score ${data.deviationScore})`);
        setCaseId("");
        setEmrText("");
        setClaimedDays(7);
        await loadEpisodes();
      } else {
        toast.error(data.error || "Upload gagal");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setUploading(false);
    }
  };

  const handleOverride = async (reason: string) => {
    if (!selected) return;
    if (!reason || reason.length < 5) {
      toast.error("Alasan medis wajib diisi (min 5 karakter)");
      return;
    }
    try {
      await fetch(`/api/claims/${selected.episode.id}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "overridden",
          reason,
          reviewerEmail: "reviewer@bpjs.go.id",
        }),
      });
      toast.success("Episode ditandai sebagai False Positive (Human-in-the-Loop)");
      await loadDetail(selected.episode.id);
      await loadEpisodes();
    } catch (err) {
      toast.error("Gagal override");
    }
  };

  const handleSeedDemo = async () => {
    setCaseId("PNEU-2026-DEMO-001");
    setEmrText(`Pasien: Bapak Demo Test, NIK: 3175070101900001
Diagnosis: Pneumonia (J18.9)

H1: Pasien sadar penuh, GCS 15. TD 115/75, Nadi 88, Suhu 38.8°C. Lab: Leukosit 14500, Trombosit 220000. Diagnosis: Pneumonia komunitas. Mulai antibiotik IV.

H3: Pasien kondisi membaik. GCS 15. TD 118/78. Suhu 37.2°C. Lab: Leukosit 8500, Trombosit 245000. Auskultasi paru membaik.

H7: Kondisi stabil. GCS 15. TD 120/80. Suhu 36.7°C. Lab: Leukosit 7800, Trombosit 258000. Dokter: masih perlu observasi lanjut.`);
    setClaimedDays(7);
    toast.info("Klik 'Upload & Analyze' untuk proses kasus demo ANOMALY");
  };

  // Filtered list
  const filtered = filter === "all"
    ? episodes
    : episodes.filter(e => e.flagLevel === filter);

  // Stats
  const stats = {
    total: episodes.length,
    high: episodes.filter(e => e.flagLevel === "HIGH").length,
    medium: episodes.filter(e => e.flagLevel === "MEDIUM").length,
    low: episodes.filter(e => e.flagLevel === "LOW").length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0F2A5C] text-white border-b border-slate-800">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-tight" style={{ fontFamily: "Playfair Display, serif" }}>
                VERA <span className="text-red-400">·</span> Reviewer Dashboard
              </div>
              <div className="text-[10px] text-white/60 uppercase tracking-widest">Validasi Episode &amp; Recovery Anomaly</div>
            </div>
          </div>
          <div className="text-xs text-white/70 hidden md:block">
            Healthkathon 2026 · BPJS Kesehatan
          </div>
        </div>
      </header>

      {/* Stat bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600">Total:</span>
            <span className="font-bold text-slate-900">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: FLAG_CONFIG.HIGH.color }} />
            <span className="text-slate-600">Red Flag:</span>
            <span className="font-bold" style={{ color: FLAG_CONFIG.HIGH.color }}>{stats.high}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: FLAG_CONFIG.MEDIUM.color }} />
            <span className="text-slate-600">Watch:</span>
            <span className="font-bold" style={{ color: FLAG_CONFIG.MEDIUM.color }}>{stats.medium}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: FLAG_CONFIG.LOW.color }} />
            <span className="text-slate-600">Normal:</span>
            <span className="font-bold" style={{ color: FLAG_CONFIG.LOW.color }}>{stats.low}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0">
        {/* LEFT: Patient list */}
        <aside className="border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Daftar Pasien</h2>
              <Button variant="ghost" size="sm" onClick={loadEpisodes} disabled={loading} className="ml-auto h-7 text-xs">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="grid grid-cols-4 h-8 text-xs">
                <TabsTrigger value="HIGH" className="text-[10px]">Red</TabsTrigger>
                <TabsTrigger value="MEDIUM" className="text-[10px]">Watch</TabsTrigger>
                <TabsTrigger value="LOW" className="text-[10px]">Normal</TabsTrigger>
                <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="flex-1" style={{ maxHeight: "calc(100vh - 180px)" }}>
            <div className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  {loading ? "Memuat..." : "Tidak ada episode pada filter ini"}
                </div>
              )}
              {filtered.map(ep => {
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
                        <span className="text-[10px] text-slate-400">{ep.dayCount} data lab</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* RIGHT: Detail panel */}
        <section className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
          {!selected ? (
            <div className="p-8">
              <Card className="p-8 text-center">
                <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Pilih episode untuk review</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Atau upload kasus baru untuk verifikasi VERA
                </p>
                <div className="max-w-2xl mx-auto space-y-4 text-left">
                  <div>
                    <Label htmlFor="caseId">Case ID</Label>
                    <Input
                      id="caseId"
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      placeholder="PNEU-2026-XXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="claimedDays">Klaim Hari Rawat</Label>
                    <Input
                      id="claimedDays"
                      type="number"
                      value={claimedDays}
                      onChange={(e) => setClaimedDays(parseInt(e.target.value) || 0)}
                      min={1}
                      max={30}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emrText">Teks EMR (raw)</Label>
                    <Textarea
                      id="emrText"
                      value={emrText}
                      onChange={(e) => setEmrText(e.target.value)}
                      placeholder="Paste teks rekam medis di sini. VERA akan strip PHI otomatis sebelum kirim ke LLM."
                      className="font-mono text-xs min-h-[180px]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      ⚠️ VERA akan otomatis strip: NIK, nama, alamat, BPJS, phone, email sebelum kirim ke LLM.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                      {uploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Upload &amp; Analyze</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleSeedDemo}>
                      Demo Anomaly
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <DetailPanel
              detail={selected}
              onOverride={handleOverride}
              onAction={async (action) => {
                await fetch(`/api/claims/${selected.episode.id}/audit`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action }),
                });
                if (action === "evidence_exported") {
                  toast.success("Bukti ilmiah diekspor ke audit log");
                }
                await loadDetail(selected.episode.id);
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}

// ============= DETAIL PANEL =============
function DetailPanel({
  detail,
  onOverride,
  onAction,
}: {
  detail: EpisodeDetail;
  onOverride: (reason: string) => void;
  onAction: (action: "viewed" | "flagged" | "evidence_exported") => void;
}) {
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const ep = detail.episode;
  const c = FLAG_CONFIG[ep.flagLevel];
  const stdCurve = detail.standardCurve;
  const flagConf = FLAG_CONFIG[ep.flagLevel];

  // Build chart data: merge patient lab data with standard curve per day
  const chartData = stdCurve?.curve.map(std => {
    const patient = detail.labData.find(p => parseInt(p.dayLabel.replace("H", "")) === std.day);
    return {
      day: std.dayLabel,
      leukosit_std: std.leukosit,
      leukosit_patient: patient?.leukosit ?? null,
      trombosit_std: std.trombosit,
      trombosit_patient: patient?.trombosit ?? null,
    };
  }) || [];

  const extraDays = Math.max(0, ep.claimedDays - (stdCurve?.recommendedDischarge ?? 0));

  return (
    <div className="p-6 space-y-5">
      {/* Header bar */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            {ep.diseaseName} · ICD-10 {ep.diseaseCode} · {detail.labData.length} hari data lab
          </div>
          <h1 className="font-serif text-2xl font-bold text-slate-900" style={{ fontFamily: "Playfair Display, serif" }}>
            {ep.caseId}
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            Klaim rawat: <b>{ep.claimedDays} hari</b>
            {stdCurve && (
              <> · Standar pulang: <b>H{stdCurve.recommendedDischarge}</b>
              {extraDays > 0 && (
                <span className="ml-1 text-red-600 font-semibold">(+{extraDays} hari)</span>
              )}
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Deviation Score</div>
          <div className="font-serif font-bold text-3xl" style={{ color: flagConf.color, fontFamily: "Playfair Display, serif" }}>
            {ep.deviationScore.toFixed(2)}
          </div>
          <div className="mt-1">{flagBadge(ep.flagLevel)}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => onAction("evidence_exported")}
          style={{ backgroundColor: c.color, color: "white" }}
        >
          <FileText className="w-3 h-3 mr-1" /> Bukti Ilmiah
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction("flagged")}>
          <AlertTriangle className="w-3 h-3 mr-1" /> Tandai untuk Audit Lanjut
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowOverride(!showOverride)}
          className="border-slate-400 text-slate-600"
        >
          <User className="w-3 h-3 mr-1" /> Override (False Positive)
        </Button>
      </div>

      {/* Override form */}
      {showOverride && (
        <Card className="p-4 border-2 border-amber-300 bg-amber-50">
          <div className="text-sm font-bold text-amber-900 mb-2">
            Human-in-the-Loop: Tandai sebagai False Positive
          </div>
          <p className="text-xs text-amber-700 mb-3">
            Hanya jika ada alasan medis kuat bahwa anomali ini wajar (komorbiditas, komplikasi, dsb).
            Keputusan ini akan tercatat di audit log dengan nama reviewer.
          </p>
          <Textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Contoh: Pasien memiliki komorbiditas COPD sehingga butuh observasi lebih lama..."
            className="mb-2 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onOverride(overrideReason);
                setShowOverride(false);
                setOverrideReason("");
              }}
            >
              Konfirmasi Override
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowOverride(false)}>
              Batal
            </Button>
          </div>
        </Card>
      )}

      {/* Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Kurva Pemulihan — Pasien vs Standar
          </h3>
          {stdCurve && (
            <div className="text-[10px] text-slate-500">
              Ref: {stdCurve.reference}
            </div>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="space-y-4">
            {/* Leukosit chart */}
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">
                Leukosit (cells/μL) — normal: 4,000–10,000
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="leukoStd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748B" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, padding: "6px 10px" }}
                    labelStyle={{ fontSize: 11, color: "#64748B" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="leukosit_std"
                    stroke="#16A34A"
                    strokeWidth={2}
                    fill="url(#leukoStd)"
                    name="Standar Pneumonia"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leukosit_patient"
                    stroke="#DC2626"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    name="Klaim Pasien"
                    dot={{ r: 4, fill: "#DC2626" }}
                  />
                  <ReferenceLine y={10000} stroke="#94A3B8" strokeDasharray="2 2" label={{ value: "Normal max", fontSize: 9, fill: "#64748B" }} />
                  {stdCurve && stdCurve.recommendedDischarge && (
                    <ReferenceLine x={`H${stdCurve.recommendedDischarge}`} stroke="#DC2626" strokeDasharray="3 3" label={{ value: "Pulang?", fontSize: 9, fill: "#DC2626" }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Trombosit chart */}
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1">
                Trombosit (cells/μL) — normal: 150,000–450,000
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#64748B" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748B" domain={[150000, 300000]} />
                  <Tooltip contentStyle={{ fontSize: 12, padding: "6px 10px" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="trombosit_std" stroke="#16A34A" strokeWidth={2} name="Standar" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="trombosit_patient" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 3" name="Pasien" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {ep.flagLevel === "HIGH" && (
          <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.color}` }}>
            <div className="text-xs font-bold mb-1" style={{ color: c.color }}>
              ⚠️ VERA Red Flag Analysis
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              Lab pasien normal sejak H3 (leukosit &amp; trombosit dalam rentang normal), klaim dipanjangkan {extraDays} hari
              melampaui rekomendasi pulang standar (H{stdCurve?.recommendedDischarge}).
              Pola ini konsisten dengan <b>Prolonged Stay Fiktif</b> — reviewer disarankan audit dokter &amp; indikasi medis lanjutan.
            </div>
          </div>
        )}
      </Card>

      {/* Stripped EMR */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">EMR yang Dikirim ke LLM (PHI stripped)</h3>
          <Badge variant="secondary" className="text-[10px]">Data Stripping ✓</Badge>
        </div>
        <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-md whitespace-pre-wrap leading-relaxed">
          {ep.emrTextStrip}
        </pre>
      </Card>

      {/* Lab data table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Data Lab Harian (Hasil Ekstraksi LLM)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-semibold text-slate-600">Hari</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">Leukosit</th>
                <th className="text-right py-2 px-2 font-semibold text-slate-600">Trombosit</th>
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
                    <td className={`text-right py-2 px-2 font-mono ${leukoNormal ? "text-emerald-600" : "text-red-600"}`}>
                      {lab.leukosit ?? "—"}
                    </td>
                    <td className={`text-right py-2 px-2 font-mono ${tromboNormal ? "text-emerald-600" : "text-red-600"}`}>
                      {lab.trombosit?.toLocaleString() ?? "—"}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-slate-700">
                      {lab.tdSistol ?? "—"}/{lab.tdDiastol ?? "—"}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-slate-700">
                      {lab.suhu != null ? `${lab.suhu}°C` : "—"}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-slate-700">{lab.gcs ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Trail */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Audit Trail</h3>
          <span className="text-xs text-slate-500">({detail.auditLogs.length} entries)</span>
        </div>
        <div className="space-y-2">
          {detail.auditLogs.length === 0 && (
            <p className="text-xs text-slate-400">No audit entries</p>
          )}
          {detail.auditLogs.map(log => (
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
