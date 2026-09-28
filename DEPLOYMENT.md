# VERA — Deployment Guide

> Panduan deploy VERA ke Vercel + Neon PostgreSQL untuk demo Healthkathon 2026.
> **Token tidak pernah di-share ke chat AI** — semua via terminal lokal Anda.

---

## 🚨 Pre-Deploy Checklist (WAJIB)

1. **Revoke semua token ter-expose** dari pesan chat sebelumnya:
   - Vercel: https://vercel.com/account/tokens → hapus semua 3 token
   - GitHub: https://github.com/settings/tokens → hapus semua 3 PAT
   - Neon: https://console.neon.tech/app/settings/api-keys → revoke
   - OpenRouter: https://openrouter.ai/keys → delete key
   - Xyrus Router: dashboard → revoke
   - Convex: https://dashboard.convex.dev → revoke deployment key

2. **Generate token baru** dengan:
   - Scope **minimum** (bukan `repo:*`, pakai `repo:vera-app` saja)
   - Expiration **7-30 hari** (JANGAN "no expire")
   - Simpan di **password manager** (1Password / Bitwarden), bukan file/note

3. **Jangan pernah paste token ke chat AI**. Pakai terminal lokal + browser login.

---

## 📦 Step 1: Push Code ke GitHub

```bash
cd /home/z/my-project

# Buat repo GitHub baru (via browser, login dengan akun Anda)
# https://github.com/new → nama: vera-healthkathon-2026 → Private → Create

# Set remote ke repo baru (ganti USERNAME)
git remote add origin https://github.com/USERNAME/vera-healthkathon-2026.git

# Push branch main
git push -u origin main
```

**Output expected**: semua source code VERA ter-push (Next.js + Prisma + scripts + lib).

---

## 🗄️ Step 2: Setup Neon PostgreSQL

1. **Buat project Neon baru** di https://console.neon.tech
   - Project name: `vera-prod`
   - Region: `Singapore` (terdekat dengan Indonesia)
   - Postgres version: `16` (latest stable)
   - Branch: `main` (production)

2. **Ambil connection string**:
   - Tab "Connection Details" → copy `postgresql://...` URL
   - Format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

3. **Buat branch testing** (optional, untuk development):
   ```bash
   neon branches create --project vera-prod --name develop --parent main
   ```

---

## ▲ Step 3: Deploy ke Vercel

```bash
cd /home/z/my-project

# Install Vercel CLI (sekali saja)
npm install -g vercel

# Login via browser (token tidak melewati chat)
vercel login
# → pilih "Continue with Email" atau "Continue with GitHub"
# → buka URL yang muncul di browser, login
# → kembali ke terminal: "Logged in successfully"

# Deploy ke staging (preview URL)
vercel
# → Project name: vera-healthkathon-2026
# → Framework preset: Next.js
# → Root directory: ./
# → Build command: next build
# → Output directory: .next
# → Settings: gunakan default

# Set environment variables di Vercel (via browser dashboard)
# https://vercel.com/USERNAME/vera-healthkathon-2026/settings/env
#
# Tambahkan:
#   DATABASE_URL = <Neon connection string dari Step 2>
#   OPENROUTER_API_KEY = <token OpenRouter baru>  # optional, kalau tidak ada → VERA pakai z-ai-sdk built-in
#   NEXT_PUBLIC_APP_NAME = "VERA"
#
# Untuk setiap var: pilih "Production", "Preview", "Development" (all environments)

# Push ke production
vercel --prod
```

**Output**: Vercel beri public URL seperti `https://vera-healthkathon-2026.vercel.app`.

---

## 🔧 Step 4: Setup Database Neon (Post-Deploy)

Vercel auto-deploy tidak otomatis migrate schema Neon. Lakukan manual:

```bash
# Install prisma globally
npm install -g prisma

# Set DATABASE_URL sementara untuk migrasi (di terminal, tidak di chat)
export DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Push schema ke Neon
cd /home/z/my-project
prisma db push

# Jalankan seed untuk 2.000 cases (Pneumonia + Stroke)
bun run scripts/seed/seed-all.ts
```

**Output expected**: 2.000 episodes di Neon Postgres, 600 HIGH Red Flag.

---

## 🧪 Step 5: Verify Deployment

Buka URL Vercel di browser:

1. **Dashboard load** → lihat hero metrics: "600 Red Flag, ~21.600h saved, Rp 0.9M saved, 2 diseases"
2. **Klik episode Red Flag** → lihat chart kurva Leukosit + Trombosit + Suhu
3. **Lihat verdict box** "VERA Red Flag — Bukti Anomali Prolonged Stay"
4. **Lihat EMR stripped** → "[NAME-REDAT] [NIK-REDACTED]"
5. **Filter Stroke** → lihat list Stroke cases dengan GCS rendah di H1

Kalau semua 5 cek berhasil → VERA siap demo untuk juri Healthkathon.

---

## 📊 Step 6: Update Proposal dengan URL Aktual

Setelah deploy berhasil, update slide 13 & 20 proposal PDF:

```bash
# Edit file HTML sumber
nano /home/z/my-project/scripts/vera_proposal.html

# Ganti placeholder di slide 13 (sekitar line 1261):
#   "Aplikasi web live di Vercel — bisa diakses juri."
# Menjadi:
#   "Aplikasi web live: https://vera-healthkathon-2026.vercel.app"

# Ganti placeholder di slide 20 (sekitar line 1737-1768):
#   "Anggota 01/02/03" → isi nama aktual anggota tim

# Re-render PDF
node /home/z/my-project/skills/pdf/scripts/html2pdf-next.js \
  /home/z/my-project/scripts/vera_proposal.html \
  --output /home/z/my-project/download/VERA_Proposal_Healthkathon2026.pdf \
  --width 1280px --height 720px --nopaged
```

---

## 🆘 Troubleshooting

**Error: "PrismaClient initialization failed"**
- Pastikan `DATABASE_URL` env var set di Vercel dashboard (Settings → Environment Variables)
- Restart deploy: `vercel --prod`

**Error: "Neon connection timeout"**
- Cek region Neon (Singapore recommended untuk Indonesia)
- Tambah `?sslmode=require&connection_limit=10` ke connection string

**Error: "OpenRouter 401 Unauthorized"**
- Token OpenRouter salah / sudah expired
- VERA auto-fallback ke z-ai-web-dev-sdk (built-in, no key needed) → demo tetap jalan

**Demo data kosong di production**
- Jalankan `bun run scripts/seed/seed-all.ts` dengan `DATABASE_URL` Neon
- Atau pakai tombol "Upload & Analyze" dengan data manual

---

## 📞 Kontak

Kalau ada masalah deploy, kontak Tim VERA. Jangan paste token ke chat AI — selalu via terminal lokal atau password manager.
