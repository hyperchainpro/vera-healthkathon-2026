# VERA Deployment Guide
## Healthkathon 2026 - Production Deployment Checklist

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Security Audit ✅
- [x] All API endpoints protected with authentication
- [x] Role-based access control (RBAC) implemented
- [x] Input validation with Zod on all endpoints
- [x] Rate limiting active (5 req/15min login, 100 req/min API)
- [x] Security headers configured (CSP, HSTS, X-Frame-Options)
- [x] HMAC-signed session tokens
- [x] Bcrypt password hashing (cost 12)
- [x] Error handling doesn't leak sensitive data

### 2. Git History Cleanup 🚨 CRITICAL
```bash
# 1. Backup repository first
git clone --mirror https://github.com/your-org/vera.git vera-backup.git

# 2. Remove .env from history
bash scripts/cleanup-git-history.sh

# 3. Verify .env removed
git log --all --full-history -- .env
# Should return no results

# 4. Force push (DESTRUCTIVE - notifies team first)
git push origin --force --all
git push origin --force --tags
```

### 3. Credential Rotation 🔐 CRITICAL

#### 3.1 Database (Neon)
```bash
# In Neon Console:
# 1. Go to Project Settings > Reset Password
# 2. Copy new DATABASE_URL and DIRECT_URL
# 3. Update in Vercel Environment Variables
```

#### 3.2 OpenRouter API
```bash
# In OpenRouter Dashboard:
# 1. Revoke old key: sk-or-v1-d51aed0ea96256...
# 2. Generate new key
# 3. Update OPENROUTER_API_KEY in Vercel
```

#### 3.3 Authentication Secret
```bash
# Generate new NEXTAUTH_SECRET
openssl rand -base64 32

# Update in Vercel Environment Variables
```

#### 3.4 GitHub & Vercel PATs
- Rotate GitHub Personal Access Tokens
- Rotate Vercel Personal Access Tokens
- Update in CI/CD pipelines

### 4. Password Migration 🔑
```bash
# Preview migration (dry run)
npx ts-node scripts/migrate-passwords.ts --dry-run

# Apply migration (converts plain-text to bcrypt)
npx ts-node scripts/migrate-passwords.ts
```

### 5. Environment Variables Setup

#### Vercel Production Environment
```bash
# Set all required environment variables
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add OPENROUTER_API_KEY production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production  # https://vera.yourdomain.com
```

**Required Variables:**
- `DATABASE_URL` - Neon PostgreSQL connection (pooled)
- `DIRECT_URL` - Neon direct connection (migrations)
- `OPENROUTER_API_KEY` - LLM extraction service
- `NEXTAUTH_SECRET` - Session signing secret (min 32 chars)
- `NEXTAUTH_URL` - Production URL with https://
- `NODE_ENV=production`

### 6. Database Migration
```bash
# Run Prisma migrations on production database
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 7. Dependency Audit
```bash
# Check for vulnerabilities
npm audit

# Fix high/critical vulnerabilities
npm audit fix

# Update outdated packages
npm outdated
npm update
```

### 8. Build Verification
```bash
# Test production build locally
npm run build

# Should complete without errors
# Check for:
# - No TypeScript errors
# - No missing imports
# - No build warnings
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy to Vercel
```bash
# Login to Vercel CLI
vercel login

# Deploy to production
vercel --prod

# Verify deployment
vercel inspect <deployment-url>
```

### Step 2: Post-Deployment Verification

#### 2.1 Health Check
```bash
# Test health endpoint
curl https://vera.yourdomain.com/api/health

# Expected: {"status": "ok", "timestamp": "..."}
```

#### 2.2 Authentication Test
```bash
# Test login
curl -X POST https://vera.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'

# Should return 401 for invalid credentials (not error leak)
```

#### 2.3 Security Headers Check
```bash
# Verify security headers
curl -I https://vera.yourdomain.com

# Should see:
# - Content-Security-Policy
# - Strict-Transport-Security
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Referrer-Policy
```

#### 2.4 Rate Limiting Test
```bash
# Test rate limiting (6 rapid login attempts)
for i in {1..6}; do
  curl -X POST https://vera.yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"test"}' \
    -w "\n%{http_code}\n"
done

# 6th request should return 429 (Too Many Requests)
```

#### 2.5 HTTPS Enforcement
```bash
# Verify HTTP redirects to HTTPS
curl -I http://vera.yourdomain.com

# Should see: 301 Moved Permanently or 308 Permanent Redirect
```

---

## 🔍 MONITORING & MAINTENANCE

### 1. Set Up Monitoring
- **Vercel Analytics**: Track performance metrics
- **Error Tracking**: Sentry or similar (optional)
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Log Aggregation**: Vercel Logs or Datadog

### 2. Security Monitoring
- Monitor failed login attempts (audit logs)
- Track rate limit violations
- Watch for unusual API activity
- Review user permissions quarterly

### 3. Regular Maintenance Schedule

#### Weekly
- Check error logs for anomalies
- Review audit trail for suspicious activity

#### Monthly
- Run `npm audit` and fix vulnerabilities
- Review and update dependencies
- Check database backup status

#### Quarterly
- Rotate NEXTAUTH_SECRET
- Review and revoke unused API keys
- Conduct security audit
- Update documentation

---

## 🚨 INCIDENT RESPONSE

### If Credentials Are Compromised:

1. **IMMEDIATE**: Rotate affected credentials
   ```bash
   # Database
   - Reset password in Neon Console
   - Update DATABASE_URL in Vercel
   - Redeploy: vercel --prod
   
   # API Keys
   - Revoke old key in provider dashboard
   - Generate new key
   - Update environment variable
   - Redeploy
   ```

2. **Check Logs**: Review audit trail for unauthorized access
   ```sql
   SELECT * FROM "AuditLog"
   WHERE "createdAt" > NOW() - INTERVAL '24 hours'
   ORDER BY "createdAt" DESC;
   ```

3. **Notify**: If user data affected, follow disclosure protocol

4. **Document**: Record incident, response, and prevention measures

5. **Prevent**: Update security measures to prevent recurrence

---

## 📞 SUPPORT CONTACTS

- **Technical Lead**: [Your Name]
- **Security Issues**: security@yourdomain.com
- **Emergency Hotline**: [Emergency Contact]

---

## 📚 ADDITIONAL RESOURCES

- [Security Guidelines](docs/SECURITY.md)
- [Pre-Launch Audit](docs/PRE_LAUNCH_AUDIT.md)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)

---

## ✅ DEPLOYMENT VERIFICATION CHECKLIST

After deployment, verify all items:

### Security
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present (check with curl -I)
- [ ] Rate limiting active (test with rapid requests)
- [ ] Authentication required on protected routes
- [ ] Authorization enforced (roles checked)
- [ ] No error detail leakage (test with invalid input)
- [ ] Session cookies are HttpOnly, Secure, SameSite

### Functionality
- [ ] Login/logout works
- [ ] Dashboard loads with correct data
- [ ] Claim upload and analysis works
- [ ] Detail view shows episode data
- [ ] Audit logging captures actions
- [ ] User management (admin only)
- [ ] Stats page displays metrics

### Performance
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms (p95)
- [ ] No console errors in browser
- [ ] Build size reasonable (check Vercel dashboard)

### Database
- [ ] All migrations applied
- [ ] Seed data present (if needed)
- [ ] Backups configured (Neon automatic)
- [ ] Connection pooling working

---

**Version**: 1.0.0  
**Last Updated**: 9 Oktober 2026  
**Status**: 🟢 READY FOR PRODUCTION
