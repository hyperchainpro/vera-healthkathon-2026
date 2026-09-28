/**
 * VERA API — Audit Trail + Human-in-the-Loop Override (Todo #17, #18)
 * POST /api/claims/[id]/audit
 *
 * Records user actions: viewed, flagged, overridden, evidence_exported.
 * For "overridden" action, requires a medical reason (slide 18 PRD —
 * Human-in-the-Loop: user can mark as false positive with justification).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuditBody {
  action: "viewed" | "flagged" | "overridden" | "evidence_exported";
  reason?: string;
  reviewerEmail?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: AuditBody = await req.json();

    if (!body.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // Validate: overridden requires reason
    if (body.action === "overridden" && (!body.reason || body.reason.length < 5)) {
      return NextResponse.json(
        { error: "Medical reason required for override (min 5 chars)" },
        { status: 400 }
      );
    }

    // Find user by email
    let userId: string | null = null;
    if (body.reviewerEmail) {
      const user = await db.user.findUnique({
        where: { email: body.reviewerEmail.toLowerCase().trim() },
      });
      if (user) userId = user.id;
    }

    // Create audit log
    const audit = await db.auditLog.create({
      data: {
        episodeId: id,
        userId,
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
      reviewerName: audit.user?.name ?? "anonymous",
      createdAt: audit.createdAt,
    });
  } catch (err) {
    console.error("[VERA] POST /api/claims/[id]/audit error:", err);
    return NextResponse.json(
      { error: "Audit log creation failed", detail: String(err) },
      { status: 500 }
    );
  }
}
