/**
 * VERA Authentication Utilities
 * HMAC-signed sessions, auth guards, and role-based access control
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

const SESSION_COOKIE_NAME = "vera-session";
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Sign a session token with HMAC-SHA256
 * Token format: base64(payload)|base64(signature)
 * Payload: {uid: userId, ts: timestamp}
 */
export function signSession(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET not configured");
  }

  const payload = {
    uid: userId,
    ts: Date.now(),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson).toString("base64");

  const hmac = createHmac("sha256", secret);
  hmac.update(payloadB64);
  const signature = hmac.digest("base64");

  return `${payloadB64}|${signature}`;
}

/**
 * Verify a session token and extract payload
 * Returns null if token is invalid, expired, or signature doesn't match
 */
export function verifySession(token: string): { uid: string; ts: number } | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET not configured");
  }

  try {
    const parts = token.split("|");
    if (parts.length !== 2) return null;

    const [payloadB64, signatureProvided] = parts;

    // Recompute signature
    const hmac = createHmac("sha256", secret);
    hmac.update(payloadB64);
    const signatureExpected = hmac.digest("base64");

    // Timing-safe comparison to prevent timing attacks
    const sigProvidedBuf = Buffer.from(signatureProvided, "base64");
    const sigExpectedBuf = Buffer.from(signatureExpected, "base64");

    if (sigProvidedBuf.length !== sigExpectedBuf.length) return null;
    if (!timingSafeEqual(sigProvidedBuf, sigExpectedBuf)) return null;

    // Decode payload
    const payloadJson = Buffer.from(payloadB64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    // Check expiry (24 hours)
    const now = Date.now();
    if (now - payload.ts > SESSION_EXPIRY_MS) return null;

    return { uid: payload.uid, ts: payload.ts };
  } catch (err) {
    // Invalid format or parse error
    return null;
  }
}

/**
 * Authentication guard - requires valid session
 * Throws 401 if not authenticated
 * Returns userId and user object if authenticated
 */
export async function requireAuth(req: Request): Promise<{ userId: string; user: User }> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    throw new Error("Unauthorized: No session token");
  }

  const session = verifySession(token);
  if (!session) {
    throw new Error("Unauthorized: Invalid or expired session");
  }

  const user = await db.user.findUnique({
    where: { id: session.uid },
  });

  if (!user || !user.active) {
    throw new Error("Unauthorized: User not found or inactive");
  }

  return { userId: user.id, user };
}

/**
 * Role-based access control guard
 * Throws 403 if user doesn't have required role
 */
export function requireRole(user: User, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Requires one of roles: ${allowedRoles.join(", ")}`);
  }
}
