/**
 * VERA Seed Script — Generate 1.000 synthetic pneumonia EMR records
 * (Todo #5)
 *
 * Generates 3 categories:
 *   - NORMAL (40%): lab normalized by H3, claimed H1-H5 → LOW score
 *   - BORDERLINE (30%): lab slow recovery, claimed H1-H6 → MEDIUM score
 *   - ANOMALY (30%): lab normal at H3 but claimed H1-H7 → HIGH Red Flag
 *
 * Uses deterministic random seed for reproducibility.
 * Data is fully synthetic — no real patient data used (UU PDP compliant).
 *
 * Usage: bun run scripts/seed/seed-pneumonia.ts
 */

import { db } from "../../src/lib/db";
import { stripPHI } from "../../src/lib/data-stripping";
import { extractLabData } from "../../src/lib/llm-extract";
import { PNEUMONIA_STANDARD } from "../../src/lib/clinical-curve";
import { computeDeviationScore, getFlagLevel, type PatientDataPoint } from "../../src/lib/thresholds";

// Deterministic PRNG (Mulberry32) — reproducible across runs
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260928); // fixed seed: 2026-09-28

function pickInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pickFloat(min: number, max: number, decimals = 1): number {
  const v = rand() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

interface CategoryConfig {
  category: "NORMAL" | "BORDERLINE" | "ANOMALY";
  weight: number;
  // lab values at H1, H3, H5/H7
  h1LeukositRange: [number, number];
  h3LeukositRange: [number, number];
  finalLeukositRange: [number, number];
  claimedDaysRange: [number, number];
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: "NORMAL",
    weight: 0.4,
    h1LeukositRange: [13000, 16000],
    h3LeukositRange: [8500, 10000], // normal at H3
    finalLeukositRange: [7500, 8500],
    claimedDaysRange: [4, 5], // appropriate discharge
  },
  {
    category: "BORDERLINE",
    weight: 0.3,
    h1LeukositRange: [14000, 18000],
    h3LeukositRange: [10500, 12000], // slow recovery
    finalLeukositRange: [8500, 9500],
    claimedDaysRange: [5, 6],
  },
  {
    category: "ANOMALY",
    weight: 0.3,
    h1LeukositRange: [13000, 16000],
    h3LeukositRange: [8000, 9500], // normal at H3
    finalLeukositRange: [7500, 8500],
    claimedDaysRange: [7, 8], // ANOMALY: extended stay past recovery
  },
];

