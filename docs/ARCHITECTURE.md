# 🏗️ System Architecture - VERA

**Tautan**: [[INDEX]] | [[PRD]] | [[SECURITY]] | [[DECISIONS]]

---

## 📐 Arsitektur Tingkat Tinggi (High Level Architecture)

```
Pengguna (Browser Desktop / Mobile)
            │  (HTTPS, TLS 1.3, CSP, HSTS)
            ▼
    [Vercel Edge Network / CDN]
            │
            ├─► Middleware (Sliding Window Rate Limiter & Security Headers)
            ▼
   [Next.js 16 App Router (Node.js Serverless)]
   ├─► Server Components & Client Views (React 19, Tailwind v4, Lucide)
   ├─► API Handlers (RESTful, Zod Validation, RBAC Guards)
   └─► Auth Layer (HMAC-SHA256 Signed Sessions & Bcrypt Hashing)
            │
            ├───────────────────────────────┐
            ▼                               ▼
 [Neon PostgreSQL Database]        [AI Inference Gateway]
 (Prisma ORM, Connection Pooler)  (OpenRouter / Xyrusrouter)
```

## 💻 Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, Sonner Toast, Radix UI.
- **Backend & API**: Next.js Route Handlers, Zod Validation, Node.js Crypto.
- **Database & ORM**: PostgreSQL (Neon Tech Serverless AWS AP-Southeast-1) + Prisma ORM 6.19.
- **AI Engine**: OpenRouter / Xyrusrouter API (Medical claim verification prompt analysis).
- **Hosting & Infrastructure**: Vercel Serverless Platform.

## 🗄️ Database Design & Schema
Entitas utama dalam `prisma/schema.prisma`:
- `User`: Akun pengguna dengan field `id`, `name`, `email`, `password` (bcrypt hash), `role` (ADMIN, SUPERVISOR, REVIEWER, MEDICAL_OFFICER), `isActive`.
- `Claim`: Data klaim rawat inap dengan atribut nomor berkas, pasien, diagnosa, kode INA-CBG, status, severity, dan total tagihan.
- `AuditLog`: Rekam jejak audit untuk setiap tindakan verifikasi.

## 🛡️ Prinsip Desain Sistem (System Design Handbook Alignment)
1. **API Design (Topic 03)**: RESTful conventions, validasi schema, idempotensi, dan format respon seragam `{ success, data, error }`.
2. **Database Indexing (Topic 08)**: Indexing pada kolom query penting `status`, `severity`, `createdAt` untuk pencarian cepat.
3. **Caching (Topic 06)**: Static asset caching di Edge CDN Vercel dan SWR pada data fetch frontend.
4. **Rate Limiting (Topic 14)**: Sliding window limiter pada rute sensitif.
5. **Observability (Topic 19)**: Endpoint `/api/health` untuk memonitor uptime, koneksi database, dan waktu respon.
