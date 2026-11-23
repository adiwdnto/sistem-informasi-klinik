-- Jalankan dump db_klinik_dr_umum.sql terlebih dahulu, lalu jalankan file ini.
-- Migrasi ini menambah alur aplikasi tanpa menghapus data lama.
USE db_klinik_dr_umum;

CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('pasien','resepsionis','perawat','dokter','kasir','admin') NOT NULL,
  id_pasien INT DEFAULT NULL,
  id_dokter INT DEFAULT NULL,
  is_aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_pasien (id_pasien),
  UNIQUE KEY uq_users_dokter (id_dokter),
  CONSTRAINT fk_user_pasien FOREIGN KEY (id_pasien) REFERENCES pasien (id_pasien) ON DELETE SET NULL,
  CONSTRAINT fk_user_dokter FOREIGN KEY (id_dokter) REFERENCES dokter (id_dokter) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id_booking INT NOT NULL AUTO_INCREMENT,
  id_pasien INT NOT NULL,
  id_dokter INT NOT NULL,
  tanggal DATE NOT NULL,
  jam TIME NOT NULL,
  status ENUM('Menunggu','Dikonfirmasi','Dibatalkan','Selesai') NOT NULL DEFAULT 'Menunggu',
  catatan VARCHAR(500) DEFAULT NULL,
  dibuat_oleh INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_booking),
  KEY idx_booking_jadwal (tanggal, jam, status),
  KEY idx_booking_pasien (id_pasien),
  CONSTRAINT fk_booking_pasien FOREIGN KEY (id_pasien) REFERENCES pasien (id_pasien) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_dokter FOREIGN KEY (id_dokter) REFERENCES dokter (id_dokter) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_user FOREIGN KEY (dibuat_oleh) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE rekam_medis
  MODIFY id_dokter INT DEFAULT NULL,
  MODIFY keluhan_utama TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  MODIFY diagnosis TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN id_booking INT DEFAULT NULL AFTER no_registrasi,
  ADD COLUMN status_kunjungan ENUM('Menunggu','Triase','Pemeriksaan','Selesai','Batal') NOT NULL DEFAULT 'Menunggu',
  ADD UNIQUE KEY uq_rm_booking (id_booking),
  ADD CONSTRAINT fk_rm_booking FOREIGN KEY (id_booking) REFERENCES bookings (id_booking) ON DELETE SET NULL;

UPDATE rekam_medis
SET status_kunjungan = CASE WHEN status_pembayaran = 'Batal' THEN 'Batal' ELSE 'Selesai' END
WHERE diagnosis IS NOT NULL AND diagnosis <> '';

CREATE TABLE invoices (
  id_invoice INT NOT NULL AUTO_INCREMENT,
  id_rm INT NOT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('Belum Lunas','Lunas','Batal') NOT NULL DEFAULT 'Belum Lunas',
  dibuat_pada TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_invoice),
  UNIQUE KEY uq_invoice_rm (id_rm),
  CONSTRAINT fk_invoice_rm FOREIGN KEY (id_rm) REFERENCES rekam_medis (id_rm) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id_item INT NOT NULL AUTO_INCREMENT,
  id_invoice INT NOT NULL,
  jenis ENUM('konsultasi','obat','lainnya') NOT NULL,
  deskripsi VARCHAR(255) NOT NULL,
  jumlah INT NOT NULL,
  harga_satuan DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id_item),
  KEY idx_invoice_items_invoice (id_invoice),
  CONSTRAINT fk_invoice_item FOREIGN KEY (id_invoice) REFERENCES invoices (id_invoice) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id_pembayaran INT NOT NULL AUTO_INCREMENT,
  id_invoice INT NOT NULL,
  id_kasir INT DEFAULT NULL,
  nominal DECIMAL(12,2) NOT NULL,
  metode ENUM('Tunai','Transfer','QRIS','Kartu','Lainnya') NOT NULL,
  dibayar_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pembayaran),
  KEY idx_payments_invoice (id_invoice),
  CONSTRAINT fk_payment_invoice FOREIGN KEY (id_invoice) REFERENCES invoices (id_invoice) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_user FOREIGN KEY (id_kasir) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_movements (
  id_mutasi INT NOT NULL AUTO_INCREMENT,
  id_obat INT NOT NULL,
  id_user INT DEFAULT NULL,
  perubahan INT NOT NULL,
  keterangan VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_mutasi),
  CONSTRAINT fk_stock_obat FOREIGN KEY (id_obat) REFERENCES obat (id_obat) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_user FOREIGN KEY (id_user) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perubahan stok sekarang dikunci dan dicatat dalam transaksi API agar tidak negatif.
DROP TRIGGER IF EXISTS trg_after_insert_resep;
DROP TRIGGER IF EXISTS trg_after_delete_resep;

INSERT INTO invoices (id_rm, total, status)
SELECT rm.id_rm, rm.total_biaya, rm.status_pembayaran
FROM rekam_medis rm;

INSERT INTO invoice_items (id_invoice, jenis, deskripsi, jumlah, harga_satuan)
SELECT i.id_invoice, 'konsultasi', 'Biaya konsultasi dokter', 1, rm.biaya_konsultasi
FROM invoices i JOIN rekam_medis rm ON rm.id_rm = i.id_rm
WHERE rm.biaya_konsultasi > 0;

INSERT INTO invoice_items (id_invoice, jenis, deskripsi, jumlah, harga_satuan)
SELECT i.id_invoice, 'obat', CONCAT(o.nama_obat, ' — ', r.aturan_pakai), r.jumlah, r.harga_satuan
FROM resep_detail r JOIN invoices i ON i.id_rm = r.id_rm
JOIN obat o ON o.id_obat = r.id_obat;

INSERT INTO payments (id_invoice, nominal, metode, dibayar_pada)
SELECT i.id_invoice, i.total, 'Lainnya', rm.tgl_periksa
FROM invoices i JOIN rekam_medis rm ON rm.id_rm = i.id_rm
WHERE i.status = 'Lunas' AND i.total > 0;

CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_laporan_pendapatan_harian AS
SELECT CAST(rm.tgl_periksa AS DATE) AS tanggal, COUNT(DISTINCT rm.id_rm) AS jumlah_pasien,
       SUM(rm.biaya_konsultasi) AS total_konsultasi, SUM(rm.biaya_obat) AS total_penjualan_obat,
       SUM(rm.total_biaya) AS total_pendapatan
FROM rekam_medis rm WHERE rm.status_pembayaran = 'Lunas'
GROUP BY CAST(rm.tgl_periksa AS DATE);
