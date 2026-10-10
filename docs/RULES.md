# 📜 Development Rules & AI Rulebook - VERA

**Tautan**: [[INDEX]] | [[ARCHITECTURE]] | [[SECURITY]]

---

## 🛠️ Aturan Pengembangan Kode
1. **TypeScript Ketat**: Selalu definisikan tipe secara eksplisit; jangan gunakan `any` secara sembarangan.
2. **Keamanan Utama (Security-First)**:
   - Jangan pernah melakukan *commit* API key atau token rahasia ke dalam repositori.
   - Semua input wajib divalidasi dengan Zod schema sebelum diproses.
   - Semua operasi database wajib menggunakan ORM Prisma guna mencegah injeksi SQL.
3. **Pemisahan Tanggung Jawab (Separation of Concerns)**:
   - Komponen UI tidak boleh memuat query database secara langsung.
   - Logika bisnis ditempatkan pada service/helper yang teruji (`src/lib/`).
4. **Penanganan Error Bersih**:
   - Jangan pernah mengembalikan `detail: String(err)` atau stack trace internal kepada klien.
   - Laporkan error internal hanya pada server log yang telah disanitasi.
5. **Standar Komitmen Git**:
   - Terapkan Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
