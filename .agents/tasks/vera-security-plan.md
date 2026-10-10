# VERA Security Hardening Implementation Plan

This plan addresses critical security vulnerabilities discovered in the VERA healthcare application. The work is ordered by risk priority: authentication infrastructure first, endpoint hardening second, defense-in-depth measures third, and documentation last.

## Critical Findings Summary

- **Plain-text passwords**: login route compares `user.password !== password` directly
- **Forgeable sessions**: base64(JSON) tokens with no HMAC signature
- **No authentication on API routes**: ALL endpoints (/api/claims, /api/stats, /api/audit, /api/users) accessible without login
- **Error detail leakage**: `detail: String(err)` exposes internal errors
- **No rate limiting**: brute force attacks possible
- **No security headers**: missing CSP, HSTS, X-Frame-Options
- **No input validation**: Zod installed but unused

## FEAT-001: Authentication Infrastructure (CRITICAL - DO FIRST)

### What
Implement password hashing with bcryptjs, HMAC-signed session tokens using Node.js crypto, and auth utility functions. This creates the foundation for all endpoint protection.

### Steps

- [ ] 1. Install bcryptjs and @types/bcryptjs via npm
      **Command**: `npm install bcryptjs @types/bcryptjs`
      **Files**: package.json
      **Verify**: `npm install` completes without errors; `npm run dev` starts without TypeScript errors

- [ ] 2. Create auth utility functions in src/lib/auth-utils.ts
      **What**: Export four functions:
      - `signSession(userId: string): string` - uses crypto.createHmac('sha256', NEXTAUTH_SECRET) on JSON {uid, ts}, returns base64(payload|signature)
      - `verifySession(token: string): {uid: string; ts: number} | null` - splits token, recomputes HMAC, compares signatures, checks 24h expiry
      - `requireAuth(req: Request): Promise<{userId: string; user: User}>` - extracts vera-session cookie, calls verifySession, fetches user from db, throws 401 if any step fails
      - `requireRole(user: User, allowedRoles: string[]): void` - checks user.role in allowedRoles, throws 403 if not
      **Files**: src/lib/auth-utils.ts (new file)
      **Verify**: Read the file and confirm all four functions exist with correct signatures and HMAC logic

- [ ] 3. Create password hashing utilities in src/lib/password-hash.ts
      **What**: Export two functions:
      - `hashPassword(plain: string): Promise<string>` - uses bcrypt.hash with cost 12
      - `verifyPassword(plain: string, hash: string): Promise<boolean>` - uses bcrypt.compare
      **Files**: src/lib/password-hash.ts (new file)
      **Verify**: Read the file and confirm both functions exist with bcrypt calls

- [ ] 4. Update login route to use signed tokens and password verification
      **What**: 
      - Import verifyPassword and signSession
      - Replace `user.password !== password` with `await verifyPassword(password, user.password)`
      - Add TODO comment: "Existing DB has plain-text passwords - run scripts/migrate-passwords.ts before deployment"
      - Replace base64 session with `signSession(user.id)`
      - Remove `detail: String(err)` from error response
      **Files**: src/app/api/auth/login/route.ts
      **Verify**: `curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"wrong"}' -v` returns 401 with no error detail leak; inspect vera-session cookie value to confirm it's longer (includes signature)

- [ ] 5. Update /me route to use verifySession helper
      **What**:
      - Import verifySession
      - Replace manual cookie parsing + base64 decode with verifySession call
      - Keep existing 24h expiry logic (verifySession handles it)
      - Never log session tokens
      **Files**: src/app/api/auth/me/route.ts
      **Verify**: `curl http://localhost:3000/api/auth/me -H 'Cookie: vera-session=<valid-token>'` returns user data

- [ ] 6. Document migration requirement in Prisma schema
      **What**: Add comment to password field: "password field currently stores plain text - must run scripts/migrate-passwords.ts to hash existing passwords before deploying auth-utils changes"
      **Files**: prisma/schema.prisma
      **Verify**: Read schema file and confirm comment present

## FEAT-002: Endpoint Protection & Validation (CRITICAL - DO SECOND)

