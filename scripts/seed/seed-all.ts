/**
 * VERA Seed Script v2 — Generate synthetic EMR for Pneumonia + Stroke
 * (Todo #5 + #6 combined)
 *
 * Distribution per disease:
 *   1.000 Pneumonia cases (40% NORMAL, 30% BORDERLINE, 30% ANOMALY)
 *   1.000 Stroke cases (40% NORMAL, 30% BORDERLINE, 30% ANOMALY)
 *   Total: 2.000 cases
 *
 * Usage: bun run scripts/seed/seed-all.ts
 */

import { db } from "../../src/lib/db";
import { stripPHI } from "../../src/lib/data-stripping";
import { extractLabData } from "../../src/lib/llm-extract";
import { PNEUMONIA_STANDARD, STROKE_STANDARD } from "../../src/lib/clinical-curve";
import { computeDeviationScore, getFlagLevel, type PatientDataPoint } from "../../src/lib/thresholds";

// Deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260928);

function pickInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pickFloat(min: number, max: number, decimals = 1): number {
  const v = rand() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

type DiseaseType = "pneumonia" | "stroke";

interface CategoryConfig {
  category: "NORMAL" | "BORDERLINE" | "ANOMALY";
  weight: number;
  h1LeukositRange: [number, number];
  h3LeukositRange: [number, number];
  finalLeukositRange: [number, number];
  claimedDaysRange: [number, number];
  h1SuhuRange: [number, number];
  h3SuhuRange: [number, number];
}

const CATEGORIES_BY_DISEASE: Record<DiseaseType, CategoryConfig[]> = {
  pneumonia: [
    {
      category: "NORMAL",
      weight: 0.4,
      h1LeukositRange: [13000, 16000],
      h3LeukositRange: [8500, 10000],
      finalLeukositRange: [7500, 8500],
      claimedDaysRange: [4, 5],
      h1SuhuRange: [38.2, 39.2],
      h3SuhuRange: [36.8, 37.3],
    },
    {
      category: "BORDERLINE",
      weight: 0.3,
      h1LeukositRange: [14000, 18000],
      h3LeukositRange: [10500, 12000],
      finalLeukositRange: [8500, 9500],
      claimedDaysRange: [5, 6],
      h1SuhuRange: [38.5, 39.5],
      h3SuhuRange: [37.4, 38.0],
    },
    {
      category: "ANOMALY",
      weight: 0.3,
      h1LeukositRange: [13000, 16000],
      h3LeukositRange: [8000, 9500],
      finalLeukositRange: [7500, 8500],
      claimedDaysRange: [7, 8],
      h1SuhuRange: [38.2, 39.2],
      h3SuhuRange: [36.8, 37.3],
    },
  ],
  stroke: [
    {
      category: "NORMAL",
      weight: 0.4,
      h1LeukositRange: [10500, 12000],
      h3LeukositRange: [8500, 9500],
      finalLeukositRange: [7500, 8500],
      claimedDaysRange: [4, 5],
      h1SuhuRange: [37.0, 37.5],
      h3SuhuRange: [36.7, 37.0],
    },
    {
      category: "BORDERLINE",
      weight: 0.3,
      h1LeukositRange: [11000, 13000],
      h3LeukositRange: [9500, 10500],
      finalLeukositRange: [8000, 9000],
      claimedDaysRange: [5, 6],
      h1SuhuRange: [37.2, 37.8],
      h3SuhuRange: [36.8, 37.2],
    },
    {
      category: "ANOMALY",
      weight: 0.3,
      h1LeukositRange: [10500, 12000],
      h3LeukositRange: [8000, 9500],
      finalLeukositRange: [7500, 8500],
      claimedDaysRange: [7, 9],
      h1SuhuRange: [37.0, 37.5],
      h3SuhuRange: [36.7, 37.0],
    },
  ],
};

function generateEMRText(
  index: number,
  disease: DiseaseType,
  category: CategoryConfig
): { caseId: string; emrText: string; claimedDays: number; diseaseCode: string; diseaseName: string } {
  const prefix = disease === "pneumonia" ? "PNEU" : "STR";
  const caseId = `${prefix}-2026-${String(index).padStart(4, "0")}`;
  const diseaseName = disease === "pneumonia" ? "Pneumonia" : "Stroke (Ischemic)";
  const diseaseCode = disease === "pneumonia" ? "J18.9" : "I63.9";

  const claimedDays = pickInt(category.claimedDaysRange[0], category.claimedDaysRange[1]);

  // Lab values per day
  const h1Leukosit = pickInt(category.h1LeukositRange[0], category.h1LeukositRange[1]);
  const h3Leukosit = pickInt(category.h3LeukositRange[0], category.h3LeukositRange[1]);
  const finalLeukosit = pickInt(category.finalLeukositRange[0], category.finalLeukositRange[1]);

  const h1Trombosit = pickInt(200000, 230000);
  const h3Trombosit = pickInt(230000, 250000);
  const finalTrombosit = pickInt(245000, 270000);

  const h1Suhu = pickFloat(category.h1SuhuRange[0], category.h1SuhuRange[1]);
  const h3Suhu = pickFloat(category.h3SuhuRange[0], category.h3SuhuRange[1]);
  const finalSuhu = pickFloat(36.5, 37.0);

  // Stroke: TD often elevated
  const td_s = disease === "stroke" ? pickInt(140, 165) : pickInt(110, 125);
  const td_d = disease === "stroke" ? pickInt(85, 95) : pickInt(70, 82);

  // Stroke: GCS may be lower initially
  const h1Gcs = disease === "stroke" ? (Math.random() < 0.3 ? 13 : 14) : 15;
  const h3Gcs = disease === "stroke" ? 14 : 15;
  const finalGcs = 15;

  const diagnosisText = disease === "pneumonia"
    ? "Diagnosis: Pneumonia komunitas. Mulai antibiotik IV."
    : "Diagnosis: Stroke ischemik. Mulai terapi trombolitik.";

  const h1Text = `H1: Pasien sadar penuh, GCS ${h1Gcs}. TD ${td_s}/${td_d}, Nadi ${pickInt(80, 95)}, Suhu ${h1Suhu}°C. Lab: Leukosit ${h1Leukosit}, Trombosit ${h1Trombosit}. ${diagnosisText}`;
  const h3Text = `H3: Pasien kondisi membaik. GCS ${h3Gcs}. TD ${td_s}/${td_d}. Suhu ${h3Suhu}°C. Lab: Leukosit ${h3Leukosit}, Trombosit ${h3Trombosit}. ${disease === "pneumonia" ? "Auskultasi paru membaik." : "Defisit neurologis stabil."}`;
  const finalText = `H${claimedDays}: Kondisi stabil. GCS ${finalGcs}. TD ${td_s}/${td_d}. Suhu ${finalSuhu}°C. Lab: Leukosit ${finalLeukosit}, Trombosit ${finalTrombosit}. ${category.category === "ANOMALY" ? "Dokter: masih perlu observasi lanjut." : "Rencana pulang."}`;

  const fakeName = ["Bapak Ahmad Yani", "Ibu Siti Aminah", "Bapak Budi Santoso", "Ibu Dewi Lestari"][index % 4];
  const fakeNik = `${pickInt(31, 64)}${Date.now().toString().slice(-14)}`.padEnd(16, "0").slice(0, 16);
  const emrText = `Pasien: ${fakeName}, NIK: ${fakeNik}\nDiagnosis: ${diseaseName} (${diseaseCode})\n\n${h1Text}\n${h3Text}\n${finalText}`;

  return { caseId, emrText, claimedDays, diseaseCode, diseaseName };
}

async function seedDisease(disease: DiseaseType, startIdx: number) {
  const stdCurve = disease === "pneumonia" ? PNEUMONIA_STANDARD : STROKE_STANDARD;
  const categories = CATEGORIES_BY_DISEASE[disease];

  console.log(`\n📦 Generating ${disease.toUpperCase()} cases...`);

  let totalGenerated = 0;
  for (const category of categories) {
    const count = Math.floor(1000 * category.weight);
    for (let i = 0; i < count; i++) {
      const data = generateEMRText(startIdx + totalGenerated + 1, disease, category);

      // === Step 1: Data Stripping ===
      const stripResult = stripPHI(data.emrText);

      // === Step 2: LLM extraction (regex for speed) ===
      const extraction = await extractLabData(stripResult.strippedText);

      if (!extraction.data || extraction.data.days.length === 0) {
        // Persist as failed
        await db.episode.create({
          data: {
            caseId: data.caseId,
            diseaseCode: data.diseaseCode,
            diseaseName: data.diseaseName,
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
                  backend: extraction.backend,
                  error: extraction.error,
                }),
              },
            },
          },
        });
        totalGenerated++;
        continue;
      }

      // === Step 3: Compute deviation score ===
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

      // === Step 4: Persist ===
      await db.episode.create({
        data: {
          caseId: data.caseId,
          diseaseCode: data.diseaseCode,
          diseaseName: data.diseaseName,
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
                disease,
                category: category.category,
                backend: extraction.backend,
                dayCount: extraction.data.days.length,
              }),
            },
          },
        },
      });

      totalGenerated++;
      if (totalGenerated % 200 === 0) {
        console.log(`   ${disease} progress: ${totalGenerated}/1000`);
      }
    }
  }

  console.log(`   ${disease} done: ${totalGenerated} cases`);
}

