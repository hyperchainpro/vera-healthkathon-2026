/**
 * VERA Users API (admin only)
 * GET /api/users — list all users with stats
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar || u.name.split(" ").map(n => n[0]).join("").toUpperCase(),
      department: u.department || "Audit",
      active: u.active,
      lastLogin: u.lastLogin?.toISOString() || null,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: safeUsers, count: safeUsers.length });
  } catch (err) {
    console.error("[VERA] /api/users error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
