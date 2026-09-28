/**
 * VERA Recovery Deviation Score Thresholds (Todo #8)
 * ----------------------------------------------------
 * Maps computed deviation score (0.0 - 1.0) to a flag level.
 *
 * Threshold calibration based on:
 * - Clinical significance (slight deviation = noise; large = real anomaly)
 * - False-positive tolerance (we accept ~10% FP in MEDIUM zone to catch HIGH)
 * - Recommendation from Clinical Domain Expert (Anggota 3 tim)
 *
 * Levels:
 *   LOW     (0.0 - 0.3)  → No review needed (matches standard curve)
 *   MEDIUM  (0.3 - 0.6)  → Optional review (some deviation, could be comorbidity)
 *   HIGH    (0.6 - 1.0)  → MANDATORY review — Red Flag (slide 5 PRD)
 */

export type FlagLevel = "LOW" | "MEDIUM" | "HIGH";

export interface FlagThreshold {
  level: FlagLevel;
  min: number;
  max: number;
  color: string;          // hex color for UI
  bgColor: string;        // background tint
  label: string;          // short label
  description: string;    // what it means
  reviewRequired: boolean; // does reviewer need to look?
}

export const FLAG_THRESHOLDS: FlagThreshold[] = [
  {
    level: "LOW",
    min: 0.0,
    max: 0.3,
    color: "#16A34A",    // green
    bgColor: "#F0FDF4",
    label: "Normal",
    description: "Kurva pasien mengikuti standar pemulihan. Tidak ada indikasi anomali.",
    reviewRequired: false,
  },
  {
    level: "MEDIUM",
    min: 0.3,
    max: 0.6,
    color: "#F59E0B",    // amber
    bgColor: "#FFFBEB",
    label: "Watch",
    description: "Ada deviasi sedang. Bisa disebabkan komorbiditas. Review opsional.",
    reviewRequired: false,
  },
  {
    level: "HIGH",
    min: 0.6,
    max: 1.0,
    color: "#DC2626",    // red flag
    bgColor: "#FEF2F2",
    label: "Red Flag",
    description: "Deviasi signifikan. Lab/vital normal tapi klaim dipanjangkan. Wajib review reviewer manusia.",
    reviewRequired: true,
  },
];

/**
 * Get flag level from computed deviation score.
 */
export function getFlagLevel(score: number): FlagThreshold {
  for (const t of FLAG_THRESHOLDS) {
    if (score >= t.min && score < t.max) return t;
  }
  // Score of exactly 1.0 → HIGH
  if (score >= 1.0) return FLAG_THRESHOLDS[2];
  return FLAG_THRESHOLDS[0];
}

/**
 * VERA Recovery Deviation Score Algorithm (Todo #13)
 * ----------------------------------------------------
 * Computes deviation between patient's daily lab data and the standard
 * recovery curve. Returns score 0.0 - 1.0.
 *
 * Algorithm:
 *   For each day H1..Hn, compute normalized deviation per metric:
 *     deviation_metric = abs(patient_value - standard_value) / normal_range
 *   Average across metrics for the day → daily_deviation
 *   Average daily_deviation across all days → total_deviation_raw (0..inf)
 *   Normalize to 0..1 via sigmoid.
 *
 * Critical Anomaly Bonus:
 *   If patient's labs are NORMAL by H3 (within standard range) BUT
 *   claimed days > recommendedDischarge, add bonus to score
 *   (this is the core "fiktif stay" signal — slide 5 PRD).
 *
 * @param patientData — array of daily lab data extracted from EMR
 * @param standardCurve — standard recovery curve for the disease
 * @returns score 0.0 (perfect match) to 1.0 (severe deviation / fiktif)
 */
export interface PatientDataPoint {
  dayLabel: string;
  day: number;
  leukosit?: number | null;
  trombosit?: number | null;
  tdSistol?: number | null;
  tdDiastol?: number | null;
  suhu?: number | null;
  gcs?: number | null;
}

interface StandardPoint {
  day: number;
  leukosit: number;
  trombosit: number;
  tdSistol: number;
  tdDiastol: number;
  suhu: number;
  gcs: number;
}

interface StandardCurve {
  disease: string;
  recommendedDischarge: number;
  curve: StandardPoint[];
}

// Normal ranges for normalization
const NORMAL_RANGES = {
  leukosit: { lo: 4000, hi: 10000, range: 6000 },    // 6,000 wide
  trombosit: { lo: 150000, hi: 450000, range: 300000 },
  tdSistol: { lo: 90, hi: 120, range: 30 },
  tdDiastol: { lo: 60, hi: 80, range: 20 },
  suhu: { lo: 36.0, hi: 37.5, range: 1.5 },
  gcs: { lo: 15, hi: 15, range: 12 },  // 15 = ideal; range = 3-15 (12 wide)
};

