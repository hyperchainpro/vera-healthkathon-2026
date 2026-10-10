/**
 * VERA Users API (admin only)
 * GET /api/users — list all users with stats
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    requireRole(user, ["admin"]);

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar || u.name.split(" ").map((n) => n[0]).join("").toUpperCase(),
      department: u.department || "Audit",
      active: u.active,
      lastLogin: u.lastLogin?.toISOString() || null,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: safeUsers, count: safeUsers.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir" }, { status: 401 });
    }
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Akses ditolak: Hanya administrator yang diizinkan" }, { status: 403 });
    }
    console.error("[VERA] /api/users error:", err);
    return NextResponse.json({ error: "Gagal memuat data pengguna" }, { status: 500 });
  }
}
