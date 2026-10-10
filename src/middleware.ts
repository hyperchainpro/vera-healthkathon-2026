/**
 * VERA Security Middleware
 * - Rate limiting for all API routes
 * - Security headers (CSP, HSTS, X-Frame-Options, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for") || request.ip || "127.0.0.1";

    // Stricter rate limit for auth endpoints
    if (pathname.startsWith("/api/auth/login")) {
      const { allowed, remaining, reset } = rateLimiter.check(
        `login:${ip}`,
        5, // 5 requests
        15 * 60 * 1000 // per 15 minutes
      );

      if (!allowed) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Too many login attempts. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": "5",
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": new Date(reset).toISOString(),
            },
          }
        );
      }
    } else {
      // General API rate limit
      const { allowed, remaining, reset } = rateLimiter.check(
        `api:${ip}`,
        100, // 100 requests
        60 * 1000 // per minute
      );

      if (!allowed) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Rate limit exceeded. Please slow down." },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": "100",
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": new Date(reset).toISOString(),
            },
          }
        );
      }
    }
  }

  // Continue with request and add security headers
  const response = NextResponse.next();

  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openrouter.ai",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Clickjacking protection
  response.headers.set("X-Frame-Options", "DENY");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy (disable unnecessary features)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
