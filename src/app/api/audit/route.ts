/**
 * VERA Audit Trail API
 * GET /api/audit — list all audit logs (filterable)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { paginationSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    requireRole(user, ["admin", "supervisor"]);

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const episodeId = url.searchParams.get("episodeId") || undefined;
    
    // Validate pagination with Zod
    const paginationResult = paginationSchema.safeParse({
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    });
    
    if (!paginationResult.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: paginationResult.error.issues[0]?.message },
        { status: 400 }
      );
    }
    
    const { limit, offset } = paginationResult.data;

    const where: {
      userId?: string;
      action?: string;
      episodeId?: string;
    } = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (episodeId) where.episodeId = episodeId;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        episode: { select: { id: true, caseId: true, diseaseName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await db.auditLog.count({ where });

    const serialized = logs.map((log) => ({
      id: log.id,
      action: log.action,
      reason: log.reason,
      metadata: log.metadata,
      createdAt: log.createdAt,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            role: log.user.role,
            avatar: log.user.avatar || log.user.name.split(" ").map((n) => n[0]).join("").toUpperCase(),
          }
        : null,
      episode: log.episode
        ? {
            id: log.episode.id,
            caseId: log.episode.caseId,
            diseaseName: log.episode.diseaseName,
          }
        : null,
    }));

    return NextResponse.json({ logs: serialized, total, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }
    console.error("[VERA] /api/audit error:", err);
    return NextResponse.json({ error: "Gagal memuat catatan audit" }, { status: 500 });
  }
}
