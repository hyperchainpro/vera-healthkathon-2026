import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo credentials (HARDCODED — login PASTI work tanpa DB)
const DEMO_USERS = [
  { email: "admin@bpjs.go.id", password: "vera2026", name: "Dr. Admin Saputra", role: "admin", department: "System Administrator" },
  { email: "supervisor@bpjs.go.id", password: "vera2026", name: "Dr. Maya Supervisor", role: "supervisor", department: "Audit Supervisor" },
  { email: "reviewer@bpjs.go.id", password: "vera2026", name: "Andi Reviewer", role: "reviewer", department: "Medical Audit" },
  { email: "medofficer@bpjs.go.id", password: "vera2026", name: "Dr. Budi Medical", role: "medical_officer", department: "Clinical Review" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["dashboard", "cases", "audit", "upload", "settings", "profile", "users"],
  supervisor: ["dashboard", "cases", "audit", "upload", "profile"],
  reviewer: ["dashboard", "cases", "audit", "upload", "profile"],
  medical_officer: ["dashboard", "cases", "audit", "profile"],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.toLowerCase().trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    // Coba DB dulu (kalau ada connection + users)
    let userData = null;
    try {
      const { db } = await import("@/lib/db");
      const { verifyPassword } = await import("@/lib/password-hash");

      const dbUser = await db.user.findUnique({ where: { email } });
      if (dbUser && dbUser.active) {
        const valid = await verifyPassword(password, dbUser.password);
        if (valid) {
          userData = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            avatar: dbUser.avatar || dbUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase(),
            department: dbUser.department || "Audit",
            lastLogin: new Date().toISOString(),
            permissions: ROLE_PERMISSIONS[dbUser.role] || [],
          };
          // Update lastLogin (best-effort)
          db.user.update({ where: { id: dbUser.id }, data: { lastLogin: new Date() } }).catch(() => {});
        }
      }
    } catch (dbErr) {
      console.log("[VERA] DB lookup failed, using demo users:", dbErr);
    }

    // Fallback ke demo users (HARDCODED)
    if (!userData) {
      const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
      if (demoUser) {
        userData = {
          id: `demo-${demoUser.role}`,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          avatar: demoUser.name.split(" ").map(n => n[0]).join("").toUpperCase(),
          department: demoUser.department,
          lastLogin: new Date().toISOString(),
          permissions: ROLE_PERMISSIONS[demoUser.role] || [],
        };
      }
    }

    if (!userData) {
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
    }

    // Set session cookie (simple base64 — production-grade pakai JWT signed)
    const sessionToken = Buffer.from(JSON.stringify({ uid: userData.id, ts: Date.now() })).toString("base64");

    const response = NextResponse.json({ user: userData });
    response.cookies.set("vera-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[VERA] Login error:", err);
    return NextResponse.json({ error: "Login gagal" }, { status: 500 });
  }
        }
