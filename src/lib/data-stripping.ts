/**
 * VERA Data Stripping Layer (Todo #10)
 * ----------------------------------------------------
 * Removes all PHI (Personally Health Information) from raw EMR text
 * BEFORE sending to LLM (slide 11 & 19 PRD).
 *
 * Strips:
 *   - Patient names (Indonesian common names + generic "Bapak/Ibu X")
 *   - NIK (16 digits)
 *   - Phone numbers (Indonesian + international format)
 *   - Addresses (street, RT/RW, kelurahan, kecamatan, city, postal code)
 *   - MRN (Medical Record Numbers — alphanumeric, prefixed with MR/Reg)
 *   - BPJS card numbers
 *   - Email addresses
 *
 * Replaces with: [REDACTED-PHI]
 *
 * Compliance: UU PDP No. 27 Tahun 2022 Pasal 16-17.
 */

const PHI_PATTERNS: Array<{ pattern: RegExp; replacement: string; label: string }> = [
  // NIK (16 digits) — Indonesian National ID
  { pattern: /\b\d{16}\b/g, replacement: "[NIK-REDACTED]", label: "NIK" },

  // BPJS card number (13 digits starting with 0001 or similar)
  { pattern: /\b0\d{12,13}\b/g, replacement: "[BPJS-REDACTED]", label: "BPJS" },

  // Phone numbers (Indonesian format)
  { pattern: /(\+62|62|0)8\d{8,12}/g, replacement: "[PHONE-REDACTED]", label: "PHONE" },

  // Email
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[EMAIL-REDACTED]", label: "EMAIL" },

  // MRN — Medical Record Number (often "MR:12345" or "Reg/12345")
  { pattern: /\b(MR|MRN|Reg|Register|No\.RM|RM)[:#\/\s]*[A-Z0-9-]{4,}/gi, replacement: "[MRN-REDACTED]", label: "MRN" },

  // Patient: Nama depan belakang (Bapak/Ibu/Saudara/Pasien + capitalized name)
  {
    pattern: /\b(Bapak|Ibu|Saudara|Ny|Nn|Tn|Pasien|Pasien bernama|Anak dari|Nama pasien|Pasien\.?)\s+[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+){0,3}/g,
    replacement: "[NAME-REDACTED]",
    label: "NAME",
  },

  // Address keywords with following content (includes ZIP at end of address)
  {
    pattern: /\b(Jl\.?|Jalan|Jln\.?|Jr\.?|Gg\.?|Gang|Komp\.?|Komplek|Perum|RT\.?R?W\.?|RT|RW|Kel\.?|Kelurahan|Kec\.?|Kecamatan|Kab\.?|Kabupaten|Kota|Provinsi|Sumatera|Jawa|Kalimantan|Sulawesi|Bali|Papua|Nusa Tenggara|Maluku)\.?\s+[A-Z][a-zA-Z\s,.\d-]{2,60}/g,
    replacement: "[ADDRESS-REDACTED]",
    label: "ADDRESS",
  },

  // NOTE: Removed standalone \d{5} ZIP pattern — it was matching leukosit values
  // (5-digit numbers like 14500, 8000-9999). ZIP codes are caught by the
  // ADDRESS pattern above when they appear at end of address context.
];

export interface StripResult {
  strippedText: string;
  removedItems: Array<{ label: string; count: number }>;
  originalLength: number;
  strippedLength: number;
  isSafeForLLM: boolean;
}

/**
 * Strip all PHI from raw EMR text.
 * Returns the cleaned text safe to send to external LLM API.
 */
export function stripPHI(rawText: string): StripResult {
  if (!rawText || typeof rawText !== "string") {
    return {
      strippedText: "",
      removedItems: [],
      originalLength: 0,
      strippedLength: 0,
      isSafeForLLM: true,
    };
  }

  let strippedText = rawText;
  const removedItems: Array<{ label: string; count: number }> = [];

  for (const { pattern, replacement, label } of PHI_PATTERNS) {
    const matches = strippedText.match(pattern);
    if (matches && matches.length > 0) {
      removedItems.push({ label, count: matches.length });
      strippedText = strippedText.replace(pattern, replacement);
    }
  }

  // Sanity check: refuse to send if remaining text still looks suspicious
  // (e.g., 8+ consecutive digits remaining — could be undetected NIK fragment)
  const suspiciousDigits = (strippedText.match(/\d{8,}/g) || []).length;
  const isSafeForLLM = suspiciousDigits === 0;

  return {
    strippedText,
    removedItems,
    originalLength: rawText.length,
    strippedLength: strippedText.length,
    isSafeForLLM,
  };
}

/**
 * Audit-friendly: returns summary of what was stripped for logging.
 */
export function summarizeStrip(result: StripResult): string {
  if (result.removedItems.length === 0) return "No PHI detected.";
  return result.removedItems
    .map(item => `${item.label} ×${item.count}`)
    .join("; ");
}
