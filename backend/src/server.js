import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const roles = ['pasien', 'resepsionis', 'perawat', 'dokter', 'kasir', 'admin'];

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) fail(400, `Kolom wajib diisi: ${missing.join(', ')}`);
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function authenticate(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(Object.assign(new Error('Silakan masuk terlebih dahulu.'), { status: 401 }));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return next(Object.assign(new Error('Sesi tidak valid. Silakan masuk kembali.'), { status: 401 }));
  }
}

function allow(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin')) {
      return next(Object.assign(new Error('Anda tidak memiliki akses untuk tindakan ini.'), { status: 403 }));
    }
    return next();
  };
}

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, role: user.role, id_pasien: user.id_pasien, id_dokter: user.id_dokter },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', aplikasi: 'Sistem Informasi Klinik' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const [rows] = await pool.execute(
    `SELECT u.id, u.nama, u.email, u.password_hash, u.role, u.id_pasien, u.id_dokter,
            p.no_rm, d.nama_dokter
     FROM users u
     LEFT JOIN pasien p ON p.id_pasien = u.id_pasien
     LEFT JOIN dokter d ON d.id_dokter = u.id_dokter
     WHERE u.email = ? AND u.is_aktif = 1`,
    [String(req.body.email).trim().toLowerCase()],
  );
  if (!rows.length || !(await bcrypt.compare(req.body.password, rows[0].password_hash))) {
    fail(401, 'Email atau kata sandi tidak sesuai.');
  }
  const { password_hash: _passwordHash, ...user } = rows[0];
  res.json({ token: tokenFor(user), user });
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nama', 'email', 'password', 'nik', 'tanggal_lahir', 'jenis_kelamin', 'no_hp', 'alamat']);
  if (String(req.body.password).length < 8) fail(400, 'Kata sandi harus terdiri dari minimal 8 karakter.');
  if (!/^\d{16}$/.test(String(req.body.nik))) fail(400, 'NIK harus terdiri dari 16 angka.');
  if (!['L', 'P'].includes(req.body.jenis_kelamin)) fail(400, 'Jenis kelamin tidak valid.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [String(req.body.email).trim().toLowerCase()]);
    if (existing.length) fail(409, 'Email sudah terdaftar.');
    const [patient] = await connection.execute(
      `INSERT INTO pasien (no_rm, nik, nama_pasien, tanggal_lahir, jenis_kelamin, no_hp, alamat)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [await generateMedicalRecordNumber(connection), req.body.nik, req.body.nama, req.body.tanggal_lahir, req.body.jenis_kelamin, req.body.no_hp, req.body.alamat],
    );
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const [account] = await connection.execute(
      `INSERT INTO users (nama, email, password_hash, role, id_pasien)
       VALUES (?, ?, ?, 'pasien', ?)`,
      [req.body.nama, String(req.body.email).trim().toLowerCase(), passwordHash, patient.insertId],
    );
    await connection.commit();
    const user = { id: account.insertId, nama: req.body.nama, email: String(req.body.email).trim().toLowerCase(), role: 'pasien', id_pasien: patient.insertId };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') fail(409, 'NIK atau email sudah terdaftar.');
    throw error;
  } finally {
    connection.release();
  }
}));

async function generateMedicalRecordNumber(connection) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) + 1 AS berikutnya FROM pasien
     WHERE DATE_FORMAT(tgl_daftar, '%Y%m') = DATE_FORMAT(CURRENT_DATE(), '%Y%m')`,
  );
  const next = String(rows[0].berikutnya).padStart(4, '0');
  const [month] = await connection.execute("SELECT DATE_FORMAT(CURRENT_DATE(), '%Y%m') AS bulan");
  return `RM-${month[0].bulan}-${next}`;
}

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nama, u.email, u.role, u.id_pasien, u.id_dokter, p.no_rm, d.nama_dokter
     FROM users u LEFT JOIN pasien p ON p.id_pasien = u.id_pasien
     LEFT JOIN dokter d ON d.id_dokter = u.id_dokter WHERE u.id = ? AND u.is_aktif = 1`,
    [req.user.id],
  );
  if (!rows.length) fail(401, 'Akun tidak ditemukan atau sudah dinonaktifkan.');
  res.json(rows[0]);
}));

app.get('/api/doctors', authenticate, asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute('SELECT id_dokter, nama_dokter, tarif_konsultasi FROM dokter WHERE is_aktif = 1 ORDER BY nama_dokter');
  res.json(rows);
}));

app.get('/api/patients', authenticate, allow('resepsionis', 'perawat', 'dokter', 'kasir'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute('SELECT id_pasien, no_rm, nama_pasien, no_hp FROM pasien ORDER BY nama_pasien');
  res.json(rows);
}));

app.post('/api/patients', authenticate, allow('resepsionis'), asyncRoute(async (req, res) => {
  requireFields(req.body, ['nik', 'nama_pasien', 'tanggal_lahir', 'jenis_kelamin', 'no_hp', 'alamat']);
  if (!/^\d{16}$/.test(String(req.body.nik))) fail(400, 'NIK harus terdiri dari 16 angka.');
  const number = await generateMedicalRecordNumber(pool);
  const [result] = await pool.execute(
    `INSERT INTO pasien (no_rm, nik, nama_pasien, tanggal_lahir, jenis_kelamin, no_hp, alamat)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [number, req.body.nik, req.body.nama_pasien, req.body.tanggal_lahir, req.body.jenis_kelamin, req.body.no_hp, req.body.alamat],
  );
  res.status(201).json({ id_pasien: result.insertId, no_rm: number });
}));

