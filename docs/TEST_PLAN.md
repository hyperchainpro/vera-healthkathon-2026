# 🧪 Test Plan & Verification Checklist - VERA

**Tautan**: [[INDEX]] | [[ARCHITECTURE]] | [[SECURITY]]

---

## 🔍 Matriks Pengujian Fungsional

### 1. Autentikasi & Sesi
- [ ] Login dengan kredensial valid berhasil mengembalikan status 200 dan cookie `vera-session` ber-HMAC.
- [ ] Login dengan password keliru menghasilkan 401 tanpa membocorkan eksistensi user/email.
- [ ] Akses ke route `/api/claims` tanpa cookie mengembalikan 401 Unauthorized.
- [ ] Token yang kedaluwarsa (> 24 jam) ditolak otomatis.

### 2. Otorisasi (RBAC)
- [ ] User dengan role non-admin mengakses `/api/users` ditolak dengan status 403 Forbidden.
- [ ] Verifikator dapat melihat dan memperbarui status klaim yang ditugaskan.

### 3. Proteksi Rate Limiting
- [ ] Melakukan 6x percobaan login berturut-turut memicu respons 429 Too Many Requests dengan header `Retry-After`.
- [ ] Request API melebihi batas 100 req/menit ditahan sementara.

### 4. Validasi Input (Zod)
- [ ] Payload dengan email tidak valid atau format salah dikembalikan dengan status 400 Bad Request.
- [ ] Upaya injeksi string berbahaya pada field klaim dinetralisir oleh schema sanitizer.

### 5. Kompilasi & Build
- [ ] `npm run build` menyelesaikan static trace dan webpack bundling dengan exit code 0.
- [ ] Seluruh endpoint API terdaftar dan teridentifikasi sebagai dynamic route handler.
