# 📋 VERA Project Tasks Tracker

**Acuan**: [[INDEX]] | [[MEMORY]] | [[AUDIT_60_POINTS]]  
**Status**: 🔄 IN PROGRESS - PRODUCTION READINESS

---

## 🎯 Ringkasan Status Task

- **Total Task Utama**: 7 Fase (25 Sub-Task)
- **Selesai (Completed)**: 7
- **Sedang Berjalan (In Progress)**: 3
- **Menunggu (Pending)**: 15

---

## 🟢 FASE 1: Obsidian Framework & Session Memory
- [x] **TASK-101**: Baca & petakan seluruh dokumen acuan (`Vibe Coding`, `Security Prompt`, `System Design`, `12 AI Skills`).
- [x] **TASK-102**: Inisialisasi Obsidian Vault config (`.obsidian/app.json`, `.obsidian/core-plugins.json`).
- [x] **TASK-103**: Pembuatan dokumen inti `[[INDEX]]`, `[[PRD]]`, `[[ARCHITECTURE]]`, `[[DESIGN]]`, `[[RULES]]`, `[[DECISIONS]]`.
- [x] **TASK-104**: Setup pencatatan sesi dinamis di `[[SESSIONS/Session-2026-10-09]]` dan `[[MEMORY]]`.

---

## 🚀 FASE 2: Integrasi 12 AI Agent Skills
*Berdasarkan daftar tangkapan layar Threads:*
- [x] **TASK-201**: Pembuatan direktori `.agents/skills/` dan mapping 12 repositori startup founder.
- [ ] **TASK-202**: Instalasi dan integrasi prompt/rules 12 agent:
  - [x] `garrytan/gstack` - Startup founder OS & architecture principles
  - [x] `obra/superpowers` - Autonomous execution & self-debugging
  - [x] `Leonxlnx/taste-skill` - Design taste, typography & spacing
  - [x] `nextlevelbuilder/ui-ux-pro-max-skill` - Enterprise UI component patterns
  - [x] `coreyhaines31/marketingskills` - Copywriting & high-converting CTA
  - [x] `mvanhorn/last30days-skill` - Modern tech stack practices
  - [x] `zarazhangrui/frontend-slides` - Presentation & summary cards
  - [x] `petergyang/no-ai-slop` - Humanized clean UI copy
  - [x] `latent-spaces/brag` - Production audit changelog
  - [x] `anthropics/claude-for-legal` - Medical & legal data compliance
  - [x] `JuliusBrussee/caveman` - Ultra-compact, fast reasoning logic
  - [x] `ComposioHQ/awesome-claude-skills` - Multi-tool agent workflows
- [ ] **TASK-203**: Pengujian skill rules pada alur pengembangan VERA.

---

## 🛡️ FASE 3: Backend & Security Hardening (Audit 60 Poin)
- [x] **TASK-301**: Hashing password kuat dengan bcrypt (cost 12) di `src/lib/password-hash.ts`.
- [x] **TASK-302**: Signed session token dengan HMAC-SHA256 & 24h expiry di `src/lib/auth-utils.ts`.
- [ ] **TASK-303**: Pembuatan skema validasi Zod di `src/lib/validation/schemas.ts` untuk memvalidasi seluruh input request API.
- [ ] **TASK-304**: Proteksi server-side RBAC guard pada seluruh endpoint (`/api/claims`, `/api/claims/[id]`, `/api/stats`, `/api/audit`, `/api/users`).
- [ ] **TASK-305**: Eliminasi kebocoran error `detail: String(err)` di semua route handler agar tidak membocorkan stack trace.
- [ ] **TASK-306**: Script migrasi password plaintext database ke hash bcrypt (`scripts/migrate-passwords.ts`).

---

## ⚙️ FASE 4: System Design & Reliability
- [ ] **TASK-401**: Implementasi In-Memory Sliding Window Rate Limiter di `src/lib/rate-limit.ts`.
- [ ] **TASK-402**: Middleware Next.js `src/middleware.ts` untuk Security Headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- [ ] **TASK-403**: Health check endpoint `/api/health` dengan observabilitas koneksi database & response time.
- [ ] **TASK-404**: Penambahan indexing performa pada schema Prisma (`status`, `severity`, `createdAt`).

---

## 🎨 FASE 5: Website Quality, UX, SEO & Accessibility
- [ ] **TASK-501**: Halaman Custom 404 (`src/app/not-found.tsx`) dan error boundary (`src/app/error.tsx`).
- [ ] **TASK-502**: Konfigurasi SEO: `robots.ts`, `sitemap.ts`, OpenGraph metadata.
- [ ] **TASK-503**: Tombol kontak/support WhatsApp dan toast notification feedback.
- [ ] **TASK-504**: Uji responsivitas mobile & tablet (375px, 768px, 1440px).

---

## 🔨 FASE 6: Build Stabilization & Zero Bug Verification
- [x] **TASK-601**: Verifikasi build berhasil via webpack (`npm run build`).
- [ ] **TASK-602**: Integrasi permanen konfigurasi build webpack di `package.json` dan `next.config.ts`.
- [ ] **TASK-603**: Verifikasi TypeScript type checking bersih tanpa error.

---

## 🌐 FASE 7: Live Production Deployment
- [ ] **TASK-701**: Sinkronisasi database Neon PostgreSQL live schema.
- [ ] **TASK-702**: Konfigurasi Environment Variables di Vercel menggunakan Vercel PAT Token.
- [ ] **TASK-703**: Deploy ke Vercel Production dan verifikasi status domain live.
