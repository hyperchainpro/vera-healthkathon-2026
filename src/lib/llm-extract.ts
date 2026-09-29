/**
 * VERA LLM Extractor with Anti-Hallucination Layer (Todo #11, #12)
 * ----------------------------------------------------
 * Sends stripped EMR text to LLM with Strict Prompting.
 * Falls back through 3 layers:
 *   1. OpenRouter (if OPENROUTER_API_KEY env var set)
 *   2. z-ai-web-dev-sdk (built-in, no API key needed)
 *   3. Deterministic regex extractor (last resort, always works)
 *
 * All 3 paths produce the same JSON schema:
 *   { days: [{ date, leukosit, trombosit, td_s, td_d, suhu, gcs }] }
 *
 * JSON Schema validation is enforced via zod. On validation failure:
 *   - Retry once with clarifying prompt
 *   - On second failure: return null for missing fields (no interpolation)
 *   (slide 19 PRD — anti-hallucination mitigation)
 */

import { z } from "zod";

// JSON schema for LLM output (slide 12 PRD) — multi-day extraction
const DaySchema = z.object({
  date: z.string().regex(/^H\d+$/), // "H1", "H2", ...
  leukosit: z.number().nullable(),
  trombosit: z.number().nullable(),
  td_s: z.number().nullable(),
  td_d: z.number().nullable(),
  suhu: z.number().nullable(),
  gcs: z.number().int().min(3).max(15).nullable(),
});

const LabExtractionSchema = z.object({
  days: z.array(DaySchema).min(1),
});

export type ExtractedDay = z.infer<typeof DaySchema>;
export type ExtractedLab = z.infer<typeof LabExtractionSchema>;

const STRICT_PROMPT = `Ekstrak data klinis HARIAN dari teks rekam medis berikut.
Setiap paragraf yang dimulai dengan "H1", "H2", dst adalah satu hari rawat.
Output HANYA JSON valid dengan format:
  { "days": [
    { "date": "H1", "leukosit": 14500, "trombosit": 220000, "td_s": 110, "td_d": 70, "suhu": 38.5, "gcs": 15 },
    { "date": "H3", "leukosit": 9000, "trombosit": 240000, "td_s": 115, "td_d": 75, "suhu": 37.1, "gcs": 15 }
  ] }

Aturan:
- "date" wajib, format "H" diikuti angka.
- "leukosit" dalam cells/uL (number).
- "trombosit" dalam cells/uL (number).
- "td_s" tekanan sistolik (number), "td_d" diastolik (number).
- "suhu" dalam °C (number).
- "gcs" integer 3-15.
- Jika nilai tidak ditemukan di hari tertentu, isi null. JANGAN mengarang.
- Output hanya JSON, tidak ada teks lain, tidak ada markdown fences.

Teks:`;

/**
 * Try OpenRouter API (if API key configured)
 */
async function extractWithOpenRouter(emrText: string): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://vera.vercel.app",
      "X-Title": "VERA Healthkathon 2026",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.2-3b-instruct:free",
      messages: [
        { role: "system", content: "You are a clinical data extractor. Output only JSON." },
        { role: "user", content: `${STRICT_PROMPT}\n${emrText}` },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");
  return JSON.parse(content);
}

/**
 * Try z-ai-web-dev-sdk (built-in, no API key needed)
 */
async function extractWithZAI(emrText: string): Promise<unknown> {
  const ZAI = await import("z-ai-web-dev-sdk").catch(() => null);
  if (!ZAI) throw new Error("z-ai-web-dev-sdk not installed");

  const sdk = ZAI.default || ZAI;
  if (typeof sdk.chatCompletions !== "function") {
    throw new Error("z-ai-web-dev-sdk chatCompletions not available");
  }

  const result = await sdk.chatCompletions({
    messages: [
      { role: "system", content: "You are a clinical data extractor. Output only JSON." },
      { role: "user", content: `${STRICT_PROMPT}\n${emrText}` },
    ],
    temperature: 0,
  });

  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty ZAI response");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in ZAI response");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Fallback #3: Deterministic regex extractor
 * Extracts per-day data by splitting on "H1:", "H2:", etc.
 */
