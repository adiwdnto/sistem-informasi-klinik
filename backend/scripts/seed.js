import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../src/db.js';

const accounts = [
  { nama: 'Resepsionis Klinik', email: 'resepsionis@klinik.test', role: 'resepsionis' },
  { nama: 'Perawat Klinik', email: 'perawat@klinik.test', role: 'perawat' },
  { nama: 'Kasir Klinik', email: 'kasir@klinik.test', role: 'kasir' },
  { nama: 'Admin Klinik', email: 'admin@klinik.test', role: 'admin' },
];

try {
  const passwordHash = await bcrypt.hash('Klinik123!', 12);
  for (const account of accounts) {
    await pool.execute(
      `INSERT INTO users (nama, email, password_hash, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), password_hash = VALUES(password_hash), role = VALUES(role), is_aktif = 1`,
      [account.nama, account.email, passwordHash, account.role],
    );
  }

  const [doctors] = await pool.execute('SELECT id_dokter, nama_dokter FROM dokter ORDER BY id_dokter');
  for (const doctor of doctors) {
    const email = `dokter${doctor.id_dokter}@klinik.test`;
    await pool.execute(
      `INSERT INTO users (nama, email, password_hash, role, id_dokter)
       VALUES (?, ?, ?, 'dokter', ?)
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), password_hash = VALUES(password_hash), id_dokter = VALUES(id_dokter), is_aktif = 1`,
      [doctor.nama_dokter, email, passwordHash, doctor.id_dokter],
    );
  }

  const [patients] = await pool.execute('SELECT id_pasien, nama_pasien FROM pasien ORDER BY id_pasien');
  for (const patient of patients) {
    const email = `pasien${patient.id_pasien}@klinik.test`;
    await pool.execute(
      `INSERT INTO users (nama, email, password_hash, role, id_pasien)
       VALUES (?, ?, ?, 'pasien', ?)
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), password_hash = VALUES(password_hash), id_pasien = VALUES(id_pasien), is_aktif = 1`,
      [patient.nama_pasien, email, passwordHash, patient.id_pasien],
    );
  }
  console.log('Akun contoh berhasil dibuat. Kata sandi seluruh akun: Klinik123!');
} catch (error) {
  console.error('Gagal membuat akun contoh:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
