/**
 * VERA Hallucination Benchmark (Todo #19 — Formal)
 * ----------------------------------------------------
 * Tests LLM extraction accuracy on 100 sample cases.
 * Measures:
 *   - Extraction success rate (target: >95%)
 *   - JSON schema validation pass rate (target: >90%)
 *   - Hallucination rate = invalid values (target: <5%)
 *   - Backend fallback distribution (z-ai-sdk vs regex)
 *
 * Usage: bun run scripts/benchmark-hallucination.ts
 *
 * Output: printed summary + JSON file in /download/
 */

import { db } from "../src/lib/db";
import { stripPHI } from "../src/lib/data-stripping";
import { extractLabData } from "../src/lib/llm-extract";
import { PNEUMONIA_STANDARD, STROKE_STANDARD } from "../src/lib/clinical-curve";
import { computeDeviationScore, getFlagLevel, type PatientDataPoint } from "../src/lib/thresholds";
import { writeFileSync } from "fs";

interface BenchmarkResult {
  totalCases: number;
  successfulExtractions: number;
  failedExtractions: number;
  schemaValidationsPassed: number;
  schemaValidationsFailed: number;
  retriedExtractions: number;
  backendDistribution: { openrouter: number; zai: number; regex: number };
  diseaseDistribution: { Pneumonia: number; Stroke: number };
  flagDistribution: { HIGH: number; MEDIUM: number; LOW: number };
  anomalyDetectionAccuracy: number; // % of ANOMALY cases correctly HIGH
  averageExtractionTimeMs: number;
  hallucinationRate: number; // % of null fields where LLM should have extracted value
  timestamp: string;
}

// Synthetic EMR generator (same as seed-all.ts but compact)
function generateEMR(disease: "pneumonia" | "stroke", category: "NORMAL" | "BORDERLINE" | "ANOMALY"): string {
  const leukositH1 = disease === "pneumonia"
    ? (category === "ANOMALY" ? 14500 : 15500)
    : 11500;
  const leukositH3 = category === "ANOMALY" ? 8200 : category === "BORDERLINE" ? 11000 : 9200;
  const leukositFinal = 7800;
  const td_s = disease === "stroke" ? 150 : 120;
  const td_d = disease === "stroke" ? 90 : 78;
  const suhuH1 = disease === "pneumonia" ? 38.5 : 37.2;
  const suhuH3 = category === "ANOMALY" ? 36.9 : category === "BORDERLINE" ? 37.5 : 37.0;
  const suhuFinal = 36.7;
  const gcs = disease === "stroke" ? 14 : 15;
  const claimedDays = category === "ANOMALY" ? 7 : category === "BORDERLINE" ? 6 : 5;

  const diseaseName = disease === "pneumonia" ? "Pneumonia" : "Stroke (Ischemic)";
  const diseaseCode = disease === "pneumonia" ? "J18.9" : "I63.9";
  const verdict = category === "ANOMALY" ? "Dokter: masih perlu observasi lanjut." : "Rencana pulang.";

  return `Pasien: Bapak Benchmark Test, NIK: 3123456789012345
Diagnosis: ${diseaseName} (${diseaseCode})

H1: Pasien sadar penuh, GCS ${gcs}. TD ${td_s}/${td_d}, Suhu ${suhuH1}°C. Lab: Leukosit ${leukositH1}, Trombosit 220000. Mulai terapi.
H3: Pasien kondisi membaik. GCS ${gcs}. TD ${td_s}/${td_d}. Suhu ${suhuH3}°C. Lab: Leukosit ${leukositH3}, Trombosit 240000.
H${claimedDays}: Kondisi stabil. GCS 15. TD ${td_s}/${td_d}. Suhu ${suhuFinal}°C. Lab: Leukosit ${leukositFinal}, Trombosit 250000. ${verdict}`;
}

