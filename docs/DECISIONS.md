# 🏛️ Architecture Decision Records (ADR)

**Tautan**: [[INDEX]] | [[ARCHITECTURE]] | [[SECURITY]]

---

## ADR-001: Penggunaan Next.js 16 App Router dengan Webpack Build Engine
- **Tanggal**: 2026-10-09
- **Status**: Disetujui (Accepted)
- **Konteks**: Turbopack pada Next.js 16.4.0 mengalami kendala internal `Cannot read properties of undefined (reading 'project')` saat melakukan static trace.
- **Keputusan**: Menggunakan opsi build `--webpack` secara konsisten untuk menjamin keberhasilan proses kompilasi tanpa bug baik di lingkungan lokal maupun build server Vercel.
- **Konsekuensi**: Build lebih stabil, kompatibilitas 100% dengan ekosistem plugin dan modul Node.js.

---

## ADR-002: Arsitektur Keamanan Autentikasi (HMAC-SHA256 Signed Sessions & Bcrypt Cost 12)
- **Tanggal**: 2026-10-09
- **Status**: Disetujui (Accepted)
- **Konteks**: Session berbasis token plain rentan terhadap manipulasi ID (tampering) dan pencurian identitas. Password plaintext membahayakan database jika terjadi kebocoran.
- **Keputusan**: 
  1. Hashing password menggunakan `bcryptjs` dengan salt round / cost factor 12.
  2. Session token menggunakan format payload bertanda tangan digital HMAC-SHA256 (`payloadB64.signature`) dengan perbandingan *timing-safe* (`crypto.timingSafeEqual`) dan masa berlaku 24 jam.
- **Konsekuensi**: Mencegah serangan timing attack, token forgery, dan credential harvesting.

---

## ADR-003: Database Neon PostgreSQL dengan Connection Pooling
- **Tanggal**: 2026-10-09
- **Status**: Disetujui (Accepted)
- **Konteks**: Aplikasi di-deploy di Vercel Serverless yang dapat menghasilkan lonjakan koneksi singkat (*connection spike*).
- **Keputusan**: Menggunakan Neon PostgreSQL dengan connection pooler di AWS AP-Southeast-1 (`DATABASE_URL`) untuk query aplikasi dan direct connection (`DIRECT_URL`) untuk Prisma migrations.
- **Konsekuensi**: Menjaga stabilitas koneksi database pada beban tinggi dan mencegah kehabisan connection pool.

---

## ADR-004: In-Memory Sliding Window Rate Limiting & Edge Headers
- **Tanggal**: 2026-10-09
- **Status**: Disetujui (Accepted)
- **Konteks**: Risiko brute-force login dan DDoS API.
- **Keputusan**: Menerapkan rate limiting tingkat middleware dengan batas 5 percobaan per 15 menit untuk endpoint `/api/auth/login` dan 100 req/menit untuk API umum.
- **Konsekuensi**: Perlindungan instan tanpa dependensi eksternal wajib, siap di-upgrade ke Redis (Upstash) jika skala multi-region dibutuhkan.
