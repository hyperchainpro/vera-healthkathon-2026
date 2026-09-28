/**
 * VERA Upload View — single case form + batch upload history
 */

import { useState } from "react";
import {
  Upload, Loader2, FileText, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore, useNavStore } from "@/lib/auth-store";

interface UploadHistory {
  episodeId: string;
  caseId: string;
  deviationScore: number;
  flagLevel: string;
  backend: string;
  createdAt: string;
}

const SAMPLE_TEMPLATES = [
  {
    label: "🦠 Pneumonia Anomaly (H7)",
    caseId: "PNEU-2026-DEMO-001",
    emrText: `Pasien: Bapak Demo Pneumonia, NIK: 3175070101900001
Diagnosis: Pneumonia (J18.9)

H1: Pasien sadar penuh, GCS 15. TD 115/75, Nadi 88, Suhu 38.8°C. Lab: Leukosit 14500, Trombosit 220000. Diagnosis: Pneumonia komunitas. Mulai antibiotik IV.

H3: Pasien kondisi membaik. GCS 15. TD 118/78. Suhu 37.2°C. Lab: Leukosit 8500, Trombosit 245000. Auskultasi paru membaik.

H7: Kondisi stabil. GCS 15. TD 120/80. Suhu 36.7°C. Lab: Leukosit 7800, Trombosit 258000. Dokter: masih perlu observasi lanjut.`,
    claimedDays: 7,
  },
  {
    label: "🧠 Stroke Anomaly (H8)",
    caseId: "STR-2026-DEMO-001",
    emrText: `Pasien: Ibu Demo Stroke, NIK: 3175070101900002
Diagnosis: Stroke (Ischemic) (I63.9)

H1: Pasien sadar, GCS 13. TD 155/95, Suhu 37.2°C. Lab: Leukosit 11500, Trombosit 230000. Diagnosis: Stroke ischemik. Mulai terapi trombolitik.

H3: Defisit neurologis stabil. GCS 14. TD 145/90. Suhu 36.9°C. Lab: Leukosit 9000, Trombosit 245000.

H8: Kondisi stabil. GCS 15. TD 130/85. Suhu 36.7°C. Lab: Leukosit 7800, Trombosit 258000. Dokter: observasi neurologis lanjut.`,
    claimedDays: 8,
  },
  {
    label: "✅ Normal Case (H5)",
    caseId: "PNEU-2026-DEMO-002",
    emrText: `Pasien: Bapak Normal Case, NIK: 3175070101900003
Diagnosis: Pneumonia (J18.9)

H1: Pasien sadar penuh, GCS 15. TD 115/75, Suhu 38.5°C. Lab: Leukosit 14500, Trombosit 220000. Mulai antibiotik.

H3: Kondisi membaik. GCS 15. TD 118/78. Suhu 37.0°C. Lab: Leukosit 8500, Trombosit 245000.

H5: Kondisi stabil. Lab normal. Rencana pulang.`,
    claimedDays: 5,
  },
];

