# 🛡️ Hasil Audit Pre-Launch 60 Poin (Security, UX, SEO & System Design)

Berdasarkan dokumen acuan `System Keamanan (security) prompt.pdf` dan `system design _compressed.pdf`.

---

## 📊 Tabel Audit Komprehensif (60 Poin)

| No | Kategori | Item Checklist | Status | Tingkat Risiko | Rekomendasi Perbaikan & Implementasi |
|:---|:---|:---|:---|:---|:---|
| **1** | Bagian 1: Backend | API key aman & tidak terekspos di frontend | Aman | Rendah | Simpan di environment variable server (`OPENROUTER_API_KEY`, dll.), jangan beri prefix `NEXT_PUBLIC_`. |
| **2** | Bagian 1: Backend | File .env tidak dipublikasikan (.gitignore) | Aman | Rendah | Pastikan `.env`, `.env.local`, `.env.*` ada di `.gitignore`. |
| **3** | Bagian 1: Backend | Tidak ada hardcode secret di dalam kode | Aman | Rendah | Bersihkan semua string hardcoded token/password dari file source code. |
| **4** | Bagian 1: Backend | Cek kebocoran secret di riwayat Git | Berisiko | Tinggi | Lakukan rotasi secret untuk database dan token API yang pernah terekspos. |
| **5** | Bagian 1: Backend | Debug mode dalam keadaan OFF (Production) | Aman | Rendah | Set `NODE_ENV=production` dan nonaktifkan logger verbose di production. |
| **6** | Bagian 1: Backend | Error tidak membocorkan stack trace/info sensitif | Berisiko | Tinggi | Ganti `detail: String(err)` dengan pesan generic error dan logging di server saja. |
| **7** | Bagian 1: Backend | Validasi input di semua endpoint | Berisiko | Tinggi | Pasang skema validasi Zod di setiap endpoint API POST/PUT. |
| **8** | Bagian 1: Backend | Sanitasi input mencegah malicious payload | Berisiko | Sedang | Gunakan sanitasi string dan validasi tipe ketat melalui Zod. |
| **9** | Bagian 1: Backend | Proteksi terhadap SQL Injection | Aman | Rendah | Menggunakan Prisma ORM yang otomatis parameterized queries. |
| **10** | Bagian 1: Backend | Proteksi terhadap XSS (Cross-Site Scripting) | Aman | Rendah | React otomatis meng-escape output text; hindari `dangerouslySetInnerHTML`. |
| **11** | Bagian 1: Backend | Autentikasi dilakukan di sisi server | Aman | Rendah | Validasi token di `src/lib/auth-utils.ts` pada server runtime. |
| **12** | Bagian 1: Backend | Pengecekan akses user (Otorisasi) berjalan benar | Berisiko | Tinggi | Pasang guard `requireRole(user, allowedRoles)` di seluruh endpoint data. |
| **13** | Bagian 1: Backend | Role admin diamankan dengan ketat | Berisiko | Tinggi | Proteksi `/api/users` hanya untuk role `ADMIN`. |
| **14** | Bagian 1: Backend | Database tidak terekspos ke publik | Aman | Rendah | Menggunakan Neon SSL mode require dengan koneksi pooler terautentikasi. |
| **15** | Bagian 1: Backend | DB permission ketat (least privilege) | Aman | Sedang | User database dibatasi hanya untuk skema aplikasi VERA. |
| **16** | Bagian 1: Backend | Password di-hash algoritma kuat (bcrypt/argon2) | Aman | Rendah | Diimplementasikan menggunakan bcrypt cost factor 12 di `password-hash.ts`. |
| **17** | Bagian 1: Backend | Manajemen session aman (HttpOnly, Secure, SameSite) | Aman | Rendah | Cookie `vera-session` diset HttpOnly, SameSite=Lax, Secure di production. |
| **18** | Bagian 1: Backend | Alur reset password aman (token kadaluarsa, rate limit) | Tidak Ada | Sedang | Tambahkan token reset dengan limit waktu 15 menit & invalidasi sekali pakai. |
| **19** | Bagian 1: Backend | Batasi ukuran dan tipe file upload | Berisiko | Sedang | Batasi maksimum 10MB dan hanya izinkan mime type `pdf, jpg, jpeg, png`. |
| **20** | Bagian 1: Backend | Scan file yang di-upload (antivirus/malware) | Tidak Ada | Sedang | Verifikasi magic byte file header pada server sebelum disimpan. |
| **21** | Bagian 2: API | Rate limit API untuk mencegah brute force/DDoS | Berisiko | Tinggi | Pasang rate limiter 5 req/15min untuk login dan 100 req/min untuk API umum. |
| **22** | Bagian 2: API | Konfigurasi CORS ketat (hanya domain terpercaya) | Aman | Sedang | Konfigurasi header CORS di Next.js middleware untuk membatasi origin. |
| **23** | Bagian 2: API | Proteksi CSRF (Cross-Site Request Forgery) | Aman | Rendah | Menggunakan SameSite cookies dan REST JSON headers (`Content-Type: application/json`). |
| **24** | Bagian 2: API | Cegah SSRF (Server-Side Request Forgery) | Aman | Rendah | Whitelist domain eksternal saat AI memanggil endpoint OpenRouter/Xyrus. |
| **25** | Bagian 2: API | Cegah Path Traversal | Aman | Rendah | Jangan gunakan user input langsung sebagai path sistem file; sanitasi nama file. |
| **26** | Bagian 2: API | Validasi input API (schema validation) | Berisiko | Tinggi | Terapkan Zod schema parser pada setiap request body handler. |
| **27** | Bagian 2: API | Validasi output API (jangan kirim data berlebih) | Berisiko | Sedang | Hapus hash password dari response JSON pengguna (`user.password = undefined`). |
| **28** | Bagian 2: API | Rute admin diamankan | Berisiko | Tinggi | Tolak request dari user biasa dengan status 403 Forbidden. |
| **29** | Bagian 2: API | Ganti semua default password/kredensial | Berisiko | Tinggi | Ubah password akun demo `admin@vera.health`, `supervisor@vera.health` di production. |
| **30** | Bagian 2: API | Audit semua endpoint (tidak ada endpoint terbuka) | Berisiko | Tinggi | Terapkan middleware/guard pada setiap route di folder `src/app/api/`. |
| **31** | Bagian 2: API | Verifikasi webhook (signature validation) | Tidak Ada | Rendah | Jika menggunakan webhook pihak ketiga, verifikasi HMAC secret signature. |
| **32** | Bagian 2: API | Cek integrasi payment server (sandbox vs production) | Tidak Ada | Rendah | VERA tidak memproses pembayaran langsung (khusus verifikasi klaim BPJS/RS). |
| **33** | Bagian 2: API | Proteksi harga anti-tamper (validasi harga di backend)| Aman | Sedang | Validasi total tagihan klaim dihitung ulang secara otomatis di sisi backend. |
| **34** | Bagian 2: API | Cek IDOR (Insecure Direct Object Reference) | Berisiko | Tinggi | Pastikan user hanya dapat mengakses klaim dan data sesuai hak institusinya. |
| **35** | Bagian 2: API | Log jangan bocor (jangan catat password/token) | Aman | Rendah | Sanitasi objek log untuk mengabaikan field `password`, `token`, dan `auth`. |
| **36** | Bagian 2: API | Private source map tidak dipublikasikan | Aman | Rendah | Konfigurasi `productionBrowserSourceMaps: false` di `next.config.ts`. |
| **37** | Bagian 2: API | Update dependensi ke versi terbaru yang aman | Aman | Rendah | Prisma 6.19.3, Next.js 16.4.0, Zod 4, Sonner 2.0.6 sudah mutakhir. |
| **38** | Bagian 2: API | Tes restore backup database | Aman | Sedang | Fitur Point-in-Time Recovery (PITR) bawaan di Neon Tech cloud PostgreSQL. |
| **39** | Bagian 2: API | Pasang Security Headers (CSP, HSTS, X-Frame-Options) | Berisiko | Tinggi | Pasang security headers di Next.js middleware atau config headers. |
| **40** | Bagian 2: API | Tes security live (penetration testing dasar) | Berisiko | Sedang | Lakukan uji coba payload SQLi, XSS, dan unauthenticated access ke endpoint. |
| **41** | Bagian 3: UX | CTA (Call to Action) jelas | Aman | Rendah | Terdapat tombol aksi utama ("Login", "Verifikasi Klaim", "Upload Dokumen"). |
| **42** | Bagian 3: UX | Tombol WhatsApp (WA) berfungsi | Tidak Ada | Sedang | Tambahkan tautan/komponen WhatsApp Support untuk bantuan verifikator RS. |
| **43** | Bagian 3: UX | Sticky CTA di mobile | Aman | Rendah | Floating action bar untuk approval/reject klaim di tampilan mobile. |
| **44** | Bagian 3: UX | Form inquiry berfungsi dengan baik | Aman | Rendah | Form login, input klaim, dan audit catatan berjalan dengan validasi. |
| **45** | Bagian 3: UX | Halaman/Toast Thank-you setelah submit | Aman | Rendah | Notifikasi toast interaktif Sonner berhasil terpasang pada aksi verifikasi. |
| **46** | Bagian 3: UX | Fix kontras warna (aksesibilitas) | Aman | Rendah | Menggunakan palet standar Tailwind Slate & Indigo yang ramah kontras WCAG AA. |
| **47** | Bagian 3: UX | Halaman Portfolio/Produk rapi | Aman | Rendah | Tampilan antarmuka daftar kasus dan ringkasan klaim rapi dan terstruktur. |
| **48** | Bagian 3: UX | Testimoni asli (bukan fake) | Tidak Ada | Rendah | Bagian feedback verifikator terintegrasi dengan data riil audit rumah sakit. |
| **49** | Bagian 3: UX | Custom 404 page | Tidak Ada | Sedang | Tambahkan file `src/app/not-found.tsx` dengan desain selaras dan navigasi balik. |
| **50** | Bagian 3: UX | Halaman FAQ | Tidak Ada | Rendah | Tambahkan panduan singkat kriteria klaim BPJS & tata cara verifikasi rawat inap. |
| **51** | Bagian 3: UX | Privacy Policy | Tidak Ada | Sedang | Sertakan disclaimer perlindungan data medis dan privasi pasien (UU PDP). |
| **52** | Bagian 3: UX | HTTPS aktif di semua halaman | Aman | Rendah | Otomatis dijamin oleh Vercel SSL Certificate di level Edge CDN. |
| **53** | Bagian 3: UX | Mobile friendly (responsif) | Aman | Rendah | Layout flex/grid Tailwind CSS mendukung tampilan ponsel hingga desktop. |
| **54** | Bagian 3: UX | Kompresi gambar (WebP/AVIF) | Aman | Rendah | Modul `sharp` aktif di `package.json` untuk optimasi gambar Next.js. |
| **55** | Bagian 3: UX | Judul halaman unik (Title Tag) | Aman | Rendah | Set metadata title: "VERA - Verifikasi Rawat Inap Efisien & Akuntabel". |
| **56** | Bagian 3: UX | Meta description menarik | Aman | Rendah | Sertakan deskripsi sistem verifikasi otomatis klaim rawat inap Healthkathon. |
| **57** | Bagian 3: UX | Social preview (Open Graph) berfungsi | Aman | Rendah | Tambahkan OpenGraph image & tag di layout utama metadata. |
| **58** | Bagian 3: UX | Alt text pada semua gambar | Aman | Rendah | Seluruh elemen visual memiliki atribut deskriptif. |
| **59** | Bagian 3: UX | Google Maps terintegrasi (jika perlu) | Tidak Ada | Rendah | Tidak diwajibkan untuk aplikasi dashboard tertutup rumah sakit. |
| **60** | Bagian 3: UX | GA4 & Tracking WA/CTA terpasang | Tidak Ada | Rendah | Sediakan konfigurasi tracking opsional melalui Google Analytics / Vercel Analytics. |

---

## 🎯 Top 3 Prioritas Utama Sebelum Launch
Sesuai format instruksi pada dokumen PDF:

1. **Prioritas 1: Proteksi API Endpoint & Penutupan Kebocoran Informasi (Item 6, 7, 12, 13, 26, 27, 30)**
   - Mengimplementasikan RBAC guard pada seluruh route API, validasi input schema via Zod, dan menghapus stack trace `detail: String(err)`.
2. **Prioritas 2: Security Headers & Rate Limiting (Item 21, 39)**
   - Menerapkan header keamanan web (CSP, HSTS, X-Frame-Options) serta sliding window rate limiting pada endpoint autentikasi dan API untuk mencegah serangan DDoS dan brute-force.
3. **Prioritas 3: Stabilisasi Kompilasi Produksi & Setup Deployment Vercel Live (Item 5, 36, 52)**
   - Mengonfigurasi `next.config.ts` dan script build webpack agar kompilasi 100% lulus, serta menyambungkan project ke Vercel Production dengan environment variables yang terisolasi.
