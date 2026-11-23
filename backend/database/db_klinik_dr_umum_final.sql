CREATE DATABASE IF NOT EXISTS db_klinik_dr_umum_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE db_klinik_dr_umum_app;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE dokter (
  id_dokter INT NOT NULL AUTO_INCREMENT,
  sip VARCHAR(50) NOT NULL,
  nama_dokter VARCHAR(100) NOT NULL,
  no_hp VARCHAR(15) NOT NULL,
  tarif_konsultasi DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
  is_aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_dokter),
  UNIQUE KEY uq_dokter_sip (sip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pasien (
  id_pasien INT NOT NULL AUTO_INCREMENT,
  no_rm VARCHAR(15) NOT NULL COMMENT 'Nomor Rekam Medis',
  nik CHAR(16) NOT NULL,
  nama_pasien VARCHAR(100) NOT NULL,
  tanggal_lahir DATE NOT NULL,
  jenis_kelamin ENUM('L','P') NOT NULL,
  no_hp VARCHAR(15) NOT NULL,
  alamat TEXT NOT NULL,
  tgl_daftar DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pasien),
  UNIQUE KEY uq_pasien_no_rm (no_rm),
  UNIQUE KEY uq_pasien_nik (nik),
  KEY idx_pasien_nama (nama_pasien)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE obat (
  id_obat INT NOT NULL AUTO_INCREMENT,
  kode_obat VARCHAR(20) NOT NULL,
  nama_obat VARCHAR(100) NOT NULL,
  satuan VARCHAR(20) NOT NULL DEFAULT 'Tablet',
  harga_jual DECIMAL(12,2) NOT NULL,
  stok INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_obat),
  UNIQUE KEY uq_obat_kode (kode_obat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE rekam_medis (
  id_rm INT NOT NULL AUTO_INCREMENT,
  no_registrasi VARCHAR(25) NOT NULL,
  id_booking INT DEFAULT NULL,
  id_pasien INT NOT NULL,
  id_dokter INT DEFAULT NULL,
  tgl_periksa DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status_kunjungan ENUM('Menunggu','Triase','Pemeriksaan','Selesai','Batal') NOT NULL DEFAULT 'Menunggu',
  sistole INT DEFAULT NULL COMMENT 'Tekanan darah sistole (mmHg)',
  diastole INT DEFAULT NULL COMMENT 'Tekanan darah diastole (mmHg)',
  suhu_tubuh DECIMAL(4,1) DEFAULT NULL COMMENT 'Suhu tubuh (Celcius)',
  berat_badan DECIMAL(5,2) DEFAULT NULL COMMENT 'Berat badan (Kg)',
  keluhan_utama TEXT DEFAULT NULL,
  diagnosis TEXT DEFAULT NULL,
  tindakan TEXT DEFAULT NULL,
  biaya_konsultasi DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  biaya_obat DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_biaya DECIMAL(12,2) GENERATED ALWAYS AS (biaya_konsultasi + biaya_obat) STORED,
  status_pembayaran ENUM('Belum Lunas','Lunas','Batal') NOT NULL DEFAULT 'Belum Lunas',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_rm),
  UNIQUE KEY uq_rm_registrasi (no_registrasi),
  UNIQUE KEY uq_rm_booking (id_booking),
  KEY idx_rm_tgl (tgl_periksa),
  KEY idx_rm_pasien (id_pasien),
  KEY idx_rm_dokter (id_dokter),
  CONSTRAINT fk_rm_booking FOREIGN KEY (id_booking) REFERENCES bookings (id_booking) ON DELETE SET NULL,
  CONSTRAINT fk_rm_dokter FOREIGN KEY (id_dokter) REFERENCES dokter (id_dokter) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rm_pasien FOREIGN KEY (id_pasien) REFERENCES pasien (id_pasien) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resep_detail (
  id_resep INT NOT NULL AUTO_INCREMENT,
  id_rm INT NOT NULL,
  id_obat INT NOT NULL,
  jumlah INT NOT NULL,
  harga_satuan DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (jumlah * harga_satuan) STORED,
  aturan_pakai VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_resep),
  KEY idx_resep_rm (id_rm),
  KEY idx_resep_obat (id_obat),
  CONSTRAINT fk_resep_rm FOREIGN KEY (id_rm) REFERENCES rekam_medis (id_rm) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resep_obat FOREIGN KEY (id_obat) REFERENCES obat (id_obat) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_stock_obat (id_obat),
  CONSTRAINT fk_stock_obat FOREIGN KEY (id_obat) REFERENCES obat (id_obat) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_user FOREIGN KEY (id_user) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO dokter (id_dokter, sip, nama_dokter, no_hp, tarif_konsultasi, is_aktif, created_at) VALUES
(1, 'SIP/2024/001/DU', 'dr. Budi Santoso', '081234567890', 75000.00, 1, '2026-10-19 06:38:24'),
(2, 'SIP/2024/002/DU', 'dr. Siti Rahmawati', '081987654321', 80000.00, 1, '2026-10-19 06:38:24');

INSERT INTO pasien (id_pasien, no_rm, nik, nama_pasien, tanggal_lahir, jenis_kelamin, no_hp, alamat, tgl_daftar, created_at) VALUES
(1, 'RM-202610-0001', '3171011508900001', 'Ahmad Fauzi', '1990-08-15', 'L', '085611223344', 'Jl. Merdeka No. 12, Jakarta Central', '2026-10-19 13:38:24', '2026-10-19 06:38:24'),
(2, 'RM-202610-0002', '3171015203950002', 'Dewi Lestari', '1995-03-12', 'P', '085755667788', 'Jl. Mawar Indah No. 5, Jakarta Selatan', '2026-10-19 13:38:24', '2026-10-19 06:38:24'),
(3, 'RM-202610-0003', '3171012011880003', 'Bambang Pratama', '1988-11-20', 'L', '081399001122', 'Jl. Melati No. 88, Jakarta Barat', '2026-10-19 13:38:24', '2026-10-19 06:38:24');

INSERT INTO obat (id_obat, kode_obat, nama_obat, satuan, harga_jual, stok, created_at) VALUES
(1, 'OBT-PAR-500', 'Paracetamol 500mg', 'Kaplet', 2000.00, 190, '2026-10-19 06:38:24'),
(2, 'OBT-AMX-500', 'Amoxicillin 500mg', 'Kaplet', 5000.00, 90, '2026-10-19 06:38:24'),
(3, 'OBT-CTM-004', 'CTM 4mg', 'Tablet', 1000.00, 140, '2026-10-19 06:38:24'),
(4, 'OBT-AMB-030', 'Ambroxol Syrup 100ml', 'Botol', 25000.00, 24, '2026-10-19 06:38:24'),
(5, 'OBT-VIT-C100', 'Vitamin C 500mg', 'Tablet', 3000.00, 10, '2026-10-19 06:38:24');

INSERT INTO users (id, nama, email, password_hash, role, id_pasien, id_dokter, is_aktif) VALUES
(1, 'Resepsionis Klinik', 'resepsionis@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'resepsionis', NULL, NULL, 1),
(2, 'Perawat Klinik', 'perawat@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'perawat', NULL, NULL, 1),
(3, 'Kasir Klinik', 'kasir@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'kasir', NULL, NULL, 1),
(4, 'Admin Klinik', 'admin@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'admin', NULL, NULL, 1),
(5, 'dr. Budi Santoso', 'dokter1@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'dokter', NULL, 1, 1),
(6, 'dr. Siti Rahmawati', 'dokter2@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'dokter', NULL, 2, 1),
(7, 'Ahmad Fauzi', 'pasien1@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'pasien', 1, NULL, 1),
(8, 'Dewi Lestari', 'pasien2@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'pasien', 2, NULL, 1),
(9, 'Bambang Pratama', 'pasien3@klinik.test', '$2a$12$j04nkeP420V3GW0a53RLXeXhF6QPDzc3ebaxOs.V5exVEALYECj56', 'pasien', 3, NULL, 1);

INSERT INTO rekam_medis (
  id_rm, no_registrasi, id_pasien, id_dokter, tgl_periksa, status_kunjungan,
  sistole, diastole, suhu_tubuh, berat_badan, keluhan_utama, diagnosis, tindakan,
  biaya_konsultasi, biaya_obat, status_pembayaran, created_at
) VALUES
(1, 'REG-20261019-001', 1, 1, '2026-10-19 09:15:00', 'Selesai', 120, 80, 38.2, 68.50, 'Demam tinggi 2 hari, batuk berdahak, flu', 'ISPA (Infeksi Saluran Pernapasan Akut)', 'Edukasi istirahat dan banyak minum air putih', 75000.00, 45000.00, 'Lunas', '2026-10-19 06:58:54'),
(2, 'REG-20261019-002', 2, 2, '2026-10-19 10:30:00', 'Selesai', 110, 70, 36.8, 52.00, 'Gatal-gatal pada kulit dan radang tenggorokan', 'Alergi Kulit dan Faringitis Akut', 'Konseling hindari alergen', 80000.00, 60000.00, 'Lunas', '2026-10-19 07:04:37');

INSERT INTO resep_detail (id_resep, id_rm, id_obat, jumlah, harga_satuan, aturan_pakai, created_at) VALUES
(1, 1, 1, 10, 2000.00, '3x1 kaplet sesudah makan', '2026-10-19 06:58:54'),
(2, 1, 4, 1, 25000.00, '3x1 sendok takar (5ml)', '2026-10-19 06:58:54'),
(3, 2, 2, 10, 5000.00, '3x1 kaplet sesudah makan (Habiskan)', '2026-10-19 07:04:37'),
(4, 2, 3, 10, 1000.00, '2x1 tablet jika gatal', '2026-10-19 07:04:37');

INSERT INTO invoices (id_invoice, id_rm, total, status, dibuat_pada) VALUES
(1, 1, 120000.00, 'Lunas', '2026-10-19 06:58:54'),
(2, 2, 140000.00, 'Lunas', '2026-10-19 07:04:37');

INSERT INTO invoice_items (id_item, id_invoice, jenis, deskripsi, jumlah, harga_satuan) VALUES
(1, 1, 'konsultasi', 'Biaya konsultasi dokter', 1, 75000.00),
(2, 1, 'obat', 'Paracetamol 500mg - 3x1 kaplet sesudah makan', 10, 2000.00),
(3, 1, 'obat', 'Ambroxol Syrup 100ml - 3x1 sendok takar (5ml)', 1, 25000.00),
(4, 2, 'konsultasi', 'Biaya konsultasi dokter', 1, 80000.00),
(5, 2, 'obat', 'Amoxicillin 500mg - 3x1 kaplet sesudah makan (Habiskan)', 10, 5000.00),
(6, 2, 'obat', 'CTM 4mg - 2x1 tablet jika gatal', 10, 1000.00);

INSERT INTO payments (id_pembayaran, id_invoice, nominal, metode, dibayar_pada) VALUES
(1, 1, 120000.00, 'Lainnya', '2026-10-19 09:15:00'),
(2, 2, 140000.00, 'Lainnya', '2026-10-19 10:30:00');

CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_laporan_pendapatan_harian AS
SELECT CAST(rm.tgl_periksa AS DATE) AS tanggal,
       COUNT(DISTINCT rm.id_rm) AS jumlah_pasien,
       SUM(rm.biaya_konsultasi) AS total_konsultasi,
       SUM(rm.biaya_obat) AS total_penjualan_obat,
       SUM(rm.total_biaya) AS total_pendapatan
FROM rekam_medis rm
WHERE rm.status_pembayaran = 'Lunas'
GROUP BY CAST(rm.tgl_periksa AS DATE);

CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_riwayat_rekam_medis AS
SELECT rm.id_rm, rm.no_registrasi, rm.tgl_periksa, rm.status_kunjungan,
       p.no_rm, p.nama_pasien, TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CURDATE()) AS umur_pasien,
       d.nama_dokter, rm.keluhan_utama, rm.diagnosis, rm.tindakan,
       rm.biaya_konsultasi, rm.biaya_obat, rm.total_biaya, rm.status_pembayaran
FROM rekam_medis rm
JOIN pasien p ON p.id_pasien = rm.id_pasien
LEFT JOIN dokter d ON d.id_dokter = rm.id_dokter;

CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_stok_obat_kritis AS
SELECT kode_obat, nama_obat, satuan, harga_jual, stok,
       CASE
         WHEN stok = 0 THEN 'HABIS'
         WHEN stok <= 15 THEN 'SANGAT KRITIS'
         ELSE 'HAMPIR HABIS'
       END AS status_stok
FROM obat
WHERE stok <= 30;