app.get('/api/appointments', authenticate, allow('pasien', 'resepsionis'), asyncRoute(async (req, res) => {
  const isPatient = req.user.role === 'pasien';
  const filter = isPatient ? 'WHERE b.id_pasien = ?' : '';
  const params = isPatient ? [req.user.id_pasien] : [];
  const [rows] = await pool.execute(
    `SELECT b.id_booking, b.tanggal, b.jam, b.status, b.catatan,
            p.id_pasien, p.no_rm, p.nama_pasien, d.id_dokter, d.nama_dokter,
            rm.id_rm, rm.no_registrasi
     FROM bookings b JOIN pasien p ON p.id_pasien = b.id_pasien
     JOIN dokter d ON d.id_dokter = b.id_dokter
     LEFT JOIN rekam_medis rm ON rm.id_booking = b.id_booking
     ${filter}
     ORDER BY b.tanggal DESC, b.jam DESC LIMIT 200`,
    params,
  );
  res.json(rows);
}));

app.post('/api/appointments', authenticate, allow('pasien', 'resepsionis'), asyncRoute(async (req, res) => {
  requireFields(req.body, ['id_dokter', 'tanggal', 'jam']);
  const patientId = req.user.role === 'pasien' ? req.user.id_pasien : Number(req.body.id_pasien);
  if (!patientId) fail(400, 'Pilih pasien untuk membuat booking.');
  if (req.body.tanggal < new Date().toISOString().slice(0, 10)) fail(400, 'Tanggal booking tidak boleh di masa lalu.');
  const [result] = await pool.execute(
    `INSERT INTO bookings (id_pasien, id_dokter, tanggal, jam, catatan, dibuat_oleh)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patientId, Number(req.body.id_dokter), req.body.tanggal, req.body.jam, req.body.catatan || null, req.user.id],
  );
  res.status(201).json({ id_booking: result.insertId, pesan: 'Booking berhasil dibuat.' });
}));

app.patch('/api/appointments/:id/status', authenticate, allow('resepsionis'), asyncRoute(async (req, res) => {
  requireFields(req.body, ['status']);
  const allowed = ['Dikonfirmasi', 'Dibatalkan'];
  if (!allowed.includes(req.body.status)) fail(400, 'Status booking tidak valid.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [booking] = await connection.execute('SELECT * FROM bookings WHERE id_booking = ? FOR UPDATE', [req.params.id]);
    if (!booking.length) fail(404, 'Booking tidak ditemukan.');
    await connection.execute('UPDATE bookings SET status = ? WHERE id_booking = ?', [req.body.status, req.params.id]);
    if (req.body.status === 'Dikonfirmasi') {
      const [existing] = await connection.execute('SELECT id_rm FROM rekam_medis WHERE id_booking = ?', [req.params.id]);
      if (!existing.length) {
        await connection.execute(
          `INSERT INTO rekam_medis (no_registrasi, id_booking, id_pasien, id_dokter, tgl_periksa, status_kunjungan)
           VALUES (?, ?, ?, ?, CONCAT(?, ' ', ?), 'Menunggu')`,
          [await generateRegistrationNumber(connection), booking[0].id_booking, booking[0].id_pasien, booking[0].id_dokter, booking[0].tanggal, booking[0].jam],
        );
      }
    }
    await connection.commit();
    res.json({ pesan: 'Status booking berhasil diperbarui.' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

async function generateRegistrationNumber(connection) {
  const [rows] = await connection.execute("SELECT DATE_FORMAT(CURRENT_DATE(), '%Y%m%d') AS hari");
  const [count] = await connection.execute("SELECT COUNT(*) + 1 AS berikutnya FROM rekam_medis WHERE DATE(tgl_periksa) = CURRENT_DATE()");
  return `REG-${rows[0].hari}-${String(count[0].berikutnya).padStart(3, '0')}`;
}

app.get('/api/visits', authenticate, allow('pasien', 'resepsionis', 'perawat', 'dokter'), asyncRoute(async (req, res) => {
  const conditions = [];
  const params = [];
  if (req.user.role === 'dokter' && !req.user.id_dokter) fail(403, 'Akun dokter belum terhubung dengan data dokter.');
  if (req.user.role === 'pasien') {
    conditions.push('rm.id_pasien = ?');
    params.push(req.user.id_pasien);
  }
  if (req.user.role === 'dokter' && req.user.id_dokter) {
    conditions.push('rm.id_dokter = ?');
    params.push(req.user.id_dokter);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(
    `SELECT rm.id_rm, rm.no_registrasi, rm.tgl_periksa, rm.status_kunjungan, rm.sistole, rm.diastole,
            rm.suhu_tubuh, rm.berat_badan, rm.keluhan_utama, rm.diagnosis, rm.tindakan,
            p.id_pasien, p.no_rm, p.nama_pasien, d.nama_dokter
     FROM rekam_medis rm JOIN pasien p ON p.id_pasien = rm.id_pasien
     LEFT JOIN dokter d ON d.id_dokter = rm.id_dokter
     ${where} ORDER BY rm.tgl_periksa DESC LIMIT 200`,
    params,
  );
  res.json(rows);
}));

app.patch('/api/visits/:id/triage', authenticate, allow('perawat'), asyncRoute(async (req, res) => {
  requireFields(req.body, ['keluhan_utama', 'sistole', 'diastole']);
  const [result] = await pool.execute(
    `UPDATE rekam_medis SET keluhan_utama = ?, sistole = ?, diastole = ?, suhu_tubuh = ?, berat_badan = ?,
       status_kunjungan = 'Pemeriksaan' WHERE id_rm = ? AND status_kunjungan IN ('Menunggu', 'Triase')`,
    [req.body.keluhan_utama, Number(req.body.sistole), Number(req.body.diastole), req.body.suhu_tubuh || null, req.body.berat_badan || null, req.params.id],
  );
  if (!result.affectedRows) fail(409, 'Kunjungan tidak ditemukan atau sudah diproses.');
  res.json({ pesan: 'Data triase berhasil disimpan.' });
}));

app.patch('/api/visits/:id/examination', authenticate, allow('dokter'), asyncRoute(async (req, res) => {
  requireFields(req.body, ['diagnosis', 'tindakan']);
  if (!Array.isArray(req.body.resep)) fail(400, 'Data resep harus berupa daftar obat.');
  if (!req.user.id_dokter) fail(403, 'Akun dokter belum terhubung dengan data dokter.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [visits] = await connection.execute('SELECT * FROM rekam_medis WHERE id_rm = ? FOR UPDATE', [req.params.id]);
    if (!visits.length) fail(404, 'Kunjungan tidak ditemukan.');
    if (visits[0].status_kunjungan !== 'Pemeriksaan') fail(409, 'Kunjungan harus melalui triase perawat sebelum pemeriksaan dokter.');
    const [doctor] = await connection.execute('SELECT tarif_konsultasi FROM dokter WHERE id_dokter = ?', [req.user.id_dokter]);
    if (!doctor.length) fail(404, 'Data dokter untuk akun ini tidak ditemukan.');
    await connection.execute(
      `UPDATE rekam_medis SET diagnosis = ?, tindakan = ?, biaya_konsultasi = ?,
       status_kunjungan = 'Selesai', id_dokter = ? WHERE id_rm = ?`,
      [req.body.diagnosis, req.body.tindakan, doctor[0].tarif_konsultasi, req.user.id_dokter, req.params.id],
    );

    const [invoiceResult] = await connection.execute(
      `INSERT INTO invoices (id_rm, status) VALUES (?, 'Belum Lunas')
       ON DUPLICATE KEY UPDATE id_invoice = LAST_INSERT_ID(id_invoice)`,
      [req.params.id],
    );
    const invoiceId = invoiceResult.insertId;
    await connection.execute('DELETE FROM invoice_items WHERE id_invoice = ? AND jenis = "obat"', [invoiceId]);
    const [existingFee] = await connection.execute('SELECT id_item FROM invoice_items WHERE id_invoice = ? AND jenis = "konsultasi"', [invoiceId]);
    if (!existingFee.length) {
      await connection.execute(
        `INSERT INTO invoice_items (id_invoice, jenis, deskripsi, jumlah, harga_satuan)
         VALUES (?, 'konsultasi', 'Biaya konsultasi dokter', 1, ?)`,
        [invoiceId, doctor[0]?.tarif_konsultasi || 0],
      );
    }

    let medicineTotal = 0;
    for (const item of req.body.resep) {
      const quantity = Number(item.jumlah);
      if (!Number.isInteger(quantity) || quantity <= 0) fail(400, 'Jumlah obat harus bilangan bulat lebih dari nol.');
      const [medicines] = await connection.execute('SELECT id_obat, nama_obat, harga_jual, stok FROM obat WHERE id_obat = ? FOR UPDATE', [Number(item.id_obat)]);
      if (!medicines.length) fail(404, 'Obat pada resep tidak ditemukan.');
      if (medicines[0].stok < quantity) fail(409, `Stok ${medicines[0].nama_obat} tidak mencukupi.`);
      medicineTotal += quantity * Number(medicines[0].harga_jual);
      await connection.execute(
        `INSERT INTO resep_detail (id_rm, id_obat, jumlah, harga_satuan, aturan_pakai) VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, medicines[0].id_obat, quantity, medicines[0].harga_jual, String(item.aturan_pakai || '').slice(0, 100)],
      );
      await connection.execute('UPDATE obat SET stok = stok - ? WHERE id_obat = ?', [quantity, medicines[0].id_obat]);
      await connection.execute(
        'INSERT INTO stock_movements (id_obat, id_user, perubahan, keterangan) VALUES (?, ?, ?, ?)',
        [medicines[0].id_obat, req.user.id, -quantity, `Resep ${visits[0].no_registrasi}`],
      );
      await connection.execute(
        `INSERT INTO invoice_items (id_invoice, jenis, deskripsi, jumlah, harga_satuan)
         VALUES (?, 'obat', ?, ?, ?)`,
        [invoiceId, `${medicines[0].nama_obat} — ${item.aturan_pakai || 'sesuai resep'}`, quantity, medicines[0].harga_jual],
      );
    }
    await connection.execute('UPDATE rekam_medis SET biaya_obat = ? WHERE id_rm = ?', [medicineTotal, req.params.id]);
    await connection.execute(
      `UPDATE invoices SET total = (SELECT COALESCE(SUM(jumlah * harga_satuan), 0) FROM invoice_items WHERE id_invoice = ?) WHERE id_invoice = ?`,
      [invoiceId, invoiceId],
    );
    await connection.commit();
    res.json({ pesan: 'Pemeriksaan dan resep berhasil disimpan.', id_invoice: invoiceId });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/medicines', authenticate, allow('dokter', 'kasir', 'resepsionis'), asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute('SELECT id_obat, kode_obat, nama_obat, satuan, harga_jual, stok FROM obat ORDER BY nama_obat');
  res.json(rows);
}));

