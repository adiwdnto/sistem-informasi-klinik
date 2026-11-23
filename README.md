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

Dump sumber `db_klinik_dr_umum.sql` menyediakan data dasar pasien, dokter, obat, resep, dan rekam medis. Dump final `backend/database/db_klinik_dr_umum_final.sql` sudah berisi seluruh struktur akhir aplikasi, data contoh, akun demo, booking, kunjungan bertahap, resep, tagihan, pembayaran, stok, dan view laporan. Database yang dibuat bernama `db_klinik_dr_umum_app`, sehingga database sumber tidak ditimpa.

Untuk menyiapkan database, impor **hanya** `backend/database/db_klinik_dr_umum_final.sql` satu kali ke MySQL. Tidak perlu mengimpor dump sumber, menjalankan skrip perubahan skema, atau menjalankan perintah seed. Konfigurasi `DB_NAME` pada `backend/.env` harus bernilai `db_klinik_dr_umum_app`. Jangan impor ulang ke database yang sudah berisi aplikasi; buat database kosong baru jika ingin mengulang penyiapan.

## Menjalankan backend

Di terminal pertama:

```powershell
cd backend
Copy-Item .env.example .env
npm install
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
