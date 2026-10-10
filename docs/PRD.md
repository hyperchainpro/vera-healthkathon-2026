# 📋 Product Requirements Document (PRD) - VERA

**Tautan**: [[INDEX]] | [[ARCHITECTURE]] | [[DESIGN]] | [[SECURITY]]

---

## 🏥 Produk
**VERA** - Verifikasi Rawat Inap yang Efisien & Akuntabel (Healthkathon 2026).

## 🎯 Masalah yang Diselesaikan
Proses verifikasi berkas klaim rawat inap BPJS di rumah sakit seringkali lambat, rawan ketidaksesuaian koding INA-CBG, dan memerlukan pemeriksaan manual berulang antar dokter, koder, dan verifikator keuangan. VERA menyediakan sistem verifikasi berkas klaim otomatis berbasis AI untuk mendeteksi anomali, ketidaklengkapan resume medis, dan potensi penolakan (dispute) klaim secara instan.

## 👥 Target Pengguna
1. **Medical Officer / Verifikator Medis**: Melakukan telaah klinis terhadap diagnosis dan tindakan medis.
2. **Reviewer / Koder**: Memeriksa kecocokan kode ICD-10 dan ICD-9-CM.
3. **Supervisor**: Mengawasi tren verifikasi dan memberikan otorisasi akhir.
4. **Administrator**: Mengelola akun pengguna rumah sakit dan konfigurasi sistem.

## 🚀 Fitur Inti (Core Features)
1. **Sistem Autentikasi & RBAC**: Akses berbasis peran yang aman dengan session ber-HMAC.
2. **Dashboard Kasus Rawat Inap**: Ikhtisar total klaim, status verifikasi (Pending, Disetujui, Perlu Revisi, Ditolak), dan tingkat keparahan risiko.
3. **Telaah Berkas AI**: Ekstraksi resume medis dan identifikasi ketidaksesuaian diagnosis menggunakan model AI reasoning (OpenRouter / Xyrusrouter).
4. **Log Audit & Riwayat**: Pencatatan setiap aksi verifikator untuk akuntabilitas.
5. **Ekspor & Pelaporan**: Ringkasan data untuk kelengkapan administrasi BPJS.

## 🚫 Out of Scope (Untuk Rilis Ini)
- Integrasi billing pembayaran langsung (fokus pada validasi administratif & klinis klaim).
- Aplikasi native mobile (dioptimalkan melalui Progressive Web App & mobile responsive web).

## 🏆 Kriteria Keberhasilan (Success Criteria)
- Verifikator dapat melakukan login dengan aman tanpa risiko sesi dibajak.
- Berkas klaim dapat diperiksa oleh AI dalam hitungan detik dengan skor probabilitas validasi.
- Endpoint API terlindungi otorisasi dan kebal terhadap serangan brute force dan SQL injection.
