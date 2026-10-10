/**
 * VERA Auth — Current User API
 * GET /api/auth/me
 * Reads vera-session cookie, returns current user or null
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/auth-utils";

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

    const sessionData = verifySession(sessionMatch[1]);
    if (!sessionData) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await db.user.findUnique({
      where: { id: sessionData.uid },
    });

    if (!user || !user.active) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const cleanName = user.name.replace(/^(dr\.|Dr\.|prof\.|Prof\.)\s*/i, "").replace(/,.*$/, "").trim();
    const nameParts = cleanName.split(/\s+/);
    const computedAvatar = nameParts.length >= 2 ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase() : (nameParts[0]?.[0] || "U").toUpperCase();

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || computedAvatar,
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