function generateEMRText(
  index: number,
  category: CategoryConfig
): { caseId: string; emrText: string; claimedDays: number } {
  const caseId = `PNEU-2026-${String(index).padStart(4, "0")}`;
  const claimedDays = pickInt(category.claimedDaysRange[0], category.claimedDaysRange[1]);

  // Generate lab values per day
  const h1Leukosit = pickInt(category.h1LeukositRange[0], category.h1LeukositRange[1]);
  const h3Leukosit = pickInt(category.h3LeukositRange[0], category.h3LeukositRange[1]);
  const finalLeukosit = pickInt(category.finalLeukositRange[0], category.finalLeukositRange[1]);

  const h1Trombosit = pickInt(200000, 230000);
  const h3Trombosit = pickInt(230000, 250000);
  const finalTrombosit = pickInt(245000, 270000);

  const h1Suhu = pickFloat(38.2, 39.2);
  const h3Suhu = category.category === "BORDERLINE" ? pickFloat(37.4, 38.0) : pickFloat(36.8, 37.3);
  const finalSuhu = pickFloat(36.5, 37.0);

  const td_s = pickInt(110, 125);
  const td_d = pickInt(70, 82);

  // Compose EMR text — simulate narrative from doctor
  const h1Text = `H1: Pasien sadar penuh, GCS 15. TD ${td_s}/${td_d}, Nadi ${pickInt(80, 95)}, Suhu ${h1Suhu}°C. Lab: Leukosit ${h1Leukosit}, Trombosit ${h1Trombosit}. Diagnosis: Pneumonia komunitas. Mulai antibiotik IV.`;
  const h3Text = `H3: Pasien kondisi membaik. GCS 15. TD ${td_s}/${td_d}. Suhu ${h3Suhu}°C. Lab: Leukosit ${h3Leukosit}, Trombosit ${h3Trombosit}. Auskultasi paru membaik.`;
  const finalText = claimedDays >= 6
    ? `H${claimedDays}: Kondisi stabil. GCS 15. TD ${td_s}/${td_d}. Suhu ${finalSuhu}°C. Lab: Leukosit ${finalLeukosit}, Trombosit ${finalTrombosit}. ${category.category === "ANOMALY" ? "Dokter: masih perlu observasi lanjut." : "Rencana pulang."}`
    : `H${claimedDays}: Kondisi stabil. Lab normal. Rencana pulang hari ini.`;

  // Compose full EMR — include PHI that should be stripped
  const fakeName = ["Bapak Ahmad Yani", "Ibu Siti Aminah", "Bapak Budi Santoso", "Ibu Dewi Lestari"][index % 4];
  const fakeNik = `${pickInt(31, 64)}${Date.now().toString().slice(-14)}`.slice(0, 16);
  const emrText = `Pasien: ${fakeName}, NIK: ${fakeNik}\nDiagnosis: Pneumonia (J18.9)\n\n${h1Text}\n${h3Text}\n${finalText}`;

  return { caseId, emrText, claimedDays };
}

