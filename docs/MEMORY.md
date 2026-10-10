# 🧠 Project Memory (State of VERA)

**Terakhir Diperbarui**: 2026-10-09 21:30:00+07:00  
**Tautan**: [[INDEX]] | [[TASKS]] | [[DECISIONS]] | [[SECURITY]]

---

## 📌 Status Terkini Proyek
- Aplikasi dalam tahap transisi dari prototipe lokal ke **Live Production Ready**.
- Telah teridentifikasi bahwa Next.js 16.4 Turbopack memiliki bug build internal (`Cannot read properties of undefined reading 'project'`), yang berhasil diselesaikan dengan flag `--webpack`.
- Modul keamanan kritis awal telah dibuat (`src/lib/password-hash.ts` dan `src/lib/auth-utils.ts`).
- Server database terhubung ke Neon PostgreSQL Cloud di wilayah Singapura (ap-southeast-1).

---

## 🎯 Task yang Sedang Dijalankan (Active Focus)
1. Menuntaskan instalasi & integrasi 12 AI Agent Skills di `.agents/skills/`.
2. Melengkapi validasi input Zod di semua endpoint API untuk memblokir malicious payloads.
3. Memasang middleware proteksi: Rate limiting & Security Headers.
4. Menjalankan pengetesan build akhir sebelum persiapan deployment ke Vercel.

---

## ⚠️ Isu & Mitigasi (Known Issues & Mitigations)
1. **Issue**: Kredensial `.env` sempat ada dalam git history lokal.  
   **Mitigasi**: Pastikan `.env` ter-ignore, gunakan Vercel Environment Variables untuk deployment produksi, dan ganti secret sensitif.
2. **Issue**: API endpoint belum semua terlindungi guard RBAC.  
   **Mitigasi**: Terapkan fungsi `requireAuth(req)` dan `requireRole(user, allowedRoles)` di setiap handler API.
3. **Issue**: Database password di DB demo masih ada yang plaintext.  
   **Mitigasi**: Sediakan skrip migrasi password bcrypt.
