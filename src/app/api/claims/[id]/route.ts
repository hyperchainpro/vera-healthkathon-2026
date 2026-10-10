/**
 * VERA API — Episode detail (Todo #16)
 * GET /api/claims/[id] → episode detail + lab data + audit logs
 *
 * Returns full detail for Reviewer Dashboard's right panel.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStandardCurve, inferDiseaseKey } from "@/lib/clinical-curve";
import { requireAuth } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await params;

    const episode = await db.episode.findUnique({
      where: { id },
      include: {
        labData: { orderBy: { dayLabel: "asc" } },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    // Get the standard curve for this disease to render in chart
    const diseaseKey = inferDiseaseKey(episode.diseaseName + " " + episode.diseaseCode);
    const stdCurve = getStandardCurve(diseaseKey);

    return NextResponse.json({
      episode: {
        id: episode.id,
        caseId: episode.caseId,
        diseaseCode: episode.diseaseCode,
        diseaseName: episode.diseaseName,
        admitDay: episode.admitDay,
        claimedDays: episode.claimedDays,
        actualDays: episode.actualDays,
        status: episode.status,
        deviationScore: episode.deviationScore ?? 0,
        flagLevel: episode.flagLevel ?? "LOW",
        emrTextStrip: episode.emrTextStrip, // only the stripped version, never raw
        createdAt: episode.createdAt,
      },
      labData: episode.labData.map(l => ({
        id: l.id,
        dayLabel: l.dayLabel,
        leukosit: l.leukosit,
        trombosit: l.trombosit,
        tdSistol: l.tdSistol,
        tdDiastol: l.tdDiastol,
        suhu: l.suhu,
        gcs: l.gcs,
      })),
      standardCurve: stdCurve ? {
        disease: stdCurve.disease,
        icd10: stdCurve.icd10,
        recommendedDischarge: stdCurve.recommendedDischarge,
        reference: stdCurve.reference,
        curve: stdCurve.curve,
      } : null,
      auditLogs: episode.auditLogs.map(a => ({
        id: a.id,
        action: a.action,
        reason: a.reason,
        reviewerName: a.user?.name ?? "system",
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }
    console.error("[VERA] GET /api/claims/[id] error:", err);
    return NextResponse.json(
      { error: "Gagal memuat detail episode" },
      { status: 500 }
    );
  }
}
