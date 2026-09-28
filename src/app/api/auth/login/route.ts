/**
 * VERA Auth — Login API
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user: VERAUser } with cookie session
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_PERMISSIONS = {
  admin: ["dashboard", "cases", "audit", "upload", "settings", "profile", "users"],
  supervisor: ["dashboard", "cases", "audit", "upload", "profile"],
  reviewer: ["dashboard", "cases", "audit", "upload", "profile"],
  medical_officer: ["dashboard", "cases", "audit", "profile"],
} as const;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Demo password check (in production: use bcrypt.compare)
    if (user.password !== password) {
      // Log failed attempt
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "login_failed",
          metadata: JSON.stringify({ email, timestamp: new Date().toISOString() }),
        },
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Update lastLogin
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log successful login
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "login",
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
      },
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || user.name.split(" ").map(n => n[0]).join("").toUpperCase(),
      department: user.department || "Audit",
      lastLogin: new Date().toISOString(),
      permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
    };

    // Set cookie (demo: base64 encode user ID — production: use signed JWT)
    const sessionToken = Buffer.from(JSON.stringify({ uid: user.id, ts: Date.now() })).toString("base64");

    const response = NextResponse.json({ user: safeUser });
    response.cookies.set("vera-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[VERA] Login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