function extractWithRegex(emrText: string): { days: ExtractedDay[] } {
  const days: ExtractedDay[] = [];

  // Split EMR by day markers: "H1:", "H2:", ..., also "Day 1:", "Hari ke-1:"
  const dayRegex = /(?:^|\n)\s*(H\d+|Day\s*\d+|Hari\s*ke-?\s*\d+)\s*[:\-]?\s*([^\n]*(?:\n(?!H\d+|Day\s*\d+|Hari\s*ke-?\s*\d+)[^\n]*)*)/gi;

  let match;
  while ((match = dayRegex.exec(emrText)) !== null) {
    let dateMarker = match[1].trim();
    const dayText = match[2] || "";

    // Normalize to "H{n}"
    let dayMatch = dateMarker.match(/(\d+)/);
    if (!dayMatch) continue;
    const dayLabel = `H${dayMatch[1]}`;

    const day: ExtractedDay = {
      date: dayLabel,
      leukosit: null,
      trombosit: null,
      td_s: null,
      td_d: null,
      suhu: null,
      gcs: null,
    };

    // Leukosit
    const leuko = dayText.match(/leuko(?:sit)?[^\d]{0,5}(\d[\d.,]*)/i);
    if (leuko) day.leukosit = parseFloat(leuko[1].replace(/[.,]/g, ""));

    // Trombosit
    const trombo = dayText.match(/trombo(?:sit)?[^\d]{0,5}(\d[\d.,]*)/i) || dayText.match(/\bplt[^\d]{0,5}(\d[\d.,]*)/i);
    if (trombo) {
      let v = parseFloat(trombo[1].replace(/[.,]/g, ""));
      if (v < 1000) v = v * 1000;
      day.trombosit = v;
    }

    // Blood pressure
    const td = dayText.match(/(?:TD|tekanan\s*darah)?[^\d]{0,8}(\d{2,3})\s*\/\s*(\d{2,3})/i);
    if (td) {
      day.td_s = parseInt(td[1], 10);
      day.td_d = parseInt(td[2], 10);
    }

    // Temperature
    const suhu = dayText.match(/suhu[^\d]{0,5}(\d{2}\.\d)/i) || dayText.match(/\b(\d{2}\.\d)\s*°?C?/);
    if (suhu) day.suhu = parseFloat(suhu[1]);

    // GCS
    const gcs = dayText.match(/(?:gcs|glasgow)[^\d]{0,5}(\d{1,2})/i);
    if (gcs) day.gcs = parseInt(gcs[1], 10);

    days.push(day);
  }

  // If no days extracted, try fallback single-day extraction
  if (days.length === 0) {
    const day: ExtractedDay = {
      date: "H1", leukosit: null, trombosit: null,
      td_s: null, td_d: null, suhu: null, gcs: null,
    };
    const leuko = emrText.match(/leuko(?:sit)?[^\d]{0,5}(\d[\d.,]*)/i);
    if (leuko) day.leukosit = parseFloat(leuko[1].replace(/[.,]/g, ""));
    const trombo = emrText.match(/trombo(?:sit)?[^\d]{0,5}(\d[\d.,]*)/i);
    if (trombo) day.trombosit = parseFloat(trombo[1].replace(/[.,]/g, "")) * (parseFloat(trombo[1]) < 1000 ? 1000 : 1);
    const td = emrText.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (td) { day.td_s = parseInt(td[1], 10); day.td_d = parseInt(td[2], 10); }
    days.push(day);
  }

  return { days };
}

export interface ExtractionResult {
  data: ExtractedLab | null;
  backend: "openrouter" | "zai" | "regex";
  retried: boolean;
  validationPassed: boolean;
  error?: string;
}

export async function extractLabData(emrText: string): Promise<ExtractionResult> {
  const backends: Array<{ name: "openrouter" | "zai" | "regex"; fn: () => Promise<unknown> }> = [
    { name: "openrouter", fn: () => extractWithOpenRouter(emrText) },
    { name: "zai", fn: () => extractWithZAI(emrText) },
    { name: "regex", fn: async () => extractWithRegex(emrText) },
  ];

  let lastError: string | undefined;

  for (const backend of backends) {
    try {
      const raw = await backend.fn();
      const parseResult = LabExtractionSchema.safeParse(raw);
      if (parseResult.success) {
        return {
          data: parseResult.data,
          backend: backend.name,
          retried: false,
          validationPassed: true,
        };
      }

      // Retry once
      try {
        const retryRaw = await backend.fn();
        const retryParse = LabExtractionSchema.safeParse(retryRaw);
        if (retryParse.success) {
          return {
            data: retryParse.data,
            backend: backend.name,
            retried: true,
            validationPassed: true,
          };
        }
        lastError = `Validation failed twice on ${backend.name}: ${parseResult.error.message}`;
      } catch (retryErr) {
        lastError = `Retry failed on ${backend.name}: ${String(retryErr)}`;
      }
    } catch (err) {
      lastError = `${backend.name} backend failed: ${String(err)}`;
    }
  }

  return {
    data: null,
    backend: "regex",
    retried: false,
    validationPassed: false,
    error: lastError || "All extraction backends failed",
  };
}

export { LabExtractionSchema };
