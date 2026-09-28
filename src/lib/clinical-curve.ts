/**
 * VERA Clinical Standard Recovery Curve (Todo #7)
 * ----------------------------------------------------
 * Mathematical definition of when a patient SHOULD be discharged,
 * based on objective lab & vital sign values per disease.
 *
 * Source: derived from IDSA/ATS 2007 guidelines for pneumonia,
 * CURB-65 severity, and standard medical textbook values.
 * Validated by Clinical Domain Expert (Anggota 3 tim).
 *
 * Curve format: {day: "H1", leukosit: ..., trombosit: ..., ...}
 * Each entry = expected normal/recovery value at that day.
 */

export interface ClinicalDataPoint {
  dayLabel: string;      // "H1" ... "H10"
  day: number;           // 1..10
  leukosit: number;     // cells/uL (4,000-10,000 normal)
  trombosit: number;   // cells/uL (150,000-450,000 normal)
  tdSistol: number;    // mmHg (90-120 normal)
  tdDiastol: number;   // mmHg (60-80 normal)
  suhu: number;        // °C (36.5-37.5 normal)
  gcs: number;        // Glasgow (15 = full conscious)
}

// Severity score (0 = no deviation needed; higher = more severe)
export type DiseaseKey = "pneumonia" | "stroke" | "chf" | "copd";

interface StandardCurve {
  disease: string;
  icd10: string;
  // Per-day expected recovery values (normalized to "healthy" by discharge)
  curve: ClinicalDataPoint[];
  // Recommended discharge day (e.g. pneumonia uncomplicated = H5)
  recommendedDischarge: number;
  // Clinical reference (citation)
  reference: string;
}

/**
 * STANDARD CURVE — PNEUMONIA (uncomplicated, adult)
 *
 * Based on IDSA/ATS 2007 + ATS 2019 update. Uncomplicated community-acquired
 * pneumonia with appropriate antibiotics shows:
 * - Fever resolves by H2-H3
 * - Leukocytosis normalizes by H3-H4
 * - Clinical stability (vitals) by H3-H4
 * - Discharge recommended at H5 (clinical stability for 24h)
 *
 * If lab normal at H3 but stay extended to H7 → 4 days potentially fiktif.
 */
export const PNEUMONIA_STANDARD: StandardCurve = {
  disease: "Pneumonia (Uncomplicated Community-Acquired)",
  icd10: "J18.9",
  recommendedDischarge: 5,
  reference: "IDSA/ATS 2007 Consensus Guidelines; ATS 2019 Update",
  curve: [
    { dayLabel: "H1", day: 1, leukosit: 14500, trombosit: 220000, tdSistol: 105, tdDiastol: 65, suhu: 38.8, gcs: 15 },
    { dayLabel: "H2", day: 2, leukosit: 13000, trombosit: 230000, tdSistol: 110, tdDiastol: 70, suhu: 38.2, gcs: 15 },
    { dayLabel: "H3", day: 3, leukosit: 10000, trombosit: 240000, tdSistol: 115, tdDiastol: 75, suhu: 37.5, gcs: 15 }, // crossing normal
    { dayLabel: "H4", day: 4, leukosit: 8500,  trombosit: 250000, tdSistol: 118, tdDiastol: 78, suhu: 37.0, gcs: 15 }, // normalized
    { dayLabel: "H5", day: 5, leukosit: 8000,  trombosit: 255000, tdSistol: 120, tdDiastol: 80, suhu: 36.7, gcs: 15 }, // discharge ready
    { dayLabel: "H6", day: 6, leukosit: 7800,  trombosit: 258000, tdSistol: 120, tdDiastol: 80, suhu: 36.7, gcs: 15 }, // should be home
    { dayLabel: "H7", day: 7, leukosit: 7600,  trombosit: 260000, tdSistol: 120, tdDiastol: 80, suhu: 36.7, gcs: 15 }, // fiktif if still admitted
  ],
};

/**
 * STANDARD CURVE — STROKE (ischemic, uncomplicated)
 * Based on AHA/ASA 2019 guidelines. Stability achieved by H3-H5.
 */
export const STROKE_STANDARD: StandardCurve = {
  disease: "Stroke (Ischemic, Uncomplicated)",
  icd10: "I63.9",
  recommendedDischarge: 5,
  reference: "AHA/ASA 2019 Acute Ischemic Stroke Guidelines",
  curve: [
    { dayLabel: "H1", day: 1, leukosit: 11000, trombosit: 230000, tdSistol: 160, tdDiastol: 95, suhu: 37.0, gcs: 13 },
    { dayLabel: "H2", day: 2, leukosit: 10000, trombosit: 235000, tdSistol: 150, tdDiastol: 90, suhu: 36.9, gcs: 14 },
    { dayLabel: "H3", day: 3, leukosit: 9000,  trombosit: 240000, tdSistol: 140, tdDiastol: 85, suhu: 36.8, gcs: 14 },
    { dayLabel: "H4", day: 4, leukosit: 8500,  trombosit: 245000, tdSistol: 135, tdDiastol: 85, suhu: 36.7, gcs: 15 },
    { dayLabel: "H5", day: 5, leukosit: 8000,  trombosit: 250000, tdSistol: 130, tdDiastol: 80, suhu: 36.7, gcs: 15 },
    { dayLabel: "H6", day: 6, leukosit: 7800,  trombosit: 252000, tdSistol: 125, tdDiastol: 80, suhu: 36.7, gcs: 15 },
    { dayLabel: "H7", day: 7, leukosit: 7600,  trombosit: 254000, tdSistol: 120, tdDiastol: 80, suhu: 36.7, gcs: 15 },
  ],
};

/**
 * Get standard curve by disease key.
 */
export function getStandardCurve(diseaseKey: DiseaseKey | string): StandardCurve | null {
  switch (diseaseKey.toLowerCase()) {
    case "pneumonia":
    case "j18.9":
      return PNEUMONIA_STANDARD;
    case "stroke":
    case "i63.9":
      return STROKE_STANDARD;
    default:
      return PNEUMONIA_STANDARD; // fallback to pneumonia
  }
}

/**
 * Infer disease key from ICD-10 or text.
 */
export function inferDiseaseKey(text: string): DiseaseKey {
  const lower = text.toLowerCase();
  if (lower.includes("pneumonia") || lower.includes("j18")) return "pneumonia";
  if (lower.includes("stroke") || lower.includes("i63")) return "stroke";
  if (lower.includes("chf") || lower.includes("heart failure") || lower.includes("i50")) return "chf";
  if (lower.includes("copd") || lower.includes("j44")) return "copd";
  return "pneumonia"; // default
}

export type { StandardCurve };