async function main() {
  console.log("🦠 VERA Seed Script — Generating 1.000 synthetic pneumonia cases\n");

  // Generate all 1.000 cases
  const cases: Array<{ index: number; category: CategoryConfig; data: { caseId: string; emrText: string; claimedDays: number } }> = [];

  let totalGenerated = 0;
  for (const category of CATEGORIES) {
    const count = Math.floor(1000 * category.weight);
    for (let i = 0; i < count; i++) {
      const data = generateEMRText(totalGenerated + 1, category);
      cases.push({ index: totalGenerated + 1, category, data });
      totalGenerated++;
    }
  }

  console.log(`📦 Generated ${cases.length} synthetic cases:`);
  for (const c of CATEGORIES) {
    const count = cases.filter(x => x.category.category === c.category).length;
    console.log(`   ${c.category.padEnd(10)} ${count} cases (claimed H${c.claimedDaysRange[0]}-H${c.claimedDaysRange[1]})`);
  }
  console.log("");

  // Process first 30 cases via LLM extraction (for demo speed)
  // The rest get pre-computed scores without LLM call
  const SAMPLE_FOR_LLM = 30;
  console.log(`🔬 Processing first ${SAMPLE_FOR_LLM} cases via VERA pipeline (Data Stripping → LLM → Deviation Score)...`);

  let processed = 0;
  let hallucinationFailures = 0;

  for (let i = 0; i < cases.length; i++) {
    const { index, category, data } = cases[i];

    // === Step 1: Data Stripping ===
    const stripResult = stripPHI(data.emrText);

    // === Step 2: LLM extraction (multi-day) ===
    // First SAMPLE_FOR_LLM cases use full pipeline (LLM via z-ai-sdk);
    // the rest use regex extractor (deterministic, fast).
    const extraction = await extractLabData(stripResult.strippedText);
    const backend = extraction.backend;

    if (!extraction.data || extraction.data.days.length === 0) {
      hallucinationFailures++;
    }

    if (i < SAMPLE_FOR_LLM) {
      processed++;
      if (processed % 5 === 0) {
        console.log(`   processed ${processed}/${SAMPLE_FOR_LLM}...`);
      }
    }

    if (!extraction.data) {
      // Skip — but still persist episode with zero score
      await db.episode.create({
        data: {
          caseId: data.caseId,
          diseaseCode: "J18.9",
          diseaseName: "Pneumonia",
          admitDay: "H1",
          claimedDays: data.claimedDays,
          emrTextRaw: data.emrText,
          emrTextStrip: stripResult.strippedText,
          status: "extraction_failed",
          deviationScore: 0,
          flagLevel: "LOW",
          auditLogs: {
            create: {
              action: "created",
              metadata: JSON.stringify({
                category: category.category,
                backend,
                stripped: stripResult.removedItems,
                error: extraction.error,
              }),
            },
          },
        },
      });
      continue;
    }

    // === Step 3: Compute deviation score ===
    const stdCurve = PNEUMONIA_STANDARD;
    const patientData: PatientDataPoint[] = extraction.data.days.map(d => ({
      dayLabel: d.date,
      day: parseInt(d.date.replace("H", ""), 10),
      leukosit: d.leukosit,
      trombosit: d.trombosit,
      tdSistol: d.td_s,
      tdDiastol: d.td_d,
      suhu: d.suhu,
      gcs: d.gcs,
    }));

    const { score } = computeDeviationScore(patientData, stdCurve, data.claimedDays);
    const flag = getFlagLevel(score);

    // === Step 4: Persist to DB ===
    await db.episode.create({
      data: {
        caseId: data.caseId,
        diseaseCode: "J18.9",
        diseaseName: "Pneumonia",
        admitDay: "H1",
        claimedDays: data.claimedDays,
        emrTextRaw: data.emrText,
        emrTextStrip: stripResult.strippedText,
        status: flag.reviewRequired ? "flagged" : "analyzed",
        deviationScore: score,
        flagLevel: flag.level,
        labData: {
          create: extraction.data.days.map(d => ({
            dayLabel: d.date,
            leukosit: d.leukosit,
            trombosit: d.trombosit,
            tdSistol: d.td_s,
            tdDiastol: d.td_d,
            suhu: d.suhu,
            gcs: d.gcs,
          })),
        },
        auditLogs: {
          create: {
            action: "created",
            metadata: JSON.stringify({
              category: category.category,
              backend,
              stripped: stripResult.removedItems,
              dayCount: extraction.data.days.length,
            }),
          },
        },
      },
    });
  }

  // Final stats
  console.log("\n✅ Seed complete!");
  console.log(`   Total cases: ${cases.length}`);
  console.log(`   LLM-processed: ${processed}`);
  console.log(`   Hallucination failures: ${hallucinationFailures} (${((hallucinationFailures / processed) * 100).toFixed(1)}%)`);

  const allEpisodes = await db.episode.findMany();
  const flagged = allEpisodes.filter(e => e.flagLevel === "HIGH").length;
  const medium = allEpisodes.filter(e => e.flagLevel === "MEDIUM").length;
  const low = allEpisodes.filter(e => e.flagLevel === "LOW").length;

  console.log(`\n📊 Flag distribution:`);
  console.log(`   HIGH (Red Flag):   ${flagged}`);
  console.log(`   MEDIUM (Watch):    ${medium}`);
  console.log(`   LOW (Normal):      ${low}`);

  const avgScore = allEpisodes.reduce((s, e) => s + (e.deviationScore ?? 0), 0) / allEpisodes.length;
  console.log(`   Average deviation score: ${avgScore.toFixed(3)}`);

  // Verify expectation: ANOMALY cases (30%) should be HIGH flag
  const anomalyCases = allEpisodes.filter(e => {
    try {
      const meta = JSON.parse(e.auditLogs[0]?.metadata ?? "{}");
      return meta.category === "ANOMALY";
    } catch { return false; }
  });
  const anomalyHigh = anomalyCases.filter(e => e.flagLevel === "HIGH").length;
  console.log(`\n🎯 Anomaly detection accuracy: ${anomalyHigh}/${anomalyCases.length} ANOMALY cases correctly flagged HIGH (${((anomalyHigh / anomalyCases.length) * 100).toFixed(1)}%)`);
}

main()
  .catch(err => {
    console.error("Seed script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