### What
Add authentication guards to all API routes and implement Zod input validation. Protects healthcare data from unauthenticated access and prevents injection attacks.

### Steps

- [ ] 1. Create Zod validation schemas in src/lib/validation/schemas.ts
      **What**: Export four schemas:
      - `loginSchema` for {email: z.string().email(), password: z.string().min(8)}
      - `claimUploadSchema` for {caseId: z.string().min(1), diseaseCode: z.string().optional(), diseaseName: z.string().optional(), emrText: z.string().min(10), claimedDays: z.number().int().positive().optional()}
      - `auditActionSchema` for {action: z.enum(['viewed','flagged','overridden','evidence_exported']), reason: z.string().optional(), reviewerEmail: z.string().email().optional()}
      - `paginationSchema` for {limit: z.coerce.number().int().min(1).max(500).default(100), offset: z.coerce.number().int().min(0).default(0)}
      **Files**: src/lib/validation/schemas.ts (new file)
      **Verify**: Read file and confirm all schemas exported with correct Zod validators

- [ ] 2. Validate login input with Zod
      **What**: Add loginSchema.safeParse at start of POST handler in login route, return 400 with validation errors if !success
      **Files**: src/app/api/auth/login/route.ts
      **Verify**: `curl -X POST http://localhost:3000/api/auth/login -d '{"email":"invalid"}' -H 'Content-Type: application/json'` returns 400 with Zod error

- [ ] 3. Protect /api/claims with auth and validation
      **What**:
      - GET handler: add `const {userId, user} = await requireAuth(req)` at start, catch and return 401
      - POST handler: add requireAuth, validate body with claimUploadSchema.safeParse, return 400 if invalid
      - Remove `detail: String(err)` from all catch blocks
      **Files**: src/app/api/claims/route.ts
      **Verify**: `curl http://localhost:3000/api/claims` returns 401; authenticated request with invalid body returns 400; valid authenticated request succeeds

- [ ] 4. Protect /api/claims/[id] with auth and IDOR logging
      **What**:
      - Add requireAuth at start
      - After fetching episode, create audit log entry for 'viewed_case' action with userId
      - Remove error detail leak
      **Files**: src/app/api/claims/[id]/route.ts
      **Verify**: Unauthenticated `curl http://localhost:3000/api/claims/<id>` returns 401; authenticated request succeeds and creates audit log

- [ ] 5. Protect /api/claims/[id]/audit with auth, validation, and role check
      **What**:
      - Add requireAuth at start
      - Validate body with auditActionSchema
      - Use authenticated userId instead of reviewerEmail from body
      - Add `requireRole(user, ['admin','supervisor','reviewer'])` before allowing override action
      - Remove error detail leak
      **Files**: src/app/api/claims/[id]/audit/route.ts
      **Verify**: Unauthenticated request returns 401; medical_officer role attempting override returns 403; valid reviewer override succeeds

- [ ] 6. Protect /api/stats with auth and role check
      **What**:
      - Add requireAuth at start
      - Add `requireRole(user, ['admin','supervisor','reviewer'])`
      - Remove error detail leak
      **Files**: src/app/api/stats/route.ts
      **Verify**: Unauthenticated returns 401; medical_officer returns 403; reviewer/admin succeeds

- [ ] 7. Protect /api/audit with auth, validation, and role check
      **What**:
      - Add requireAuth at start
      - Validate query params with paginationSchema for limit/offset
      - Add `requireRole(user, ['admin','supervisor'])`
      - Remove error detail leak
      **Files**: src/app/api/audit/route.ts
      **Verify**: Unauthenticated returns 401; reviewer role returns 403; supervisor succeeds

- [ ] 8. Protect /api/users with auth and admin-only role check
      **What**:
      - Add requireAuth at start
      - Add `requireRole(user, ['admin'])`
      - Remove error detail leak
      **Files**: src/app/api/users/route.ts
      **Verify**: Unauthenticated returns 401; non-admin returns 403; admin succeeds

## FEAT-003: Security Headers & Rate Limiting (HIGH PRIORITY - DO THIRD)

