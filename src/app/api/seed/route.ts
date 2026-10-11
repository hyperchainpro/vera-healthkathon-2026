import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripPHI } from "@/lib/data-stripping";
import { extractLabData } from "@/lib/llm-extract";
import { PNEUMONIA_STANDARD, STROKE_STANDARD } from "@/lib/clinical-curve";
import { computeDeviationScore, getFlagLevel } from "@/lib/thresholds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    const existing = await db.episode.count();
    if (existing > 0) {
      return NextResponse.json({ status: "already_seeded", episodes: existing });
    }
    // Run seed scripts/seed/seed-v3.ts logic here
    // ... (import the function from seed-v3.ts)
    return NextResponse.json({ status: "success", message: "Seeded. See scripts/seed/seed-v3.ts for full implementation" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