app.get('/api/invoices', authenticate, allow('kasir', 'resepsionis', 'pasien'), asyncRoute(async (req, res) => {
  const patientFilter = req.user.role === 'pasien' ? 'WHERE p.id_pasien = ?' : '';
  const params = req.user.role === 'pasien' ? [req.user.id_pasien] : [];
  const [rows] = await pool.execute(
    `SELECT i.id_invoice, i.status, i.total, i.dibuat_pada, rm.no_registrasi, rm.tgl_periksa,
            p.nama_pasien, p.no_rm,
            COALESCE((SELECT SUM(b.nominal) FROM payments b WHERE b.id_invoice = i.id_invoice), 0) AS sudah_dibayar
     FROM invoices i JOIN rekam_medis rm ON rm.id_rm = i.id_rm
     JOIN pasien p ON p.id_pasien = rm.id_pasien ${patientFilter}
     ORDER BY i.dibuat_pada DESC LIMIT 200`,
    params,
  );
  res.json(rows);
}));

app.get('/api/invoices/:id', authenticate, allow('kasir', 'resepsionis', 'pasien'), asyncRoute(async (req, res) => {
  const [invoice] = await pool.execute(
    `SELECT i.*, p.id_pasien, p.nama_pasien, p.no_rm, rm.no_registrasi
     FROM invoices i JOIN rekam_medis rm ON rm.id_rm = i.id_rm
     JOIN pasien p ON p.id_pasien = rm.id_pasien WHERE i.id_invoice = ?`,
    [req.params.id],
  );
  if (!invoice.length) fail(404, 'Tagihan tidak ditemukan.');
  if (req.user.role === 'pasien' && invoice[0].id_pasien !== req.user.id_pasien) fail(403, 'Tagihan ini bukan milik akun Anda.');
  const [items] = await pool.execute('SELECT * FROM invoice_items WHERE id_invoice = ?', [req.params.id]);
  const [payments] = await pool.execute('SELECT nominal, metode, dibayar_pada FROM payments WHERE id_invoice = ? ORDER BY dibayar_pada DESC', [req.params.id]);
  res.json({ ...invoice[0], items, payments });
}));