function isNormal(value: number, metric: keyof typeof NORMAL_RANGES): boolean {
  const r = NORMAL_RANGES[metric];
  return value >= r.lo && value <= r.hi;
}

function normalizedDeviation(
  patientVal: number | null | undefined,
  standardVal: number,
  metric: keyof typeof NORMAL_RANGES
): number {
  if (patientVal == null || Number.isNaN(patientVal)) return 0; // null = no data, don't penalize
  const range = NORMAL_RANGES[metric].range;
  const diff = Math.abs(patientVal - standardVal);
  return Math.min(diff / range, 1.0); // cap at 1.0 per metric
}

export function computeDeviationScore(
  patientData: PatientDataPoint[],
  standardCurve: StandardCurve,
  claimedDays: number
): { score: number; perDayDeviations: Array<{ day: number; deviation: number; isNormal: boolean }> } {
  // Build map: day → patient data
  const patientByDay = new Map<number, PatientDataPoint>();
  for (const p of patientData) {
    if (p.day != null) patientByDay.set(p.day, p);
  }

  const perDayDeviations: Array<{ day: number; deviation: number; isNormal: boolean }> = [];
  let totalRawDeviation = 0;
  let dayCount = 0;

  for (const stdPoint of standardCurve.curve) {
    const patientPoint = patientByDay.get(stdPoint.day);
    if (!patientPoint) continue;

    const metrics: Array<keyof typeof NORMAL_RANGES> = [
      "leukosit", "trombosit", "tdSistol", "tdDiastol", "suhu", "gcs",
    ];

    let dayDeviationSum = 0;
    let metricCount = 0;
    let allNormal = true;

    for (const m of metrics) {
      const pVal = patientPoint[m] as number | null | undefined;
      if (pVal == null) continue;
      const sVal = stdPoint[m] as number;
      const dev = normalizedDeviation(pVal, sVal, m);
      dayDeviationSum += dev;
      metricCount++;
      if (!isNormal(pVal, m)) allNormal = false;
    }

    const dayDeviation = metricCount > 0 ? dayDeviationSum / metricCount : 0;

    // "labNormalAtDay" = patient's key LAB markers (leukosit + trombosit + suhu)
    // are within normal range at this day. Vital signs (TD, GCS) fluctuate
    // more and are not strict pneumonia recovery indicators.
    const labNormalAtDay =
      (patientPoint.leukosit == null || isNormal(patientPoint.leukosit, "leukosit")) &&
      (patientPoint.trombosit == null || isNormal(patientPoint.trombosit, "trombosit")) &&
      (patientPoint.suhu == null || isNormal(patientPoint.suhu, "suhu"));

    perDayDeviations.push({
      day: stdPoint.day,
      deviation: dayDeviation,
      isNormal: labNormalAtDay,
    });
    totalRawDeviation += dayDeviation;
    dayCount++;
  }

  // Base score: average daily deviation (0..1)
  const avgDeviation = dayCount > 0 ? totalRawDeviation / dayCount : 0;

  /**
   * CRITICAL ANOMALY BONUS (slide 5 PRD — "fiktif stay" signal)
   * If patient's labs are all NORMAL by H3 but claimed days extend past
   * recommended discharge, this is the textbook prolonged-stay-fiktif pattern.
   * Add bonus proportional to extra days claimed.
   */
  let anomalyBonus = 0;
  const h3Deviation = perDayDeviations.find(d => d.day === 3);
  if (h3Deviation && h3Deviation.isNormal && claimedDays > standardCurve.recommendedDischarge) {
    const extraDays = claimedDays - standardCurve.recommendedDischarge;
    // Each extra day beyond recommended = +0.25 bonus (capped at 0.5)
    // This guarantees HIGH (>0.6) flag for ANOMALY cases (extra ≥ 2 days)
    // combinedRaw = 0.50 → score = sigmoid((0.50-0.35)*6) = sigmoid(0.9) = 0.71 → HIGH ✓
    anomalyBonus = Math.min(extraDays * 0.25, 0.5);
  }

  // Combine: weighted blend favoring anomaly bonus (the strongest signal)
  // If lab is normal but stay extended → score should be HIGH regardless of small deviation
  let combinedRaw: number;
  if (anomalyBonus > 0) {
    // ANOMALY pattern — direct high score
    combinedRaw = Math.max(anomalyBonus, avgDeviation * 0.3 + anomalyBonus * 0.9);
  } else {
    // Normal pattern — score reflects deviation only
    combinedRaw = avgDeviation * 0.7;
  }

  // Sigmoid normalize to 0..1 (centered at 0.35 so MEDIUM starts ~0.3)
  const score = 1 / (1 + Math.exp(-(combinedRaw - 0.35) * 6));

  return { score: Math.round(score * 100) / 100, perDayDeviations };
}
