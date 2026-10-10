/**
 * VERA Auth — Login API
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user: VERAUser } with cookie session
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/schemas";
import { hashPassword, verifyPassword } from "@/lib/password-hash";
import { signSession } from "@/lib/auth-utils";

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
    const rawBody = await req.json();
    const parseResult = loginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Format input tidak valid", details: parseResult.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Email atau kata sandi tidak valid" }, { status: 401 });
    }

    // Secure verification: support bcrypt and graceful progressive auto-migration
    let passwordValid = false;
    const isBcrypt = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");

    if (isBcrypt) {
      passwordValid = await verifyPassword(password, user.password);
    } else {
      // Direct comparison for legacy seed data, then auto-upgrade to bcrypt
      if (user.password === password) {
        passwordValid = true;
        const newHash = await hashPassword(password);
        await db.user.update({
          where: { id: user.id },
          data: { password: newHash },
        });
      }
    }

    if (!passwordValid) {
      // Log failed attempt
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "login_failed",
          metadata: JSON.stringify({ email, timestamp: new Date().toISOString() }),
        },
      });
      return NextResponse.json({ error: "Email atau kata sandi tidak valid" }, { status: 401 });
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
      lastLogin: new Date().toISOString(),
      permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
    };

    // Set HMAC-signed session cookie
    const sessionToken = signSession(user.id);

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
    console.error("[VERA] Login error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
