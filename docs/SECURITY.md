# SECURITY GUIDELINES - VERA

## Security Requirements Checklist

### Authentication
- [x] Private routes require authentication (NextAuth)
- [ ] Session management configured with HttpOnly, Secure, SameSite cookies
- [ ] Password hashing dengan bcrypt/argon2
- [ ] Rate limiting pada login endpoint

### Authorization
- [ ] Users can only access resources they own
- [ ] Role-based access control (RBAC) implemented
- [ ] Admin routes properly protected
- [ ] API endpoints validate user permissions

### Secrets Management
- [ ] Never expose secrets to client-side code
- [ ] All secrets in environment variables
- [ ] `.env` files never committed to Git
- [ ] Secrets rotated after any exposure
- [ ] Use different credentials for dev/staging/production

### Database Security
- [x] Use Prisma ORM (parameterized queries - SQL injection protected)
- [x] Database uses SSL/TLS (Neon PostgreSQL)
- [ ] Database user has least privilege permissions
- [ ] Row Level Security (RLS) policies configured
- [ ] Regular database backups configured

### Input Validation
- [ ] Validate all user input (use Zod)
- [ ] Sanitize user input before processing
- [ ] File upload restrictions (type, size)
- [ ] Prevent path traversal in file operations

### API Security
- [ ] Rate limiting implemented
- [ ] CORS configured (whitelist allowed origins)
- [ ] CSRF protection enabled (NextAuth handles this)
- [ ] Request body size limits
- [ ] API versioning strategy

### Headers & Transport
- [ ] HTTPS enforced in production
- [ ] Security headers configured:
  - Content-Security-Policy (CSP)
  - Strict-Transport-Security (HSTS)
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy

### Error Handling
- [ ] Generic error messages to users
- [ ] Detailed errors only in server logs
- [ ] No stack traces in production responses
- [ ] Error monitoring configured (Sentry/similar)

### File Upload Security
- [ ] Validate file types (whitelist only)
- [ ] Scan uploaded files (antivirus)
- [ ] Store uploads outside web root
- [ ] Generate random filenames
- [ ] Validate file size limits

### Logging & Monitoring
- [ ] Log authentication events
- [ ] Log authorization failures
- [ ] Never log passwords or tokens
- [ ] Set up security alerts
- [ ] Monitor for suspicious activity

---

## Implementation Examples

### 1. Security Headers (middleware.ts)
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CSP Header
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.openrouter.ai; " +
    "frame-ancestors 'none';"
  );

  // HSTS Header
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 2. Rate Limiting
```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
  analytics: true,
});

// Usage in API route
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // Process request...
}
```

### 3. Input Validation dengan Zod
```typescript
// lib/validations/claim.ts
import { z } from "zod";

export const ClaimSchema = z.object({
  patientName: z.string().min(3).max(100),
  diagnosis: z.string().min(5).max(500),
  admissionDate: z.string().datetime(),
  documents: z.array(z.string().url()).max(10),
});

// Usage in API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = ClaimSchema.parse(body);
    
    // Process validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: error.errors }),
        { status: 400 }
      );
    }
    throw error;
  }
}
```

### 4. Authorization Middleware
```typescript
// lib/auth/check-permission.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function checkPermission(
  resourceId: string,
  action: "read" | "write" | "delete"
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check if user owns the resource
  const resource = await prisma.claim.findUnique({
    where: { id: resourceId },
    select: { userId: true },
  });

  if (resource?.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  return true;
}
```

### 5. Safe Error Handling
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: true = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Usage in API route
export async function POST(request: Request) {
  try {
    // Your logic here
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode }
      );
    }

    // Log detailed error server-side
    console.error("Unexpected error:", error);

    // Return generic message to client
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
```

---

## Credential Rotation Protocol

### When to Rotate
1. After any suspected security breach
2. When credentials are accidentally exposed (e.g., committed to Git)
3. When team member with access leaves
4. Periodically (every 90 days for critical systems)

### How to Rotate

#### 1. Database Credentials (Neon)
```bash
# Go to Neon Console
# Settings > Reset Password
# Update environment variables in Vercel
```

#### 2. API Keys
```bash
# OpenRouter: Regenerate in dashboard
# Update OPENROUTER_API_KEY in Vercel
```

#### 3. NextAuth Secret
```bash
openssl rand -base64 32
# Update NEXTAUTH_SECRET in Vercel
```

#### 4. Update Vercel Environment Variables
```bash
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
vercel env rm OPENROUTER_API_KEY production
vercel env add OPENROUTER_API_KEY production
```

#### 5. Redeploy
```bash
vercel --prod
```

---

## Security Checklist Before Launch

### Pre-Production
- [ ] All secrets rotated and properly configured
- [ ] `.env` removed from Git history
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Authorization checks on all protected routes
- [ ] Error handling doesn't leak sensitive info

### Production
- [ ] HTTPS enforced
- [ ] Security headers verified (securityheaders.com)
- [ ] Rate limiting tested
- [ ] Penetration testing completed
- [ ] Dependency audit clean (`npm audit`)
- [ ] Monitoring and alerts configured
- [ ] Backup and restore procedure tested

### Post-Launch
- [ ] Monitor logs for suspicious activity
- [ ] Regular dependency updates
- [ ] Periodic security audits
- [ ] Incident response plan documented

---

## Incident Response

### If Credentials Are Compromised
1. **IMMEDIATE**: Rotate all affected credentials
2. Check logs for unauthorized access
3. Notify affected users if data breach occurred
4. Document incident and response
5. Update security measures to prevent recurrence

### Contact
- Security Issues: security@your-domain.com
- Emergency: [Your emergency contact]