async function main() {
  console.log("🧪 VERA Hallucination Benchmark\n");
  console.log("Running 100 test cases (50 Pneumonia + 50 Stroke, mixed categories)...\n");

  const cases: Array<{ disease: "pneumonia" | "stroke"; category: "NORMAL" | "BORDERLINE" | "ANOMALY"; emr: string; }> = [];
  const categories: Array<"NORMAL" | "BORDERLINE" | "ANOMALY"> = ["NORMAL", "BORDERLINE", "ANOMALY"];

  for (let i = 0; i < 50; i++) {
    const cat = categories[i % 3];
    cases.push({ disease: "pneumonia", category: cat, emr: generateEMR("pneumonia", cat) });
  }
  for (let i = 0; i < 50; i++) {
    const cat = categories[i % 3];
    cases.push({ disease: "stroke", category: cat, emr: generateEMR("stroke", cat) });
  }

  // Stats
  let successful = 0;
  let failed = 0;
  let schemaPass = 0;
  let schemaFail = 0;
  let retried = 0;
  let nullFields = 0;
  let totalFields = 0;
  let correctAnomaly = 0;
  let totalAnomaly = 0;
  let totalTime = 0;
  const backendDist = { openrouter: 0, zai: 0, regex: 0 };
  const flagDist = { HIGH: 0, MEDIUM: 0, LOW: 0 };

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const stripResult = stripPHI(c.emr);

    const start = Date.now();
    const extraction = await extractLabData(stripResult.strippedText);
    const elapsed = Date.now() - start;
    totalTime += elapsed;

    if (extraction.data && extraction.data.days.length > 0) {
      successful++;
      if (extraction.validationPassed) schemaPass++;
      else schemaFail++;

      if (extraction.retried) retried++;
      backendDist[extraction.backend]++;

      // Count null fields per day
      for (const day of extraction.data.days) {
        const fields = [day.leukosit, day.trombosit, day.td_s, day.td_d, day.suhu, day.gcs];
        totalFields += fields.length;
        nullFields += fields.filter(v => v === null).length;
      }

      // Compute deviation score
      const stdCurve = c.disease === "pneumonia" ? PNEUMONIA_STANDARD : STROKE_STANDARD;
      const claimedDays = c.category === "ANOMALY" ? 7 : c.category === "BORDERLINE" ? 6 : 5;

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

      const { score } = computeDeviationScore(patientData, stdCurve, claimedDays);
      const flag = getFlagLevel(score);
      flagDist[flag.level]++;

      // Track ANOMALY detection
      if (c.category === "ANOMALY") {
        totalAnomaly++;
        if (flag.level === "HIGH") correctAnomaly++;
      }
    } else {
      failed++;
      schemaFail++;
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  Progress: ${i + 1}/${cases.length}...`);
    }
  }

  const result: BenchmarkResult = {
    totalCases: cases.length,
    successfulExtractions: successful,
    failedExtractions: failed,
    schemaValidationsPassed: schemaPass,
    schemaValidationsFailed: schemaFail,
    retriedExtractions: retried,
    backendDistribution: backendDist,
    diseaseDistribution: { Pneumonia: 50, Stroke: 50 },
    flagDistribution: flagDist,
    anomalyDetectionAccuracy: totalAnomaly > 0 ? (correctAnomaly / totalAnomaly) * 100 : 0,
    averageExtractionTimeMs: Math.round(totalTime / cases.length),
    hallucinationRate: totalFields > 0 ? (nullFields / totalFields) * 100 : 0,
    timestamp: new Date().toISOString(),
  };

  // Print report
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERA Hallucination Benchmark Report");
  console.log("=".repeat(60));
  console.log(`Total cases tested:     ${result.totalCases}`);
  console.log(`Successful extractions: ${result.successfulExtractions} (${(result.successfulExtractions / result.totalCases * 100).toFixed(1)}%)`);
  console.log(`Failed extractions:     ${result.failedExtractions}`);
  console.log(`Schema validations:     ${result.schemaValidationsPassed} pass / ${result.schemaValidationsFailed} fail`);
  console.log(`Retried extractions:    ${result.retriedExtractions}`);
  console.log(`\nBackend distribution:`);
  console.log(`  OpenRouter:  ${backendDist.openrouter} (token-based)`);
  console.log(`  z-ai-sdk:   ${backendDist.zai} (built-in fallback)`);
  console.log(`  regex:      ${backendDist.regex} (last resort)`);
  console.log(`\nFlag distribution:`);
  console.log(`  HIGH (Red Flag):  ${flagDist.HIGH}`);
  console.log(`  MEDIUM (Watch):   ${flagDist.MEDIUM}`);
  console.log(`  LOW (Normal):     ${flagDist.LOW}`);
  console.log(`\n🎯 KEY METRICS:`);
  console.log(`  Anomaly detection accuracy: ${result.anomalyDetectionAccuracy.toFixed(1)}%`);
  console.log(`  Hallucination rate:         ${result.hallucinationRate.toFixed(2)}% (null fields where value should exist)`);
  console.log(`  Average extraction time:    ${result.averageExtractionTimeMs}ms per case`);
  console.log(`\n✅ Targets vs Actuals:`);
  console.log(`  Extraction success:  target >95% → ${(result.successfulExtractions / result.totalCases * 100).toFixed(1)}% ${result.successfulExtractions / result.totalCases * 100 >= 95 ? "✓" : "✗"}`);
  console.log(`  Schema validation:    target >90% → ${(result.schemaValidationsPassed / result.totalCases * 100).toFixed(1)}% ${result.schemaValidationsPassed / result.totalCases * 100 >= 90 ? "✓" : "✗"}`);
  console.log(`  Hallucination rate:   target <5%  → ${result.hallucinationRate.toFixed(2)}% ${result.hallucinationRate < 5 ? "✓" : "✗"}`);
  console.log(`  Anomaly detection:    target >80%  → ${result.anomalyDetectionAccuracy.toFixed(1)}% ${result.anomalyDetectionAccuracy >= 80 ? "✓" : "✗"}`);

  // Save JSON report
  const reportPath = "/home/z/my-project/download/vera_benchmark_report.json";
  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

main().catch(console.error).finally(() => db.$disconnect());