export function UploadView() {
  const { user } = useAuthStore();
  const { setView, openCase } = useNavStore();
  const [caseId, setCaseId] = useState("");
  const [emrText, setEmrText] = useState("");
  const [claimedDays, setClaimedDays] = useState(7);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<UploadHistory[]>([]);
  const [showHistory, setShowHistory] = useState(true);

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
          caseId, emrText, claimedDays,
          diseaseName: "Pneumonia", diseaseCode: "J18.9",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Episode ${data.caseId} — ${data.flagLevel} (score ${data.deviationScore})`);
        setHistory(prev => [{
          episodeId: data.episodeId,
          caseId: data.caseId,
          deviationScore: data.deviationScore,
          flagLevel: data.flagLevel,
          backend: data.extractionBackend || "regex",
          createdAt: new Date().toISOString(),
        }, ...prev]);
        setCaseId(""); setEmrText(""); setClaimedDays(7);
      } else {
        toast.error(data.error || "Upload gagal");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUploading(false);
    }
  };

  const loadTemplate = (template: typeof SAMPLE_TEMPLATES[0]) => {
    setCaseId(template.caseId);
    setEmrText(template.emrText);
    setClaimedDays(template.claimedDays);
  };

  const FLAG_COLORS: Record<string, string> = {
    HIGH: "#DC2626", MEDIUM: "#F59E0B", LOW: "#16A34A",
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Upload form */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Upload Episode Baru</h3>
          </div>

          {/* Quick templates */}
          <div className="mb-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
              Template Cepat (demo)
            </Label>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TEMPLATES.map(t => (
                <button
                  key={t.caseId}
                  onClick={() => loadTemplate(t)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-md font-semibold transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <Label htmlFor="caseId">Case ID</Label>
              <Input id="caseId" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="PNEU-2026-XXXX" />
            </div>
            <div>
              <Label htmlFor="claimedDays">Klaim Hari Rawat</Label>
              <Input id="claimedDays" type="number" value={claimedDays} onChange={(e) => setClaimedDays(parseInt(e.target.value) || 0)} min={1} max={30} />
            </div>
          </div>

          <div>
            <Label htmlFor="emrText">Teks EMR (raw)</Label>
            <Textarea
              id="emrText"
              value={emrText}
              onChange={(e) => setEmrText(e.target.value)}
              placeholder="Paste teks rekam medis di sini. VERA akan strip PHI otomatis sebelum kirim ke LLM."
              className="font-mono text-xs min-h-[200px]"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              ⚠️ VERA akan otomatis strip: NIK, nama, alamat, BPJS, phone, email sebelum kirim ke LLM.
            </p>
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="mt-4 w-full">
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload &amp; Analyze</>
            )}
          </Button>
        </Card>

        {/* History */}
        <Card className="p-5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Riwayat Upload Saya</h3>
              <span className="text-xs text-slate-500">({history.length})</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada upload. Coba template demo di atas.</p>
              ) : history.map(h => (
                <button
                  key={h.episodeId}
                  onClick={() => { setView("cases"); openCase(h.episodeId); }}
                  className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-md text-left"
                >
                  <div className="font-mono text-xs font-bold text-slate-900">{h.caseId}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{h.backend}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                      backgroundColor: (FLAG_COLORS[h.flagLevel] || "#64748B") + "20",
                      color: FLAG_COLORS[h.flagLevel] || "#64748B",
                    }}>{h.flagLevel}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: FLAG_COLORS[h.flagLevel] || "#64748B" }}>
                      {h.deviationScore.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right sidebar: pipeline info */}
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900">Pipeline VERA</h3>
          </div>
          <ol className="space-y-3 text-xs">
            {[
              { step: "01", title: "Data Stripping", desc: "PHI (NIK/nama/alamat) dihapus di Edge sebelum LLM" },
              { step: "02", title: "LLM Extraction", desc: "OpenRouter/z-ai-sdk/regex fallback dengan retry" },
              { step: "03", title: "JSON Schema Validation", desc: "Zod validation, null fallback anti-hallucination" },
              { step: "04", title: "Time-Series Deviation", desc: "Hitung ΣΔ pasien vs standar pemulihan" },
              { step: "05", title: "Flag & Persist", desc: "LOW/MEDIUM/HIGH + audit log di Neon" },
            ].map(p => (
              <li key={p.step} className="flex gap-3">
                <div className="font-mono text-[10px] font-bold text-sky-600 w-6 flex-shrink-0">{p.step}</div>
                <div>
                  <div className="font-semibold text-slate-900">{p.title}</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">{p.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-900 mb-2">UU PDP Compliance</h3>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Data yang Anda upload diproses lokal di Vercel Edge. PHI di-strip sebelum dikirim ke LLM.
            Audit trail permanen tercatat di database Neon dengan reviewer ID.
          </p>
        </Card>
      </div>
    </div>
  );
}
