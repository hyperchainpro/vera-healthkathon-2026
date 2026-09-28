/**
 * VERA Auth — Current User API
 * GET /api/auth/me
 * Reads vera-session cookie, returns current user or null
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_PERMISSIONS = {
  admin: ["dashboard", "cases", "audit", "upload", "settings", "profile", "users"],
  supervisor: ["dashboard", "cases", "audit", "upload", "profile"],
  reviewer: ["dashboard", "cases", "audit", "upload", "profile"],
  medical_officer: ["dashboard", "cases", "audit", "profile"],
} as const;

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/vera-session=([^;]+)/);

    if (!sessionMatch) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const sessionToken = sessionMatch[1];
    let sessionData: { uid: string; ts: number };

    try {
      sessionData = JSON.parse(Buffer.from(sessionToken, "base64").toString());
    } catch {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Session expires after 24 hours
    if (Date.now() - sessionData.ts > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await db.user.findUnique({
      where: { id: sessionData.uid },
    });

    if (!user || !user.active) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase(),
      department: user.department || "Audit",
      lastLogin: user.lastLogin?.toISOString() || null,
      permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
    };

    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error("[VERA] /me error:", err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
