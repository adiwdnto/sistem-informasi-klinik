# Sistem Informasi Klinik

Aplikasi MVP klinik dengan frontend React, Vite, dan Tailwind; API Node.js/Express; serta MySQL. Antarmuka dan seluruh teks yang ditampilkan kepada pengguna menggunakan bahasa Indonesia. Folder frontend dan backend dijalankan dari terminal yang terpisah.

## Fitur utama

- **Pasien:** membuat akun, booking dokter, melihat jadwal, status kunjungan, dan tagihan.
- **Resepsionis:** membuat booking untuk pasien, melihat antrean, menerima atau membatalkan booking, dan memantau kunjungan.
- **Perawat:** mencatat keluhan utama, tensi, suhu, dan berat badan sebelum dokter memeriksa.
- **Dokter:** mengisi diagnosis dan tindakan, membuat resep, serta memeriksa persediaan obat.
- **Kasir:** melihat rincian tagihan, menerima pembayaran tunai/transfer/QRIS/kartu, dan mencetak bukti pembayaran.
- **Akses:** login dan pembatasan akses dasar menurut peran.

## Penilaian dan persiapan database

Dump `db_klinik_dr_umum.sql` sudah memuat data dasar pasien, dokter, obat, resep, rekam medis, serta beberapa view. Skema awal belum menyediakan akun/role, booking, status alur kunjungan, dan transaksi pembayaran. Kolom dokter/keluhan/diagnosis pada rekam medis juga wajib diisi sejak awal, padahal kunjungan perlu dibuat sebelum triase.

Migrasi di `backend/database/migration.sql` menambah tabel akun, booking, tagihan, item tagihan, pembayaran, dan mutasi stok; membuat data rekam medis bertahap; memindahkan nilai resep ke tagihan; serta menghapus trigger stok lama yang dapat membuat stok negatif. Skrip migrasi mempertahankan tabel dan data contoh yang sudah ada.

1. Buat cadangan database sebelum perubahan.
2. Impor `db_klinik_dr_umum.sql` ke MySQL.
3. Jalankan `backend/database/migration.sql` satu kali pada database hasil impor.
4. Salin data contoh tetap memakai data pasien, dokter, obat, resep, dan kunjungan dari dump. Akun akses contoh dibuat dengan perintah `npm run seed` di backend.

Migrasi ditujukan untuk dump awal tersebut dan dijalankan satu kali; jangan jalankan berulang kali karena ada perubahan kolom dan pemindahan data.

## Menjalankan backend

Di terminal pertama:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

Isi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` di `backend/.env` sesuai MySQL lokal. Atur `JWT_SECRET` dengan nilai acak yang panjang. API tersedia di `http://localhost:4000`; pemeriksaan kesehatan di `/api/health`.

## Menjalankan frontend

Di terminal kedua:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173`. Jika alamat API berbeda, ubah `VITE_API_URL` di `frontend/.env`.

## Akun contoh

Semua akun contoh menggunakan kata sandi `Klinik123!` untuk pengembangan lokal:

| Peran | Email |
|---|---|
| Resepsionis | `resepsionis@klinik.test` |
| Perawat | `perawat@klinik.test` |
| Dokter | `dokter1@klinik.test`, `dokter2@klinik.test` |
| Kasir | `kasir@klinik.test` |
| Admin | `admin@klinik.test` |
| Pasien | `pasien1@klinik.test`, `pasien2@klinik.test`, `pasien3@klinik.test` |

Akun beserta kata sandi tersebut hanya untuk demo lokal. Ganti atau hapus sebelum penggunaan nyata; aplikasi ini belum mencakup hardening produksi dan kepatuhan operasional klinis.

## Pemeriksaan

Jalankan `npm run check` di `backend` untuk pemeriksaan sintaks dasar, dan `npm run build` di `frontend` untuk membangun UI produksi.