### What
Implement security headers and rate limiting via Next.js middleware. Adds defense-in-depth: CSP prevents XSS, HSTS enforces HTTPS, rate limiting prevents brute force and DoS.

### Steps

- [ ] 1. Create in-memory rate limiter in src/lib/rate-limit.ts
      **What**: Export RateLimiter class with:
      - Map<string, {timestamps: number[]}> storage
      - `check(key: string, limit: number, windowMs: number): {allowed: boolean; remaining: number; reset: number}` method that filters timestamps within window, checks count <= limit, adds current timestamp if allowed
      - `cleanup()` method to prune old entries
      - Export singleton instance with 15-min auto-cleanup interval
      - Add ponytail comment: "ponytail: in-memory rate limiter loses state on restart and doesn't work across multiple instances; upgrade path is Redis-backed (Upstash) when scaling horizontally"
      **Files**: src/lib/rate-limit.ts (new file)
      **Verify**: Read file and confirm RateLimiter class exists with check() method and cleanup logic

- [ ] 2. Create Next.js middleware with rate limiting and security headers
      **What**: Create src/middleware.ts with:
      - Export config matcher: `{matcher: '/api/:path*'}`
      - Import RateLimiter singleton
      - For /api/auth/login: rate limit 5 requests per 15 minutes per IP (extract from x-forwarded-for or req.ip), return 429 with Retry-After header if exceeded
      - For all other /api/* routes: rate limit 100 requests per minute per IP
      - Add security headers to ALL responses:
        * Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'
        * X-Content-Type-Options: nosniff
        * X-Frame-Options: DENY
        * Referrer-Policy: strict-origin-when-cross-origin
        * Permissions-Policy: camera=(), microphone=(), geolocation=()
      - In production (NODE_ENV=production), add: Strict-Transport-Security: max-age=31536000; includeSubDomains
      **Files**: src/middleware.ts (new file)
      **Verify**: `curl -I http://localhost:3000/api/auth/me` shows X-Frame-Options, CSP, X-Content-Type-Options headers; bash loop making 6 rapid login requests confirms 6th returns 429

- [ ] 3. Test rate limiting with rapid requests
      **What**: Make 6 rapid POST requests to /api/auth/login from same IP, confirm 6th returns 429
      **Verify**: Use bash loop: `for i in {1..6}; do curl -X POST http://localhost:3000/api/auth/login -d '{"email":"test","password":"test"}' -H 'Content-Type: application/json' -w '\n%{http_code}\n'; done` - last response is 429

## FEAT-004: Documentation & Migration Scripts (MEDIUM PRIORITY - DO LAST)

### What
Document password migration procedure and git history cleanup. Creates runnable scripts for operator to hash existing passwords and purge .env from git history.

### Steps

- [ ] 1. Create password migration script
      **What**: Create scripts/migrate-passwords.ts with:
      - Import PrismaClient and hashPassword
      - Fetch all users
      - For each user, if password doesn't start with '$2a$' (bcrypt prefix), hash and update
      - Transaction rollback on error
      - Dry-run mode flag
      - Usage instructions in header comment: 'Run with: npx ts-node scripts/migrate-passwords.ts --dry-run (preview) then npx ts-node scripts/migrate-passwords.ts (apply)'
      **Files**: scripts/migrate-passwords.ts (new file)
      **Verify**: Read file and confirm dry-run flag exists, uses hashPassword, has transaction logic

- [ ] 2. Create git history cleanup script
      **What**: Create scripts/cleanup-git-history.sh with:
      - Git filter-branch commands to remove .env from history
      - Warning banner: THIS IS DESTRUCTIVE - backs up repo first, requires force-push, invalidates all clones
      - Commands: `git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all; git push origin --force --all`
      - Note to rotate all secrets after cleanup
      **Files**: scripts/cleanup-git-history.sh (new file)
      **Verify**: Read file and confirm destructive operation warnings present

- [ ] 3. Create comprehensive security documentation
      **What**: Create docs/SECURITY.md documenting:
      - All security hardening implemented (auth, validation, rate limiting, headers)
      - Password migration procedure with step-by-step instructions
      - Git history cleanup procedure
      - Credential rotation checklist: GitHub PATs, Neon API key, OpenRouter API, Convex key, Xyrusrouter, Vercel PATs
      - Ongoing maintenance: NEXTAUTH_SECRET rotation every 90 days, dependency updates, security audit schedule
      **Files**: docs/SECURITY.md (new file)
      **Verify**: Read file and confirm all FEAT-001/002/003 features documented with migration steps

- [ ] 4. Update .env.example with security warning
      **What**: Add comment at top: "# SECURITY NOTE: Never commit .env to git. If already committed, run scripts/cleanup-git-history.sh and rotate all secrets."
      **Files**: .env.example
      **Verify**: Read file and confirm warning present

- [ ] 5. Update deployment documentation
      **What**: Update README.md or create DEPLOYMENT.md section with:
      - Reference to docs/SECURITY.md
      - Pre-deployment checklist: run migrate-passwords.ts, verify NEXTAUTH_SECRET set and unique, confirm .env not in git, test authentication and rate limiting
      **Files**: README.md or DEPLOYMENT.md
      **Verify**: Read file and confirm security checklist present

## Summary of New Files Created

- `src/lib/auth-utils.ts` - Session signing/verification and auth guards
- `src/lib/password-hash.ts` - Bcrypt password hashing
- `src/lib/validation/schemas.ts` - Zod request validation schemas
- `src/lib/rate-limit.ts` - In-memory sliding-window rate limiter
- `src/middleware.ts` - Next.js middleware for rate limiting and security headers
- `scripts/migrate-passwords.ts` - Password migration script (operator must run)
- `scripts/cleanup-git-history.sh` - Git history cleanup script (operator must run)
- `docs/SECURITY.md` - Comprehensive security documentation

## Modified Files

- `package.json` - Add bcryptjs dependency
- `src/app/api/auth/login/route.ts` - HMAC tokens, password verification, validation
- `src/app/api/auth/me/route.ts` - Use verifySession helper
- `src/app/api/claims/route.ts` - Auth guards, validation, error sanitization
- `src/app/api/claims/[id]/route.ts` - Auth guard, IDOR audit logging
- `src/app/api/claims/[id]/audit/route.ts` - Auth, validation, role check
- `src/app/api/stats/route.ts` - Auth guard, role check
- `src/app/api/audit/route.ts` - Auth guard, role check, validation
- `src/app/api/users/route.ts` - Auth guard, admin-only role check
- `prisma/schema.prisma` - Add migration comment
- `.env.example` - Security warning
- `README.md` or `DEPLOYMENT.md` - Pre-deployment checklist

## Verification Commands

After all steps complete:

1. **Build succeeds**: `npm run build` completes without errors
2. **Dev server starts**: `npm run dev` runs without TypeScript errors
3. **Auth works**: Login and confirm session cookie is HMAC-signed
4. **Endpoints protected**: Unauthenticated requests to /api/claims return 401
5. **Validation works**: Invalid request bodies return 400 with Zod errors
6. **Rate limiting works**: 6 rapid login attempts return 429 on 6th
7. **Headers present**: `curl -I http://localhost:3000/api/auth/me` shows CSP, X-Frame-Options
8. **No error leaks**: API errors never contain `detail: String(err)` or stack traces

## Post-Implementation Operator Tasks

**DO NOT RUN THESE YET - they are for the operator after code review:**

1. Run `npx ts-node scripts/migrate-passwords.ts --dry-run` to preview password hashing
2. Run `npx ts-node scripts/migrate-passwords.ts` to apply password hashing
3. Rotate all exposed credentials (GitHub PATs, Neon API, OpenRouter, Convex, Vercel)
4. Set NEXTAUTH_SECRET in .env to a strong random value: `openssl rand -base64 32`
5. Run `scripts/cleanup-git-history.sh` to purge .env from git (DESTRUCTIVE - backs up first)
6. Force-push cleaned history and notify team to re-clone
7. Verify .env is in .gitignore and never committed again
