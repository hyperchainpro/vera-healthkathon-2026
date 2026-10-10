/**
 * VERA API — Episode claims list + upload (Todo #9, #15)
 * ----------------------------------------------------
 * GET  /api/claims      → list all episodes with Red Flag sorting
 * POST /api/claims      → upload new claim (single EMR text) or batch CSV
 *
 * Returns episodes sorted by deviationScore DESC (highest Red Flag first).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripPHI } from "@/lib/data-stripping";
import { extractLabData } from "@/lib/llm-extract";
import { getStandardCurve, inferDiseaseKey } from "@/lib/clinical-curve";
import { computeDeviationScore, getFlagLevel, type PatientDataPoint } from "@/lib/thresholds";
import { requireAuth } from "@/lib/auth-utils";
import { claimUploadSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/claims — list with Red Flag sorting
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const episodes = await db.episode.findMany({
      include: {
        _count: {
          select: { labData: true },
        },
      },
      orderBy: { deviationScore: "desc" },
      take: 2000,
    });

    const serialized = episodes.map(ep => ({
      id: ep.id,
      caseId: ep.caseId,
      diseaseName: ep.diseaseName,
      diseaseCode: ep.diseaseCode,
      claimedDays: ep.claimedDays,
      actualDays: ep.actualDays,
      status: ep.status,
      deviationScore: ep.deviationScore ?? 0,
      flagLevel: ep.flagLevel ?? "LOW",
      dayCount: ep._count.labData,
      createdAt: ep.createdAt,
    }));

    return NextResponse.json({ episodes: serialized, count: serialized.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }
    console.error("[VERA] GET /api/claims error:", err);
    return NextResponse.json(
      { error: "Gagal memuat data klaim" },
      { status: 500 }
    );
  }
}

// POST /api/claims — single EMR text upload + analyze
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const rawBody = await req.json();
    const parseResult = claimUploadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    const claimedDays = body.claimedDays ?? 7;
    const diseaseKey = inferDiseaseKey(
      `${body.diseaseName ?? ""} ${body.diseaseCode ?? ""} ${body.emrText}`
    );
    const diseaseName = body.diseaseName ?? (diseaseKey === "pneumonia" ? "Pneumonia" : "Stroke");
    const diseaseCode = body.diseaseCode ?? (diseaseKey === "pneumonia" ? "J18.9" : "I63.9");

    // === Step 1: Data Stripping (Todo #10) ===
    const stripResult = stripPHI(body.emrText);
    if (!stripResult.isSafeForLLM) {
      return NextResponse.json(
        {
          error: "EMR text contains potential PHI that could not be stripped. Refusing to send to LLM.",
          stripSummary: stripResult,
        },
        { status: 422 }
      );
    }

    // === Step 2: LLM Extraction with retry + null fallback (Todo #11, #12) ===
    const extraction = await extractLabData(stripResult.strippedText);

    if (!extraction.data || extraction.data.days.length === 0) {
      const episode = await db.episode.create({
        data: {
          caseId: body.caseId,
          diseaseCode,
          diseaseName,
          admitDay: "H1",
          claimedDays,
          emrTextRaw: body.emrText,
          emrTextStrip: stripResult.strippedText,
          status: "extraction_failed",
          deviationScore: 0,
          flagLevel: "LOW",
        },
      });

      return NextResponse.json({
        episodeId: episode.id,
        status: "extraction_failed",
        error: extraction.error,
        backend: extraction.backend,
      }, { status: 422 });
    }

    // === Step 3: Compute deviation score (Todo #13) ===
    const stdCurve = getStandardCurve(diseaseKey);
    if (!stdCurve) {
      return NextResponse.json(
        { error: `No standard curve for disease: ${diseaseKey}` },
        { status: 400 }
      );
    }

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

    const { score, perDayDeviations } = computeDeviationScore(
      patientData,
      stdCurve,
      claimedDays
    );

    const flag = getFlagLevel(score);

    // === Step 4: Persist episode + lab data (one row per day) ===
    const labDataCreates = extraction.data.days.map(d => ({
      dayLabel: d.date,
      leukosit: d.leukosit,
      trombosit: d.trombosit,
      tdSistol: d.td_s,
      tdDiastol: d.td_d,
      suhu: d.suhu,
      gcs: d.gcs,
    }));

    const episode = await db.episode.create({
      data: {
        caseId: body.caseId,
        diseaseCode,
        diseaseName,
        admitDay: "H1",
        claimedDays,
        emrTextRaw: body.emrText,
        emrTextStrip: stripResult.strippedText,
        status: flag.reviewRequired ? "flagged" : "analyzed",
        deviationScore: score,
        flagLevel: flag.level,
        labData: { create: labDataCreates },
        auditLogs: {
          create: {
            action: "created",
            metadata: JSON.stringify({
              backend: extraction.backend,
              retried: extraction.retried,
              perDayDeviations,
              stripped: stripResult.removedItems,
              dayCount: extraction.data.days.length,
            }),
          },
        },
      },
      include: { labData: true },
    });

    return NextResponse.json({
      episodeId: episode.id,
      caseId: episode.caseId,
      status: episode.status,
      deviationScore: score,
      flagLevel: flag.level,
      extractionBackend: extraction.backend,
      extractionRetried: extraction.retried,
      extractedDays: extraction.data.days.length,
      stripped: stripResult.removedItems,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }
    console.error("[VERA] POST /api/claims error:", err);
    return NextResponse.json(
      { error: "Gagal memproses unggahan klaim" },
      { status: 500 }
    );
  }
}
