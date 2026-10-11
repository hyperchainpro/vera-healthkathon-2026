import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_USERS_FALLBACK: Record<string, any> = {
  "demo-admin": { id: "demo-admin", email: "admin@bpjs.go.id", name: "Dr. Admin Saputra", role: "admin", avatar: "DAS", department: "System Administrator", permissions: ["dashboard", "cases", "audit", "upload", "settings", "profile", "users"] },
  "demo-supervisor": { id: "demo-supervisor", email: "supervisor@bpjs.go.id", name: "Dr. Maya Supervisor", role: "supervisor", avatar: "DMS", department: "Audit Supervisor", permissions: ["dashboard", "cases", "audit", "upload", "profile"] },
  "demo-reviewer": { id: "demo-reviewer", email: "reviewer@bpjs.go.id", name: "Andi Reviewer", role: "reviewer", avatar: "AR", department: "Medical Audit", permissions: ["dashboard", "cases", "audit", "upload", "profile"] },
  "demo-medical_officer": { id: "demo-medical_officer", email: "medofficer@bpjs.go.id", name: "Dr. Budi Medical", role: "medical_officer", avatar: "DBM", department: "Clinical Review", permissions: ["dashboard", "cases", "audit", "profile"] },
};

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/vera-session=([^;]+)/);

    if (!sessionMatch) {
      return NextResponse.json({ user: null });
    }

    const sessionToken = sessionMatch[1];
    let sessionData: { uid: string; ts: number };

    try {
      sessionData = JSON.parse(Buffer.from(sessionToken, "base64").toString());
    } catch {
      return NextResponse.json({ user: null });
    }

    // Session expires after 24 hours
    if (Date.now() - sessionData.ts > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ user: null });
    }

    // Check demo user first (fallback)
    if (sessionData.uid.startsWith("demo-")) {
      const demoUser = DEMO_USERS_FALLBACK[sessionData.uid];
      if (demoUser) {
        return NextResponse.json({ user: { ...demoUser, lastLogin: null } });
      }
    }

    // Try DB lookup
    try {
      const { db } = await import("@/lib/db");
      const user = await db.user.findUnique({ where: { id: sessionData.uid } });
      if (user && user.active) {
        const ROLE_PERMISSIONS: Record<string, string[]> = {
          admin: ["dashboard", "cases", "audit", "upload", "settings", "profile", "users"],
          supervisor: ["dashboard", "cases", "audit", "upload", "profile"],
          reviewer: ["dashboard", "cases", "audit", "upload", "profile"],
          medical_officer: ["dashboard", "cases", "audit", "profile"],
        };
        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar || user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase(),
            department: user.department || "Audit",
            lastLogin: user.lastLogin?.toISOString() || null,
            permissions: ROLE_PERMISSIONS[user.role] || [],
          },
        });
      }
    } catch (dbErr) {
      console.log("[VERA] /me DB lookup failed");
    }

    return NextResponse.json({ user: null });
  } catch (err) {
    console.error("[VERA] /me error:", err);
    return NextResponse.json({ user: null });
  }
}
