/**
 * VERA API — Audit Trail + Human-in-the-Loop Override
 * POST /api/claims/[id]/audit
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { claimAuditSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth(req);
    const { id } = await params;

    const rawBody = await req.json();
    const parseResult = claimAuditSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    // Verify episode exists
    const episode = await db.episode.findUnique({
      where: { id },
    });

    if (!episode) {
      return NextResponse.json({ error: "Episode klaim tidak ditemukan" }, { status: 404 });
    }

    // Create audit log linked to authenticated user
    const audit = await db.auditLog.create({
      data: {
        episodeId: id,
        userId: user.id,
        action: body.action,
        reason: body.reason,
      },
      include: { user: true },
    });

    // If overridden, update episode status
    if (body.action === "overridden") {
      await db.episode.update({
        where: { id },
        data: { status: "audited" },
      });
    }

    return NextResponse.json({
      auditId: audit.id,
      action: audit.action,
      reviewerName: user.name,
      createdAt: audit.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }
    console.error("[VERA] POST /api/claims/[id]/audit error:", err);
    return NextResponse.json(
      { error: "Gagal mencatat audit log" },
      { status: 500 }
    );
  }
}