async function main() {
  console.log("🦠 VERA Seed Script v2 — Pneumonia + Stroke\n");
  console.log("📊 Total target: 2.000 cases (1.000 per disease)\n");

  await seedDisease("pneumonia", 0);
  await seedDisease("stroke", 0);

  // Stats
  const all = await db.episode.findMany({ include: { labData: true } });
  const byDisease: Record<string, { total: number; HIGH: number; MEDIUM: number; LOW: number }> = {};
  for (const ep of all) {
    if (!byDisease[ep.diseaseName]) byDisease[ep.diseaseName] = { total: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    byDisease[ep.diseaseName].total++;
    if (ep.flagLevel === "HIGH") byDisease[ep.diseaseName].HIGH++;
    else if (ep.flagLevel === "MEDIUM") byDisease[ep.diseaseName].MEDIUM++;
    else byDisease[ep.diseaseName].LOW++;
  }

  console.log("\n📊 Flag distribution by disease:");
  for (const [disease, stats] of Object.entries(byDisease)) {
    const highPct = ((stats.HIGH / stats.total) * 100).toFixed(1);
    console.log(`  ${disease.padEnd(20)} total=${stats.total}  HIGH=${stats.HIGH} (${highPct}%)  MEDIUM=${stats.MEDIUM}  LOW=${stats.LOW}`);
  }

  // Verify ANOMALY detection
  console.log("\n🎯 ANOMALY detection accuracy:");
  for (const ep of all) {
    const meta = ep.auditLogs[0]?.metadata ? JSON.parse(ep.auditLogs[0].metadata) : {};
    if (meta.category === "ANOMALY" && ep.flagLevel !== "HIGH") {
      console.log(`  ⚠️ Missed anomaly: ${ep.caseId} (score=${ep.deviationScore}, flag=${ep.flagLevel})`);
    }
  }
  const allAnomalies = all.filter(e => {
    const meta = e.auditLogs[0]?.metadata ? JSON.parse(e.auditLogs[0].metadata) : {};
    return meta.category === "ANOMALY";
  });
  const detected = allAnomalies.filter(e => e.flagLevel === "HIGH").length;
  console.log(`  ${detected}/${allAnomalies.length} ANOMALY cases correctly flagged HIGH (${((detected/allAnomalies.length)*100).toFixed(1)}%)`);
}

main()
  .catch(err => { console.error("Failed:", err); process.exit(1); })
  .finally(() => db.$disconnect());
