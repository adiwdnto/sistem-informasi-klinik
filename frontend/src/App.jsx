import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BadgeCheck, CalendarDays, Check, ClipboardList, CreditCard,
  HeartPulse, LogOut, Menu, Pill, Plus, Printer, Search, ShieldCheck, Users, X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const roleNames = { pasien: 'Pasien', resepsionis: 'Resepsionis', perawat: 'Perawat', dokter: 'Dokter', kasir: 'Kasir', admin: 'Admin' };
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const displayDate = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.pesan || 'Permintaan tidak berhasil. Silakan coba kembali.');
  return body;
}

function Field({ label, children, className = '' }) {
  return <label className={className}><span className="field-label">{label}</span>{children}</label>;
}

function Button({ children, variant = 'primary', ...props }) {
  const { className = '', ...buttonProps } = props;
  return <button className={`${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${className}`} {...buttonProps}>{children}</button>;
}

function Notice({ message, type = 'error', onClose }) {
  if (!message) return null;
  return (
    <div className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-base ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">
      <span>{message}</span>
      {onClose && <button aria-label="Tutup pemberitahuan" onClick={onClose}><X size={18} /></button>}
    </div>
  );
}

function Login({ onLogin, message, setMessage }) {
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', nama: '', nik: '', tanggal_lahir: '', jenis_kelamin: 'L', no_hp: '', alamat: '' });
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const path = registering ? '/auth/register' : '/auth/login';
      const result = await api(path, { method: 'POST', body: JSON.stringify(form) });
      onLogin(result);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-forest-900 via-forest-800 to-forest-700 px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-2xl md:grid-cols-[.9fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-forest-900 p-10 text-white md:flex">
          <div className="flex items-center gap-3"><span className="rounded-2xl bg-white/10 p-3"><HeartPulse size={28} /></span><span className="text-xl font-extrabold">Klinik Sehat Sentosa</span></div>
          <div><p className="mb-3 text-sm font-bold uppercase tracking-[.2em] text-mint">Layanan lebih dekat</p><h1 className="text-4xl font-black leading-tight">Sehat Anda, perhatian kami.</h1><p className="mt-4 text-lg leading-relaxed text-emerald-100">Kelola jadwal, kunjungan, dan layanan klinik dalam satu tempat.</p></div>
          <p className="text-sm text-emerald-100/70">Pelayanan yang hangat dan terpercaya</p>
        </div>
        <div className="p-7 sm:p-10">
          <div className="mb-7 flex items-center gap-3 md:hidden"><span className="rounded-xl bg-forest-50 p-2 text-forest-700"><HeartPulse /></span><span className="font-extrabold">Klinik Sehat Sentosa</span></div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[.17em] text-forest-500">{registering ? 'Pendaftaran pasien' : 'Selamat datang'}</p>
          <h2 className="mb-6 text-3xl font-black text-forest-900">{registering ? 'Buat akun pasien' : 'Masuk ke akun Anda'}</h2>
          <Notice message={message} onClose={() => setMessage('')} />
          <form onSubmit={submit} className="space-y-4">
            {registering && <>
              <Field label="Nama lengkap"><input className="form-control" value={form.nama} onChange={update('nama')} required /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="NIK"><input className="form-control" inputMode="numeric" maxLength="16" value={form.nik} onChange={update('nik')} required /></Field>
                <Field label="Tanggal lahir"><input className="form-control" type="date" value={form.tanggal_lahir} onChange={update('tanggal_lahir')} required /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jenis kelamin"><select className="form-control" value={form.jenis_kelamin} onChange={update('jenis_kelamin')}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></Field>
                <Field label="Nomor telepon"><input className="form-control" value={form.no_hp} onChange={update('no_hp')} required /></Field>
              </div>
              <Field label="Alamat"><textarea className="form-control min-h-20" value={form.alamat} onChange={update('alamat')} required /></Field>
            </>}
            <Field label="Alamat email"><input className="form-control" type="email" autoComplete="email" value={form.email} onChange={update('email')} required /></Field>
            <Field label="Kata sandi"><input className="form-control" type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} value={form.password} onChange={update('password')} required /></Field>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Memproses…' : registering ? 'Daftar sebagai pasien' : 'Masuk'}</Button>
          </form>
          <p className="mt-5 text-center text-base text-slate-600">{registering ? 'Sudah punya akun?' : 'Belum punya akun pasien?'}{' '}
            <button className="font-bold text-forest-700 hover:underline" onClick={() => { setRegistering(!registering); setMessage(''); }}>
              {registering ? 'Masuk' : 'Daftar di sini'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('klinik-session') || 'null'); } catch { return null; }
  });
  const [user, setUser] = useState(session?.user || null);
  const [token, setToken] = useState(session?.token || '');
  const [view, setView] = useState('beranda');
  const [data, setData] = useState({ dashboard: {}, appointments: [], visits: [], doctors: [], patients: [], medicines: [], invoices: [] });
  const [message, setMessage] = useState('');
  const [noticeType, setNoticeType] = useState('error');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const notify = (text, type = 'success') => {
    setNoticeType(type);
    setMessage(text);
  };
  const loadData = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const tasks = [
        api('/dashboard', { token }).then((dashboard) => ['dashboard', dashboard]),
        api('/appointments', { token }).then((appointments) => ['appointments', appointments]),
        api('/visits', { token }).then((visits) => ['visits', visits]),
      ];
      if (['pasien', 'resepsionis'].includes(user.role)) tasks.push(api('/doctors', { token }).then((doctors) => ['doctors', doctors]));
      if (user.role === 'resepsionis') tasks.push(api('/patients', { token }).then((patients) => ['patients', patients]));
      if (user.role === 'dokter') tasks.push(api('/medicines', { token }).then((medicines) => ['medicines', medicines]));
      if (['kasir', 'resepsionis', 'pasien'].includes(user.role)) tasks.push(api('/invoices', { token }).then((invoices) => ['invoices', invoices]));
      const results = await Promise.all(tasks);
      setData((current) => Object.fromEntries([...Object.entries(current), ...results]));
    } catch (error) {
      if (/sesi tidak valid|masuk terlebih dahulu/i.test(error.message)) signOut();
      else notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!token) return;
    api('/auth/me', { token }).then((account) => setUser(account)).catch(() => signOut());
  }, [token]);
  useEffect(() => { loadData(); }, [loadData]);

  function signOut() {
    localStorage.removeItem('klinik-session');
    setToken('');
    setUser(null);
    setData({ dashboard: {}, appointments: [], visits: [], doctors: [], patients: [], medicines: [], invoices: [] });
    setView('beranda');
  }
  function onLogin(result) {
    localStorage.setItem('klinik-session', JSON.stringify(result));
    setToken(result.token);
    setUser(result.user);
    setMessage('');
    setView('beranda');
  }
  async function mutate(path, method, body, success) {
    try {
      await api(path, { token, method, body: body === undefined ? undefined : JSON.stringify(body) });
      notify(success);
      await loadData();
      return true;
    } catch (error) {
      notify(error.message, 'error');
      return false;
    }
  }

  const nav = useMemo(() => {
    const items = [{ id: 'beranda', label: 'Beranda', icon: Activity }];
    if (['pasien', 'resepsionis'].includes(user?.role)) items.push({ id: 'booking', label: 'Booking', icon: CalendarDays });
    if (['resepsionis', 'perawat', 'dokter', 'pasien', 'admin'].includes(user?.role)) items.push({ id: 'kunjungan', label: 'Kunjungan', icon: ClipboardList });
    if (['kasir', 'resepsionis', 'pasien', 'admin'].includes(user?.role)) items.push({ id: 'tagihan', label: 'Tagihan', icon: CreditCard });
    if (['dokter', 'resepsionis', 'admin'].includes(user?.role)) items.push({ id: 'obat', label: 'Stok obat', icon: Pill });
    return items;
  }, [user?.role]);

  if (!token || !user) return <Login onLogin={onLogin} message={message} setMessage={setMessage} />;

  const filteredVisits = data.visits.filter((visit) => `${visit.nama_pasien} ${visit.no_rm} ${visit.no_registrasi} ${visit.status_kunjungan}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-[#f4f8f5]">
      <aside className={`no-print fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col bg-forest-900 px-5 py-6 text-white transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3"><span className="rounded-2xl bg-white/10 p-3"><HeartPulse size={25} /></span><div><p className="font-extrabold">Klinik Sehat</p><p className="text-xs text-emerald-100/70">Sentosa</p></div></div>
          <button className="lg:hidden" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        <div className="my-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-mint">Ruang kerja</p><p className="mt-1 text-lg font-extrabold">{roleNames[user.role] || user.role}</p>
        </div>
        <nav className="space-y-2" aria-label="Navigasi utama">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition ${view === id ? 'bg-mint text-forest-900' : 'text-emerald-50 hover:bg-white/10'}`}><Icon size={20} />{label}</button>)}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/5 p-4 text-sm leading-relaxed text-emerald-100/80">Data pelayanan Anda ditampilkan sesuai hak akses akun.</div>
      </aside>
      {menuOpen && <button className="no-print fixed inset-0 z-20 bg-black/40 lg:hidden" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />}
      <div className="min-h-screen lg:pl-[280px]">
        <header className="no-print sticky top-0 z-10 flex min-h-[82px] items-center justify-between border-b border-emerald-900/5 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><button className="rounded-lg p-2 lg:hidden" aria-label="Buka menu" onClick={() => setMenuOpen(true)}><Menu /></button><div><p className="text-sm font-bold text-forest-500">SISTEM INFORMASI KLINIK</p><h1 className="text-xl font-black text-forest-900 md:text-2xl">{nav.find((item) => item.id === view)?.label || 'Beranda'}</h1></div></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="font-bold text-forest-900">{user.nama}</p><p className="text-sm text-slate-500">{roleNames[user.role]}</p></div><button onClick={signOut} className="btn-secondary !px-3" title="Keluar"><LogOut size={18} /><span className="hidden sm:inline">Keluar</span></button></div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-8">
          <Notice message={message} type={noticeType} onClose={() => setMessage('')} />
          {view === 'beranda' && <Dashboard user={user} data={data} onNavigate={setView} />}
          {view === 'booking' && <Booking user={user} data={data} onSubmit={(body) => mutate('/appointments', 'POST', body, 'Booking berhasil disimpan.')} onPatient={(body) => mutate('/patients', 'POST', body, 'Data pasien berhasil ditambahkan.')} onStatus={(id, status) => mutate(`/appointments/${id}/status`, 'PATCH', { status }, 'Status booking diperbarui.')} />}
          {view === 'kunjungan' && <section>
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-black text-forest-900">Daftar kunjungan</h2><p className="mt-1 text-slate-600">Pantau antrean dan catatan pelayanan pasien.</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="form-control pl-10" placeholder="Cari pasien atau nomor RM" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
            {loading ? <Loading /> : <div className="space-y-4">{filteredVisits.map((visit) => <VisitCard key={visit.id_rm} visit={visit} role={user.role} medicines={data.medicines} onSubmit={(path, method, body, text) => mutate(path, method, body, text)} />)}{!filteredVisits.length && <Empty title="Belum ada kunjungan" text="Kunjungan pasien akan muncul di halaman ini." />}</div>}
          </section>}
          {view === 'tagihan' && <Invoices data={data} role={user.role} token={token} selected={selectedInvoice} setSelected={setSelectedInvoice} onPay={(id, body) => mutate(`/invoices/${id}/payments`, 'POST', body, 'Pembayaran berhasil dicatat.')} />}
          {view === 'obat' && <MedicineList medicines={data.medicines} />}
        </main>
        <footer className="no-print px-8 pb-8 text-center text-sm text-slate-500">Klinik Sehat Sentosa · Melayani dengan sepenuh hati</footer>
      </div>
    </div>
  );
}

function Dashboard({ user, data, onNavigate }) {
  const cards = [
    { title: 'Kunjungan hari ini', value: data.dashboard.kunjungan_hari_ini ?? '—', icon: Users, color: 'bg-blue-50 text-blue-700', action: 'kunjungan' },
    { title: 'Antrean aktif', value: data.dashboard.antrean_aktif ?? '—', icon: Activity, color: 'bg-amber-50 text-amber-700', action: 'kunjungan' },
  ];
  if (['pasien', 'resepsionis', 'kasir', 'admin'].includes(user.role)) cards.push({ title: user.role === 'pasien' ? 'Tagihan Anda' : 'Tagihan belum lunas', value: data.dashboard.tagihan_belum_lunas ?? '—', icon: CreditCard, color: 'bg-rose-50 text-rose-700', action: 'tagihan' });
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-forest-900 to-forest-700 p-7 text-white shadow-card md:p-10">
      <div className="relative z-[1] max-w-2xl"><p className="mb-2 font-bold text-mint">Halo, {user.nama.split(' ')[0]} 👋</p><h2 className="text-3xl font-black leading-tight md:text-4xl">Semoga hari Anda sehat dan nyaman.</h2><p className="mt-3 max-w-xl text-lg text-emerald-50/85">Semua kebutuhan pelayanan klinik Anda bisa dipantau dengan mudah di sini.</p>
        {['pasien', 'resepsionis'].includes(user.role) && <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-extrabold text-forest-900" onClick={() => onNavigate('booking')}>Buat booking <ArrowRight size={18} /></button>}
      </div><HeartPulse className="absolute -bottom-9 -right-4 hidden text-white/10 md:block" size={230} strokeWidth={1} />
    </section>
    <div className="grid gap-4 md:grid-cols-3">{cards.map(({ title, value, icon: Icon, color, action }) => <button key={title} onClick={() => onNavigate(action)} className="rounded-2xl border border-emerald-900/5 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5"><span className={`inline-flex rounded-xl p-3 ${color}`}><Icon size={22} /></span><p className="mt-4 text-slate-500">{title}</p><p className="mt-1 text-3xl font-black text-forest-900">{value}</p></button>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl bg-white p-6 shadow-card"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-forest-50 p-3 text-forest-700"><ShieldCheck /></span><div><h3 className="text-xl font-extrabold text-forest-900">Pelayanan teratur</h3><p className="text-slate-500">Alur layanan terhubung dari pendaftaran hingga pembayaran.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{[['Booking dan penerimaan', 'Jadwal serta status antrean pasien'], ['Pemeriksaan', 'Triase dan catatan dokter tersimpan'], ['Resep obat', 'Obat dan stok tercatat bersama'], ['Pembayaran', 'Rincian tagihan dan bukti transaksi']].map(([title, text]) => <div key={title} className="rounded-xl bg-forest-50/70 p-4"><p className="font-extrabold text-forest-900">{title}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p></div>)}</div></div>
      <div className="rounded-2xl bg-white p-6 shadow-card"><div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-3 text-amber-700"><BadgeCheck /></span><h3 className="text-xl font-extrabold text-forest-900">Peran Anda</h3></div><p className="text-2xl font-black text-forest-700">{roleNames[user.role]}</p><p className="mt-2 leading-relaxed text-slate-600">{user.role === 'pasien' ? `Nomor rekam medis: ${user.no_rm || 'tersedia setelah pendaftaran'}. Anda dapat mengatur booking dan melihat tagihan.` : 'Gunakan menu di samping untuk mengakses alur pelayanan sesuai tanggung jawab Anda.'}</p></div>
    </div>
  </div>;
}

function Booking({ user, data, onSubmit, onPatient, onStatus }) {
  const [form, setForm] = useState({ id_pasien: '', id_dokter: '', tanggal: '', jam: '', catatan: '' });
  const [newPatient, setNewPatient] = useState({ nik: '', nama_pasien: '', tanggal_lahir: '', jenis_kelamin: 'L', no_hp: '', alamat: '' });
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const change = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const changePatient = (key) => (event) => setNewPatient((value) => ({ ...value, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const saved = await onSubmit({ ...form, id_pasien: form.id_pasien ? Number(form.id_pasien) : undefined, id_dokter: Number(form.id_dokter) });
    setBusy(false);
    if (saved) setForm({ id_pasien: '', id_dokter: '', tanggal: '', jam: '', catatan: '' });
  }
  async function submitPatient(event) {
    event.preventDefault();
    setBusy(true);
    const saved = await onPatient(newPatient);
    setBusy(false);
    if (saved) {
      setNewPatient({ nik: '', nama_pasien: '', tanggal_lahir: '', jenis_kelamin: 'L', no_hp: '', alamat: '' });
      setShowPatientForm(false);
    }
  }
  return <div className="grid items-start gap-6 xl:grid-cols-[.8fr_1.2fr]">
    <section className="rounded-2xl bg-white p-6 shadow-card">
      {user.role === 'resepsionis' && <div className="mb-5">
        <button className="mb-3 inline-flex items-center gap-2 font-extrabold text-forest-700" onClick={() => setShowPatientForm(!showPatientForm)}><Plus size={18} />Daftarkan pasien baru</button>
        {showPatientForm && <form onSubmit={submitPatient} className="mb-6 space-y-3 rounded-xl bg-forest-50 p-4">
          <h3 className="font-extrabold text-forest-900">Data pasien baru</h3>
          <Field label="Nama lengkap"><input className="form-control" value={newPatient.nama_pasien} onChange={changePatient('nama_pasien')} required /></Field>
          <Field label="NIK"><input className="form-control" maxLength="16" inputMode="numeric" value={newPatient.nik} onChange={changePatient('nik')} required /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Tanggal lahir"><input className="form-control" type="date" value={newPatient.tanggal_lahir} onChange={changePatient('tanggal_lahir')} required /></Field><Field label="Jenis kelamin"><select className="form-control" value={newPatient.jenis_kelamin} onChange={changePatient('jenis_kelamin')}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></Field></div>
          <Field label="Nomor telepon"><input className="form-control" value={newPatient.no_hp} onChange={changePatient('no_hp')} required /></Field>
          <Field label="Alamat"><textarea className="form-control min-h-20" value={newPatient.alamat} onChange={changePatient('alamat')} required /></Field>
          <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan data pasien'}</Button>
        </form>}
      </div>}
      <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-forest-50 p-3 text-forest-700"><CalendarDays /></span><div><h2 className="text-xl font-black text-forest-900">{user.role === 'pasien' ? 'Booking konsultasi' : 'Buat booking pasien'}</h2><p className="text-sm text-slate-500">Pilih dokter dan waktu kunjungan.</p></div></div>
      <form className="space-y-4" onSubmit={submit}>
        {user.role === 'resepsionis' && <Field label="Pasien"><select className="form-control" value={form.id_pasien} onChange={change('id_pasien')} required><option value="">Pilih pasien</option>{data.patients.map((p) => <option key={p.id_pasien} value={p.id_pasien}>{p.nama_pasien} · {p.no_rm}</option>)}</select></Field>}
        <Field label="Dokter"><select className="form-control" value={form.id_dokter} onChange={change('id_dokter')} required><option value="">Pilih dokter</option>{data.doctors.map((d) => <option key={d.id_dokter} value={d.id_dokter}>{d.nama_dokter} · {currency.format(d.tarif_konsultasi)}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Tanggal"><input className="form-control" type="date" min={new Date().toISOString().slice(0, 10)} value={form.tanggal} onChange={change('tanggal')} required /></Field><Field label="Jam"><input className="form-control" type="time" value={form.jam} onChange={change('jam')} required /></Field></div>
        <Field label="Catatan (opsional)"><textarea className="form-control min-h-20" placeholder="Tuliskan kebutuhan atau catatan singkat" value={form.catatan} onChange={change('catatan')} /></Field>
        <Button type="submit" disabled={busy} className="w-full"><Plus size={18} />{busy ? 'Menyimpan…' : 'Simpan booking'}</Button>
      </form>
    </section>
    <section><div className="mb-4"><h2 className="text-2xl font-black text-forest-900">Daftar booking</h2><p className="text-slate-600">Periksa jadwal dan status kunjungan.</p></div>
      <div className="space-y-3">{data.appointments.map((booking) => <article key={booking.id_booking} className="rounded-2xl bg-white p-5 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold text-forest-900">{booking.nama_pasien}</p><p className="text-sm text-slate-500">{booking.no_rm} · {booking.nama_dokter}</p></div><Status value={booking.status} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays size={16} />{displayDate(booking.tanggal)} · {String(booking.jam).slice(0, 5)}</span>
          {user.role === 'resepsionis' && booking.status === 'Menunggu' && <div className="flex gap-2"><Button onClick={() => onStatus(booking.id_booking, 'Dikonfirmasi')}><Check size={16} />Terima</Button><Button variant="secondary" onClick={() => onStatus(booking.id_booking, 'Dibatalkan')}>Batalkan</Button></div>}
          {booking.no_registrasi && <span className="font-bold text-forest-700">Reg. {booking.no_registrasi}</span>}
        </div></article>)}{!data.appointments.length && <Empty title="Belum ada booking" text="Jadwal booking akan terlihat di sini." />}</div>
    </section>
  </div>;
}

function VisitCard({ visit, role, medicines, onSubmit }) {
  const [triage, setTriage] = useState({ keluhan_utama: visit.keluhan_utama || '', sistole: visit.sistole || '', diastole: visit.diastole || '', suhu_tubuh: visit.suhu_tubuh || '', berat_badan: visit.berat_badan || '' });
  const [exam, setExam] = useState({ diagnosis: visit.diagnosis || '', tindakan: visit.tindakan || '' });
  const [prescriptions, setPrescriptions] = useState([{ id_obat: '', jumlah: '1', aturan_pakai: '' }]);
  const [busy, setBusy] = useState(false);
  const active = !['Selesai', 'Batal'].includes(visit.status_kunjungan);
  async function submit(event, path, body, message) {
    event.preventDefault();
    setBusy(true);
    await onSubmit(path, 'PATCH', body, message);
    setBusy(false);
  }
  return <article className="rounded-2xl bg-white p-5 shadow-card md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-black text-forest-900">{visit.nama_pasien}</p><p className="text-sm text-slate-500">{visit.no_rm} · {visit.no_registrasi} · {displayDate(visit.tgl_periksa)}</p></div><Status value={visit.status_kunjungan} /></div>
    <div className="mt-4 grid gap-2 rounded-xl bg-forest-50/70 p-4 sm:grid-cols-3"><p><span className="text-sm text-slate-500">Dokter</span><br /><b>{visit.nama_dokter || 'Belum ditetapkan'}</b></p><p><span className="text-sm text-slate-500">Tensi</span><br /><b>{visit.sistole ? `${visit.sistole}/${visit.diastole} mmHg` : 'Belum dicatat'}</b></p><p><span className="text-sm text-slate-500">Keluhan</span><br /><b>{visit.keluhan_utama || 'Belum dicatat'}</b></p></div>
    {role === 'perawat' && active && <form onSubmit={(event) => submit(event, `/visits/${visit.id_rm}/triage`, triage, 'Data triase berhasil disimpan.')} className="mt-5 border-t border-slate-100 pt-5"><h3 className="mb-4 font-extrabold text-forest-900">Catat triase dan tanda vital</h3><div className="grid gap-4 md:grid-cols-2"><Field label="Keluhan utama"><textarea className="form-control min-h-20" value={triage.keluhan_utama} onChange={(e) => setTriage({ ...triage, keluhan_utama: e.target.value })} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Sistole (mmHg)"><input className="form-control" type="number" min="1" value={triage.sistole} onChange={(e) => setTriage({ ...triage, sistole: e.target.value })} required /></Field><Field label="Diastole (mmHg)"><input className="form-control" type="number" min="1" value={triage.diastole} onChange={(e) => setTriage({ ...triage, diastole: e.target.value })} required /></Field><Field label="Suhu (°C)"><input className="form-control" type="number" step=".1" value={triage.suhu_tubuh} onChange={(e) => setTriage({ ...triage, suhu_tubuh: e.target.value })} /></Field><Field label="Berat badan (kg)"><input className="form-control" type="number" step=".1" value={triage.berat_badan} onChange={(e) => setTriage({ ...triage, berat_badan: e.target.value })} /></Field></div></div><div className="mt-4"><Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan data triase'}</Button></div></form>}
    {role === 'dokter' && active && <form onSubmit={(event) => submit(event, `/visits/${visit.id_rm}/examination`, { ...exam, resep: prescriptions.filter((p) => p.id_obat && p.jumlah && p.aturan_pakai) }, 'Pemeriksaan berhasil disimpan dan tagihan dibuat.')} className="mt-5 border-t border-slate-100 pt-5"><h3 className="mb-4 font-extrabold text-forest-900">Hasil pemeriksaan</h3><div className="grid gap-4 md:grid-cols-2"><Field label="Diagnosis"><textarea className="form-control min-h-20" value={exam.diagnosis} onChange={(e) => setExam({ ...exam, diagnosis: e.target.value })} required /></Field><Field label="Tindakan dan edukasi"><textarea className="form-control min-h-20" value={exam.tindakan} onChange={(e) => setExam({ ...exam, tindakan: e.target.value })} required /></Field></div><div className="mt-5"><div className="mb-3 flex items-center justify-between"><h4 className="font-extrabold text-forest-900">Resep obat</h4><Button variant="secondary" type="button" onClick={() => setPrescriptions([...prescriptions, { id_obat: '', jumlah: '1', aturan_pakai: '' }])}><Plus size={16} />Tambah obat</Button></div>{prescriptions.map((item, index) => <div key={index} className="mb-3 grid gap-3 rounded-xl bg-forest-50/70 p-3 md:grid-cols-[1.3fr_.5fr_1fr_auto]"><Field label="Nama obat"><select className="form-control" value={item.id_obat} onChange={(e) => setPrescriptions(prescriptions.map((p, i) => i === index ? { ...p, id_obat: e.target.value } : p))}><option value="">Pilih obat</option>{medicines.filter((m) => m.stok > 0).map((med) => <option key={med.id_obat} value={med.id_obat}>{med.nama_obat} · stok {med.stok}</option>)}</select></Field><Field label="Jumlah"><input className="form-control" type="number" min="1" value={item.jumlah} onChange={(e) => setPrescriptions(prescriptions.map((p, i) => i === index ? { ...p, jumlah: e.target.value } : p))} /></Field><Field label="Aturan pakai"><input className="form-control" placeholder="Contoh: 3x1 sesudah makan" value={item.aturan_pakai} onChange={(e) => setPrescriptions(prescriptions.map((p, i) => i === index ? { ...p, aturan_pakai: e.target.value } : p))} /></Field>{prescriptions.length > 1 && <button type="button" aria-label="Hapus obat dari resep" className="mt-7 rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== index))}><X size={20} /></button>}</div>)}</div><Button type="submit" disabled={busy} className="mt-2">{busy ? 'Menyimpan…' : 'Simpan pemeriksaan'}</Button></form>}
    {['pasien', 'resepsionis', 'kasir', 'admin'].includes(role) && (visit.diagnosis || visit.tindakan) && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"><p><span className="text-sm text-slate-500">Diagnosis</span><br />{visit.diagnosis || '—'}</p><p><span className="text-sm text-slate-500">Tindakan</span><br />{visit.tindakan || '—'}</p></div>}
  </article>;
}

function Invoices({ data, role, token, selected, setSelected, onPay }) {
  const [form, setForm] = useState({ nominal: '', metode: 'Tunai' });
  const [busy, setBusy] = useState(false);
  async function open(id) {
    try { setSelected(await api(`/invoices/${id}`, { token })); } catch (error) { window.alert(error.message); }
  }
  async function submit(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    const paid = await onPay(selected.id_invoice, { ...form, nominal: Number(form.nominal) });
    setBusy(false);
    if (paid) {
      setForm({ nominal: '', metode: 'Tunai' });
      setSelected(null);
    }
  }
  return <section><div className="mb-5"><h2 className="text-2xl font-black text-forest-900">Tagihan dan pembayaran</h2><p className="text-slate-600">Rincian biaya pemeriksaan dan obat pasien.</p></div>
    <div className="grid gap-4 lg:grid-cols-2">{data.invoices.map((invoice) => <article key={invoice.id_invoice} className="rounded-2xl bg-white p-5 shadow-card"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-black text-forest-900">{invoice.nama_pasien}</p><p className="text-sm text-slate-500">{invoice.no_rm} · {invoice.no_registrasi}</p></div><Status value={invoice.status} /></div><div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4"><div><p className="text-sm text-slate-500">Total tagihan</p><p className="text-xl font-black text-forest-800">{currency.format(invoice.total)}</p><p className="mt-1 text-xs text-slate-500">Dibayar {currency.format(invoice.sudah_dibayar)}</p></div><Button variant="secondary" onClick={() => open(invoice.id_invoice)}>Rincian</Button></div></article>)}{!data.invoices.length && <Empty title="Belum ada tagihan" text="Tagihan akan muncul setelah pemeriksaan dokter selesai." />}</div>
    {selected && <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-forest-900/50 p-4" role="dialog" aria-modal="true" aria-label="Rincian tagihan"><div className="print-card my-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-forest-500">Klinik Sehat Sentosa</p><h3 className="mt-1 text-2xl font-black text-forest-900">Rincian tagihan</h3><p className="text-slate-600">{selected.nama_pasien} · {selected.no_rm} · {selected.no_registrasi}</p></div><button className="no-print rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup rincian" onClick={() => setSelected(null)}><X /></button></div>
      <div className="divide-y divide-slate-100 border-y border-slate-100">{selected.items?.map((item) => <div className="flex justify-between gap-3 py-3" key={item.id_item}><div><p className="font-bold">{item.deskripsi}</p><p className="text-sm text-slate-500">{item.jumlah} × {currency.format(item.harga_satuan)}</p></div><p className="font-bold">{currency.format(item.jumlah * item.harga_satuan)}</p></div>)}</div>
      <div className="flex justify-between py-4 text-xl font-black text-forest-900"><span>Total</span><span>{currency.format(selected.total)}</span></div>
      {selected.payments?.length > 0 && <div className="mb-4 rounded-xl bg-forest-50 p-4"><p className="mb-2 font-extrabold">Riwayat pembayaran</p>{selected.payments.map((payment, index) => <p key={index} className="text-sm">{displayDate(payment.dibayar_pada)} · {payment.metode} · {currency.format(payment.nominal)}</p>)}</div>}
      {role === 'kasir' && selected.status !== 'Lunas' && <form className="no-print space-y-3 border-t border-slate-100 pt-4" onSubmit={submit}><p className="font-extrabold">Catat pembayaran</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Nominal pembayaran"><input className="form-control" type="number" min="1" max={selected.total} value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} required /></Field><Field label="Metode"><select className="form-control" value={form.metode} onChange={(e) => setForm({ ...form, metode: e.target.value })}>{['Tunai', 'Transfer', 'QRIS', 'Kartu'].map((method) => <option key={method}>{method}</option>)}</select></Field></div><Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan pembayaran'}</Button></form>}
      <div className="no-print mt-5 flex justify-end"><Button variant="secondary" onClick={() => window.print()}><Printer size={17} />Cetak bukti</Button></div>
    </div></div>}
  </section>;
}

function MedicineList({ medicines }) {
  return <section><div className="mb-5"><h2 className="text-2xl font-black text-forest-900">Persediaan obat</h2><p className="text-slate-600">Informasi stok yang tersedia untuk resep dokter.</p></div><div className="overflow-hidden rounded-2xl bg-white shadow-card"><div className="hidden grid-cols-[1fr_1.5fr_.7fr_.8fr_.5fr] gap-4 bg-forest-50 px-5 py-3 text-sm font-extrabold text-forest-800 md:grid"><span>Kode</span><span>Nama obat</span><span>Satuan</span><span>Harga</span><span>Stok</span></div>{medicines.map((medicine) => <div key={medicine.id_obat} className="grid gap-2 border-t border-slate-100 px-5 py-4 md:grid-cols-[1fr_1.5fr_.7fr_.8fr_.5fr] md:items-center md:gap-4"><span className="text-sm text-slate-500">{medicine.kode_obat}</span><b className="text-forest-900">{medicine.nama_obat}</b><span>{medicine.satuan}</span><span>{currency.format(medicine.harga_jual)}</span><span className={`font-extrabold ${medicine.stok <= 15 ? 'text-rose-600' : 'text-forest-700'}`}>{medicine.stok}</span></div>)}{!medicines.length && <Empty title="Data obat belum tersedia" text="Daftar obat akan ditampilkan setelah tersedia." />}</div></section>;
}

function Status({ value }) {
  const done = ['Dikonfirmasi', 'Selesai', 'Lunas'].includes(value);
  const warn = ['Menunggu', 'Triase', 'Pemeriksaan', 'Belum Lunas'].includes(value);
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-extrabold ${done ? 'bg-emerald-100 text-emerald-800' : warn ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{value || '—'}</span>;
}

function Empty({ title, text }) {
  return <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-white px-6 py-10 text-center"><div className="mx-auto mb-3 inline-flex rounded-2xl bg-forest-50 p-3 text-forest-700"><ClipboardList /></div><p className="font-extrabold text-forest-900">{title}</p><p className="mt-1 text-slate-500">{text}</p></div>;
}

function Loading() {
  return <div className="rounded-2xl bg-white px-5 py-10 text-center font-bold text-forest-700">Memuat data pelayanan…</div>;
}

export default App;