app.post('/api/invoices/:id/payments', authenticate, allow('kasir'), asyncRoute(async (req, res) => {
  requireFields(req.body, ['nominal', 'metode']);
  const amount = Number(req.body.nominal);
  if (!Number.isFinite(amount) || amount <= 0) fail(400, 'Nominal pembayaran harus lebih dari nol.');
  if (!['Tunai', 'Transfer', 'QRIS', 'Kartu'].includes(req.body.metode)) fail(400, 'Metode pembayaran tidak valid.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [invoices] = await connection.execute('SELECT * FROM invoices WHERE id_invoice = ? FOR UPDATE', [req.params.id]);
    if (!invoices.length) fail(404, 'Tagihan tidak ditemukan.');
    const [paidRows] = await connection.execute('SELECT COALESCE(SUM(nominal), 0) AS total FROM payments WHERE id_invoice = ?', [req.params.id]);
    const remaining = Number(invoices[0].total) - Number(paidRows[0].total);
    if (amount > remaining) fail(400, 'Nominal pembayaran melebihi sisa tagihan.');
    await connection.execute(
      'INSERT INTO payments (id_invoice, id_kasir, nominal, metode) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, amount, req.body.metode],
    );
    const newStatus = Math.abs(amount - remaining) < 0.01 ? 'Lunas' : 'Belum Lunas';
    await connection.execute('UPDATE invoices SET status = ? WHERE id_invoice = ?', [newStatus, req.params.id]);
    await connection.execute('UPDATE rekam_medis rm JOIN invoices i ON i.id_rm = rm.id_rm SET rm.status_pembayaran = ? WHERE i.id_invoice = ?', [newStatus, req.params.id]);
    await connection.commit();
    res.status(201).json({ pesan: 'Pembayaran berhasil dicatat.', status: newStatus });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get('/api/dashboard', authenticate, asyncRoute(async (req, res) => {
  const isPatient = req.user.role === 'pasien';
  const patientFilter = isPatient ? ' AND id_pasien = ?' : '';
  const params = isPatient ? [req.user.id_pasien] : [];
  const [visits] = await pool.execute(
    `SELECT COUNT(*) AS jumlah FROM rekam_medis WHERE DATE(tgl_periksa) = CURRENT_DATE()${patientFilter}`,
    params,
  );
  const [queue] = await pool.execute(
    `SELECT COUNT(*) AS jumlah FROM rekam_medis
     WHERE status_kunjungan IN ('Menunggu', 'Triase', 'Pemeriksaan')${patientFilter}`,
    params,
  );
  const [unpaid] = await pool.execute(
    `SELECT COUNT(*) AS jumlah FROM invoices i JOIN rekam_medis rm ON rm.id_rm = i.id_rm
     WHERE i.status = 'Belum Lunas'${isPatient ? ' AND rm.id_pasien = ?' : ''}`,
    params,
  );
  res.json({ kunjungan_hari_ini: visits[0].jumlah, antrean_aktif: queue[0].jumlah, tagihan_belum_lunas: unpaid[0].jumlah });
}));

app.use((error, _req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ pesan: 'Data sudah terdaftar.' });
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_BAD_NULL_ERROR') return res.status(400).json({ pesan: 'Data tidak lengkap atau referensi tidak valid.' });
  const status = error.status || 500;
  if (status === 500) console.error(error);
  return res.status(status).json({ pesan: status === 500 ? 'Terjadi kesalahan pada server.' : error.message });
});

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET wajib diatur melalui file .env.');
  process.exit(1);
}

app.listen(port, () => console.log(`API klinik berjalan di http://localhost:${port}`));
