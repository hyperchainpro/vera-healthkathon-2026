/**
 * VERA API — Audit Trail + Human-in-the-Loop Override (Todo #17, #18)
 * POST /api/claims/[id]/audit
 *
 * Records reviewer actions: viewed, flagged, overridden, evidence_exported.
 * For "overridden" action, requires a medical reason (slide 18 PRD —
 * Human-in-the-Loop: reviewer can mark as false positive with justification).
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

    // Find or create reviewer
    let reviewerId: string | null = null;
    if (body.reviewerEmail) {
      let reviewer = await db.reviewer.findUnique({
        where: { email: body.reviewerEmail },
      });
      if (!reviewer) {
        reviewer = await db.reviewer.create({
          data: {
            email: body.reviewerEmail,
            name: body.reviewerEmail.split("@")[0],
            role: "reviewer",
          },
        });
      }
      reviewerId = reviewer.id;
    }

    // Create audit log
    const audit = await db.auditLog.create({
      data: {
        episodeId: id,
        reviewerId,
        action: body.action,
        reason: body.reason,
      },
      include: { reviewer: true },
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
      reviewerName: audit.reviewer?.name ?? "anonymous",
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
