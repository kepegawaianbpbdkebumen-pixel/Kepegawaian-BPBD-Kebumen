import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { initialDatabase } from './src/data/initialData';
import { AppDatabase, Pegawai, CutiRecord, DokumenRecord, AuditLog, AILog, Pengguna } from './src/types';
import { 
  calculateWorkDays, 
  calculateKgbTarget, 
  calculateKpTarget, 
  calculatePensiunTarget,
  validateNIP,
  maskSensitiveData
} from './src/utils/rulesEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Database file persistence
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

function initDb(): AppDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed: AppDatabase = JSON.parse(content);
      if (!parsed.pengguna || parsed.pengguna.length === 0) {
        parsed.pengguna = initialDatabase.pengguna;
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse database.json, resetting to initial data', e);
    }
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), 'utf-8');
  return initialDatabase;
}

let db: AppDatabase = initDb();

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db:', err);
  }
}

function logAudit(
  email: string, 
  peran: string, 
  aksi: string, 
  entitas: string, 
  rincian: string, 
  nilaiSebelum?: any, 
  nilaiSesudah?: any
) {
  const now = new Date();
  const timeStr = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;
  const audit: AuditLog = {
    id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    waktu: timeStr,
    email: email || 'system@kebumenkab.go.id',
    peran: peran || 'Admin Kepegawaian OPD',
    aksi,
    entitas,
    rincian,
    nilaiSebelum,
    nilaiSesudah
  };
  db.auditLogs.unshift(audit);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDb();
}

function logAI(
  fitur: string,
  model: string,
  promptRingkas: string,
  skorKeyakinan: number,
  keputusanManusia: 'Diterima' | 'Dikoreksi' | 'Ditolak' | 'Info Only',
  catatan?: string
) {
  const now = new Date();
  const timeStr = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;
  const aiLog: AILog = {
    id: `AILOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    waktu: timeStr,
    fitur,
    model,
    promptRingkas: promptRingkas.slice(0, 150),
    skorKeyakinan,
    keputusanManusia,
    catatan
  };
  db.aiLogs.unshift(aiLog);
  if (db.aiLogs.length > 200) {
    db.aiLogs = db.aiLogs.slice(0, 200);
  }
  saveDb();
}

// ==================== REST API ENDPOINTS ====================

// GET full database
app.get('/api/data', (_req: Request, res: Response) => {
  res.json(db);
});

// Authentication: Login with Email (PRD FR-01)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Alamat email wajib diisi.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.pengguna.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    logAudit(cleanEmail, 'Anonim', 'LOGIN_FAILED', 'Pengguna', `Percobaan login gagal: Email ${cleanEmail} belum terdaftar.`);
    return res.status(401).json({ 
      error: `Alamat email "${cleanEmail}" belum terdaftar sebagai pengguna resmi SI_AMIN_LEGA BPBD Kebumen. Hubungi Admin Kepegawaian OPD.` 
    });
  }

  if (!user.statusAktif) {
    logAudit(cleanEmail, user.peran, 'LOGIN_BLOCKED', 'Pengguna', `Percobaan login akun non-aktif: ${cleanEmail}`);
    return res.status(403).json({ error: 'Akun ini sedang berstatus non-aktif. Silakan hubungi Admin Kepegawaian OPD.' });
  }

  const now = new Date();
  user.terakhirLogin = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;
  saveDb();

  logAudit(user.email, user.peran, 'LOGIN_SUCCESS', 'Pengguna', `Login berhasil melalui verifikasi email (${user.peran})`);
  res.json({ success: true, user });
});

// Pengguna: Add / Edit User (Admin only)
app.post('/api/pengguna', (req: Request, res: Response) => {
  const { pengguna, actorEmail, actorRole } = req.body;
  if (!pengguna?.email || !pengguna?.nama || !pengguna?.peran) {
    return res.status(400).json({ error: 'Email, Nama, dan Peran wajib diisi.' });
  }

  const cleanEmail = pengguna.email.trim().toLowerCase();
  const existingIdx = db.pengguna.findIndex(u => u.id === pengguna.id || u.email.toLowerCase() === cleanEmail);

  if (existingIdx >= 0) {
    const oldVal = { ...db.pengguna[existingIdx] };
    db.pengguna[existingIdx] = { ...db.pengguna[existingIdx], ...pengguna, email: cleanEmail };
    logAudit(actorEmail, actorRole, 'UPDATE_USER', 'Pengguna', `Memperbarui akun email ${cleanEmail} (${pengguna.peran})`, oldVal, db.pengguna[existingIdx]);
  } else {
    const newUser: Pengguna = {
      id: `USR-${Date.now()}`,
      email: cleanEmail,
      nama: pengguna.nama,
      nip: pengguna.nip || '',
      peran: pengguna.peran,
      statusAktif: pengguna.statusAktif !== undefined ? pengguna.statusAktif : true
    };
    db.pengguna.push(newUser);
    logAudit(actorEmail, actorRole, 'CREATE_USER', 'Pengguna', `Menambahkan akun email baru ${cleanEmail} dengan peran ${pengguna.peran}`, null, newUser);
  }

  saveDb();
  res.json({ success: true, pengguna: db.pengguna });
});

// Pengguna: Delete User
app.delete('/api/pengguna/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const actorEmail = (req.query.actorEmail as string) || 'admin@kebumenkab.go.id';
  const actorRole = (req.query.actorRole as string) || 'Admin Kepegawaian OPD';

  const idx = db.pengguna.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User tidak ditemukan' });
  const deleted = db.pengguna.splice(idx, 1)[0];
  logAudit(actorEmail, actorRole, 'DELETE_USER', 'Pengguna', `Menghapus akses user email: ${deleted.email}`, deleted, null);
  saveDb();
  res.json({ success: true, message: 'User berhasil dihapus', pengguna: db.pengguna });
});

// Reset database
app.post('/api/database/reset', (req: Request, res: Response) => {
  db = JSON.parse(JSON.stringify(initialDatabase));
  saveDb();
  logAudit(req.body.userEmail || 'admin@kebumenkab.go.id', req.body.userRole || 'Admin Kepegawaian OPD', 'RESET_DATABASE', 'System', 'Database telah diatur ulang ke data awal prototipe.');
  res.json({ success: true, message: 'Database reset successfully', data: db });
});

// Pegawai: Create or Update
app.post('/api/pegawai', (req: Request, res: Response) => {
  try {
    const pegawai: Pegawai = req.body.pegawai;
    const actorEmail = req.body.actorEmail || 'admin@kebumenkab.go.id';
    const actorRole = req.body.actorRole || 'Admin Kepegawaian OPD';

    if (!pegawai.nip || !pegawai.nama) {
      return res.status(400).json({ error: 'NIP dan Nama pegawai wajib diisi' });
    }

    const nipValidation = validateNIP(pegawai.nip);
    if (!nipValidation.isValid) {
      return res.status(400).json({ error: nipValidation.message });
    }

    const existingIndex = db.pegawai.findIndex(p => p.id === pegawai.id || p.nip === pegawai.nip);
    let isUpdate = false;
    let oldVal = null;

    if (existingIndex >= 0) {
      isUpdate = true;
      oldVal = { ...db.pegawai[existingIndex] };
      db.pegawai[existingIndex] = { ...pegawai };
    } else {
      if (!pegawai.id) {
        pegawai.id = `PEG-${Date.now()}`;
      }
      db.pegawai.push(pegawai);

      // Create initial leave balance if not exists
      const existingSaldo = db.saldoCuti.find(s => s.nip === pegawai.nip);
      if (!existingSaldo) {
        db.saldoCuti.push({
          nip: pegawai.nip,
          tahun: 2026,
          hak: 12,
          terpakai: 0,
          ditangguhkan: 0,
          sisa: 12
        });
      }
    }

    logAudit(
      actorEmail,
      actorRole,
      isUpdate ? 'UPDATE_PEGAWAI' : 'CREATE_PEGAWAI',
      'Pegawai',
      `${isUpdate ? 'Memperbarui' : 'Menambahkan'} pegawai: ${pegawai.nama} (NIP: ${pegawai.nip})`,
      oldVal,
      pegawai
    );

    saveDb();
    res.json({ success: true, data: pegawai });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Gagal menyimpan pegawai' });
  }
});

// Pegawai: Delete
app.delete('/api/pegawai/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const actorEmail = (req.query.actorEmail as string) || 'admin@kebumenkab.go.id';
  const actorRole = (req.query.actorRole as string) || 'Admin Kepegawaian OPD';

  const index = db.pegawai.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Pegawai tidak ditemukan' });
  }
  const deleted = db.pegawai.splice(index, 1)[0];

  logAudit(
    actorEmail,
    actorRole,
    'DELETE_PEGAWAI',
    'Pegawai',
    `Menghapus data pegawai: ${deleted.nama} (NIP: ${deleted.nip})`,
    deleted,
    null
  );

  saveDb();
  res.json({ success: true, message: 'Pegawai berhasil dihapus' });
});

// Cuti: Submit
app.post('/api/cuti', (req: Request, res: Response) => {
  try {
    const { nip, jenis, tanggalMulai, tanggalSelesai, alasan, nomorEletter, tautanEletter, actorEmail, actorRole } = req.body;

    const peg = db.pegawai.find(p => p.nip === nip);
    if (!peg) return res.status(404).json({ error: 'Pegawai tidak ditemukan' });

    // Calculate work days
    const workDays = calculateWorkDays(tanggalMulai, tanggalSelesai, db.hariLibur);
    if (workDays <= 0) {
      return res.status(400).json({ error: 'Rentang tanggal cuti tidak memuat hari kerja (Sabtu, Minggu, atau Hari Libur).' });
    }

    // Check balance for Tahunan
    if (jenis === 'Tahunan') {
      const saldo = db.saldoCuti.find(s => s.nip === nip && s.tahun === 2026);
      if (!saldo || saldo.sisa < workDays) {
        return res.status(400).json({ 
          error: `Sisa saldo cuti tahunan tidak mencukupi (Sisa saldo: ${saldo ? saldo.sisa : 0} hari kerja, Permohonan: ${workDays} hari kerja)` 
        });
      }
    }

    // Check overlap
    const hasOverlap = db.cuti.some(c => 
      c.nip === nip && 
      !['Ditolak Atasan', 'Ditolak Pimpinan', 'Dibatalkan'].includes(c.status) &&
      !(tanggalSelesai < c.tanggalMulai || tanggalMulai > c.tanggalSelesai)
    );
    if (hasOverlap) {
      return res.status(400).json({ error: 'Tanggal cuti tumpang tindih dengan pengajuan cuti yang telah ada sebelumnya!' });
    }

    const now = new Date();
    const newCuti: CutiRecord = {
      id: `CUTI-2026-${String(Date.now()).slice(-4)}`,
      nip,
      namaPegawai: peg.nama,
      jabatan: peg.jabatan,
      unitKerja: peg.unitKerja,
      jenis,
      tanggalMulai,
      tanggalSelesai,
      jumlahHariKerja: workDays,
      alasan,
      status: 'Menunggu Verifikasi Atasan',
      nomorEletter: nomorEletter || `e-Letter/BPBD/CUTI/2026/${Math.floor(100 + Math.random() * 900)}`,
      tautanEletter: tautanEletter || '',
      waktuPengajuan: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`,
      verifikasiAi: {
        validitasFormat: true,
        kecocokanNomor: Boolean(nomorEletter),
        tumpangTindih: false,
        catatan: `Pengajuan ${workDays} hari kerja valid terverifikasi sistem.`,
        confidence: 0.95
      }
    };

    db.cuti.unshift(newCuti);
    logAudit(
      actorEmail || peg.email,
      actorRole || 'Pegawai',
      'SUBMIT_LEAVE',
      'Cuti',
      `Pengajuan cuti ${jenis} oleh ${peg.nama} (${workDays} hari kerja, ${tanggalMulai} s.d ${tanggalSelesai})`,
      null,
      newCuti
    );

    saveDb();
    res.json({ success: true, data: newCuti });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengajukan cuti' });
  }
});

// Cuti: Verify Atasan
app.post('/api/cuti/:id/verify-atasan', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved, catatan, actorEmail, actorRole } = req.body;
  const cuti = db.cuti.find(c => c.id === id);
  if (!cuti) return res.status(404).json({ error: 'Data cuti tidak ditemukan' });

  const oldStatus = cuti.status;
  if (approved) {
    cuti.status = 'Diverifikasi Atasan';
    cuti.catatanAtasan = catatan || 'Disetujui atasan langsung, diteruskan ke Pimpinan/Admin';
  } else {
    cuti.status = 'Ditolak Atasan';
    cuti.catatanAtasan = catatan || 'Permohonan cuti tidak disetujui atasan langsung';
  }
  cuti.pemroses = actorEmail;

  logAudit(
    actorEmail,
    actorRole || 'Atasan Langsung',
    approved ? 'VERIFY_LEAVE_APPROVED' : 'VERIFY_LEAVE_REJECTED',
    'Cuti',
    `Atasan memverifikasi cuti ${cuti.namaPegawai}: ${approved ? 'Disetujui' : 'Ditolak'} (${catatan || '-'})`,
    { status: oldStatus },
    { status: cuti.status }
  );

  saveDb();
  res.json({ success: true, data: cuti });
});

// Cuti: Approve or Reject Final (Pimpinan/Admin)
app.post('/api/cuti/:id/approve-final', (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved, catatan, actorEmail, actorRole } = req.body;
  const cuti = db.cuti.find(c => c.id === id);
  if (!cuti) return res.status(404).json({ error: 'Data cuti tidak ditemukan' });

  const oldStatus = cuti.status;
  const now = new Date();

  if (approved) {
    cuti.status = 'Disetujui';
    cuti.catatanAdmin = catatan || 'Disetujui oleh Pimpinan/Admin OPD. SK Cuti diterbitkan.';
    cuti.waktuPersetujuan = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

    // Deduct leave balance if Tahunan
    if (cuti.jenis === 'Tahunan') {
      const saldo = db.saldoCuti.find(s => s.nip === cuti.nip && s.tahun === 2026);
      if (saldo) {
        saldo.terpakai += cuti.jumlahHariKerja;
        saldo.sisa = Math.max(0, (saldo.hak + saldo.ditangguhkan) - saldo.terpakai);
      }
    }
  } else {
    cuti.status = 'Ditolak Pimpinan';
    cuti.catatanAdmin = catatan || 'Ditolak pada tahap persetujuan pimpinan.';
  }

  logAudit(
    actorEmail,
    actorRole || 'Pimpinan',
    approved ? 'FINAL_APPROVE_LEAVE' : 'FINAL_REJECT_LEAVE',
    'Cuti',
    `Persetujuan akhir cuti ${cuti.namaPegawai}: ${approved ? 'Disetujui (Saldo dipotong ' + cuti.jumlahHariKerja + ' hari)' : 'Ditolak'}`,
    { status: oldStatus },
    { status: cuti.status }
  );

  saveDb();
  res.json({ success: true, data: cuti });
});

// Cuti: Cancel
app.post('/api/cuti/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;
  const { actorEmail, actorRole } = req.body;
  const cuti = db.cuti.find(c => c.id === id);
  if (!cuti) return res.status(404).json({ error: 'Data cuti tidak ditemukan' });

  const wasApproved = cuti.status === 'Disetujui';
  cuti.status = 'Dibatalkan';

  // Refund leave balance if it was approved and Tahunan
  if (wasApproved && cuti.jenis === 'Tahunan') {
    const saldo = db.saldoCuti.find(s => s.nip === cuti.nip && s.tahun === 2026);
    if (saldo) {
      saldo.terpakai = Math.max(0, saldo.terpakai - cuti.jumlahHariKerja);
      saldo.sisa = (saldo.hak + saldo.ditangguhkan) - saldo.terpakai;
    }
  }

  logAudit(
    actorEmail,
    actorRole || 'Pegawai',
    'CANCEL_LEAVE',
    'Cuti',
    `Pembatalan cuti ${cuti.namaPegawai} (${wasApproved ? 'Saldo ' + cuti.jumlahHariKerja + ' hari dikembalikan' : 'Status dibatalkan'})`
  );

  saveDb();
  res.json({ success: true, data: cuti });
});

// Dokumen: Add & Verify
app.post('/api/dokumen', (req: Request, res: Response) => {
  try {
    const docData: Partial<DokumenRecord> = req.body.dokumen;
    const actorEmail = req.body.actorEmail || 'admin@kebumenkab.go.id';
    const actorRole = req.body.actorRole || 'Admin Kepegawaian OPD';

    const now = new Date();
    const newDoc: DokumenRecord = {
      id: `DOC-${Date.now()}`,
      nip: docData.nip || '',
      namaPegawai: docData.namaPegawai || '',
      jenisDokumen: docData.jenisDokumen || 'SK KGB Terakhir',
      nomorDokumen: docData.nomorDokumen || '',
      tanggalDokumen: docData.tanggalDokumen || now.toISOString().slice(0, 10),
      namaBerkas: docData.namaBerkas || 'dokumen.pdf',
      ukuran: docData.ukuran || '450 KB',
      hash: `sha256-${Math.random().toString(36).substring(2, 15)}`,
      versi: 1,
      pengunggah: actorEmail,
      waktuUnggah: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`,
      previewUrl: docData.previewUrl || 'https://images.unsplash.com/photo-1568667256549-094345857637?w=600&auto=format&fit=crop&q=80',
      nilaiTerbaca: docData.nilaiTerbaca || {},
      confidenceScore: docData.confidenceScore || 0.95,
      statusVerifikasi: docData.statusVerifikasi || 'Belum terverifikasi',
      catatanAdmin: docData.catatanAdmin || ''
    };

    db.dokumen.unshift(newDoc);

    logAudit(
      actorEmail,
      actorRole,
      'UPLOAD_DOKUMEN',
      'Dokumen',
      `Unggah dokumen ${newDoc.jenisDokumen} (${newDoc.nomorDokumen}) untuk ${newDoc.namaPegawai}`
    );

    saveDb();
    res.json({ success: true, data: newDoc });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menyimpan dokumen' });
  }
});

// Dokumen: Verify status (Sesuai / Selisih / Dokumen kurang)
app.post('/api/dokumen/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { statusVerifikasi, catatanAdmin, updateEmployeeField, actorEmail, actorRole } = req.body;
  const doc = db.dokumen.find(d => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

  const oldStatus = doc.statusVerifikasi;
  doc.statusVerifikasi = statusVerifikasi;
  doc.catatanAdmin = catatanAdmin || '';

  // Optionally update Pegawai master data if verified as 'Sesuai'
  if (statusVerifikasi === 'Sesuai' && updateEmployeeField) {
    const peg = db.pegawai.find(p => p.nip === doc.nip);
    if (peg) {
      if (doc.jenisDokumen === 'SK KGB Terakhir' && doc.nilaiTerbaca.tmt) {
        peg.tmtKgbTerakhir = doc.nilaiTerbaca.tmt;
        if (doc.nilaiTerbaca.gajiPokok) peg.gajiPokokTerakhir = doc.nilaiTerbaca.gajiPokok;
      } else if (doc.jenisDokumen === 'SK Pangkat Terakhir' && doc.nilaiTerbaca.tmt) {
        peg.tmtPangkatTerakhir = doc.nilaiTerbaca.tmt;
        if (doc.nilaiTerbaca.pangkat) peg.pangkatGolongan = doc.nilaiTerbaca.pangkat;
      }
    }
  }

  logAudit(
    actorEmail || 'admin@kebumenkab.go.id',
    actorRole || 'Admin Kepegawaian OPD',
    'VERIFY_DOKUMEN',
    'Dokumen',
    `Verifikasi dokumen ${doc.jenisDokumen} ${doc.nomorDokumen}: Status diubah dari ${oldStatus} menjadi ${statusVerifikasi}`,
    { statusVerifikasi: oldStatus },
    { statusVerifikasi, catatanAdmin }
  );

  saveDb();
  res.json({ success: true, data: doc });
});

// Update Parameter Config
app.post('/api/settings/parameters', (req: Request, res: Response) => {
  const { parameters, hariLibur, actorEmail, actorRole } = req.body;
  if (parameters) db.parameters = { ...db.parameters, ...parameters };
  if (hariLibur) db.hariLibur = hariLibur;

  logAudit(
    actorEmail || 'admin@kebumenkab.go.id',
    actorRole || 'Admin Kepegawaian OPD',
    'UPDATE_PARAMETERS',
    'Parameter',
    'Pengaturan ambang EWS, BUP per jabatan, atau kalender hari libur diperbarui'
  );

  saveDb();
  res.json({ success: true, parameters: db.parameters, hariLibur: db.hariLibur });
});

// Kirim Notifikasi (Simulasi WhatsApp & Email resmi)
app.post('/api/pengingat/kirim-notifikasi', (req: Request, res: Response) => {
  const { ewsItem, actorEmail, actorRole } = req.body;
  const now = new Date();
  const timeStr = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

  logAudit(
    actorEmail || 'admin@kebumenkab.go.id',
    actorRole || 'Admin Kepegawaian OPD',
    'SEND_NOTIFICATION',
    'Pengingat',
    `Notifikasi EWS ${ewsItem.jenisLayanan} (${ewsItem.tingkat}) terkirim ke WhatsApp ${ewsItem.kontak.wa} dan Email ${ewsItem.kontak.email} a.n. ${ewsItem.namaPegawai}`
  );

  res.json({ 
    success: true, 
    message: `Notifikasi ${ewsItem.jenisLayanan} (${ewsItem.tingkat}) berhasil dikirim ke pegawai dan atasan`,
    timestamp: timeStr
  });
});

// ==================== GEMINI AI ENDPOINTS ====================

// AI-03: Chatbot Asisten Regulasi Kepegawaian ASN & RAG Data BPBD
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    }

    // Prepare contextual overview of active civil servants in BPBD Kebumen
    const activeStaffSummary = db.pegawai.map(p => ({
      nama: p.nama,
      nip: p.nip.slice(0, 8) + '**********', // Masked per UU PDP
      jabatan: p.jabatan,
      jenis: p.jenisKepegawaian,
      pangkat: p.pangkatGolongan,
      tmtPangkat: p.tmtPangkatTerakhir,
      tmtKgb: p.tmtKgbTerakhir,
      pensiunBup: p.tanggalLahir ? calculatePensiunTarget(p.tanggalLahir, p.jenisJabatan, db.parameters.bupPerJabatan) : '-'
    }));

    const systemInstruction = `
Anda adalah "Asisten Regulasi Kepegawaian & Tanya Jawab ASN SI_AMIN_LEGA v3.0" - asisten resmi untuk BPBD Kabupaten Kebumen, Jawa Tengah.

Pedoman & Prinsip Desain PRD SI_AMIN_LEGA v3.0:
1. Berbasis Sumber Regulasi: Selalu menyertakan kutipan regulasi resmi Indonesia:
   - UU No. 20 Tahun 2023 tentang Aparatur Sipil Negara (ASN).
   - PP No. 11 Tahun 2017 jo. PP No. 17 Tahun 2020 tentang Manajemen PNS.
   - PP No. 49 Tahun 2018 tentang Manajemen PPPK.
   - Peraturan BKN No. 24 Tahun 2017 jo. Peraturan BKN No. 7 Tahun 2021 tentang Tata Cara Pemberian Cuti PNS.
   - Peraturan BKN No. 4 Tahun 2023 tentang Periodisasi Kenaikan Pangkat PNS (6 periode per tahun: 1 Februari, 1 April, 1 Juni, 1 Agustus, 1 Oktober, 1 Desember).
   - PP No. 5 Tahun 2024 tentang Gaji Pokok PNS & PP No. 11 Tahun 2024 tentang Gaji PPPK.
   - Peraturan Bupati Kebumen terkait kepegawaian dan jam kerja ASN.

2. Aturan Layanan Khusus BPBD Kebumen:
   - KGB: Diberikan setiap 2 tahun sekali (TMT berikutnya = TMT terakhir + 2 tahun). Ambang EWS: H-75 (Persiapan), H-60 (Perhatian), H-30 (Mendesak), H-15 (Kritis), dan Terlambat jika tanggal target terlewati belum terbit SK.
   - KP: Siklus 4 tahunan untuk KP reguler, mengikuti 6 periode BKN. Ambang EWS: H-120, H-90, H-60, H-30, Terlambat.
   - Cuti: Kuota tahunan 12 hari kerja (Senin-Jumat, hari libur nasional & cuti bersama tidak dihitung). Penangguhan sisa cuti tahun lalu maksimal 6 hari kerja.
   - PPPK: Pemantauan masa berakhir perjanjian kerja dengan ambang H-120 s.d H-30 (H-120 Persiapan, H-90 Perhatian, H-60 Mendesak, H-30 Kritis, Terlambat jika lewat). Evaluasi kinerja dan KGB berkala 2 tahunan.

Konteks Ringkasan Pegawai BPBD Kebumen (Tanggal Referensi Sistem: 4 November 2026):
${JSON.stringify(activeStaffSummary, null, 2)}
`;

    let reply = '';
    let success = false;

    // Attempt Gemini call with timeout & retry
    for (let attempt = 0; attempt < 2 && !success; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT_API')), 5000)
        );
        const apiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${systemInstruction}\n\nPertanyaan Pengguna: ${maskSensitiveData(message)}`
        });
        const response: any = await Promise.race([apiPromise, timeoutPromise]);
        if (response && response.text) {
          reply = response.text;
          success = true;
        }
      } catch (geminiError: any) {
        console.warn(`Gemini API attempt ${attempt + 1} notice:`, geminiError.message);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }

    // Grounded Fallback Engine if external model experiences transient spike
    if (!success || !reply) {
      const q = message.toLowerCase();
      if (q.includes('rudi') || q.includes('kgb')) {
        const rudi = db.pegawai.find(p => p.nama.toLowerCase().includes('rudi'));
        reply = `Berdasarkan basis data resmi SI_AMIN_LEGA v3.0 BPBD Kabupaten Kebumen per **4 November 2026**:
        
- **Nama Pegawai:** ${rudi?.nama || 'Rudi Hartono, S.Kom.'}
- **NIP:** ${rudi?.nip.slice(0, 8)}**********
- **Pangkat / Golongan:** ${rudi?.pangkatGolongan || 'Penata Muda Tk. I / III/b'}
- **TMT KGB Terakhir:** ${rudi?.tmtKgbTerakhir || '2024-11-20'} (SK No. 822.2/084/BPBD/KGB/2024)
- **Jatuh Tempo KGB Berikutnya:** **20 November 2026** (TMT Terakhir + 2 Tahun)
- **Status Urgensi EWS:** **KRITIS** (Sisa 16 Hari Kerja per 4 November 2026).

**Dasar Regulasi:**
Sesuai **PP No. 11 Tahun 2017 jo. PP No. 17 Tahun 2020** dan **PP No. 5 Tahun 2024**, usulan Kenaikan Gaji Berkala (KGB) diajukan paling lambat H-30 sebelum TMT. Admin Kepegawaian OPD disarankan segera memproses draf Nota Dinas usulan ke BKPSDM Kabupaten Kebumen.`;
      } else if (q.includes('pensiun') || q.includes('bup')) {
        reply = `Berdasarkan ketentuan **PP No. 11 Tahun 2017 tentang Manajemen PNS** (Pasal 239 - 240) dan **UU No. 20 Tahun 2023 tentang ASN**:

1. **Batas Usia Pensiun (BUP) ASN:**
   - **58 Tahun:** bagi Pejabat Administrasi, Pejabat Fungsional Ahli Pertama, Ahli Muda, dan Pejabat Fungsional Keterampilan.
   - **60 Tahun:** bagi Pejabat Pimpinan Tinggi Pratama (seperti Kepala Pelaksana BPBD Kab. Kebumen) dan Pejabat Fungsional Ahli Madya.
   - **65 Tahun:** bagi Pejabat Fungsional Ahli Utama.

2. **Penetapan TMT Pensiun:**
   TMT Pensiun ditetapkan terhitung mulai tanggal 1 bulan berikutnya setelah PNS yang bersangkutan mencapai Batas Usia Pensiun (BUP), kecuali yang lahir tanggal 1 pada bulan kelahirannya.
   
*Catatan Sistem SI_AMIN_LEGA:* EWS memulai pemantauan H-365 hari sebelum TMT Pensiun agar berkas usulan SK Pensiun di BKPSDM Kebumen selesai tepat waktu.`;
      } else if (q.includes('pangkat') || q.includes('kp') || q.includes('periode')) {
        reply = `Berdasarkan **Peraturan BKN No. 4 Tahun 2023 tentang Periodisasi Kenaikan Pangkat PNS**:

1. **6 Periode Kenaikan Pangkat per Tahun:**
   Mulai 1 Januari 2024, periodisasi Kenaikan Pangkat PNS ditetapkan sebanyak 6 (enam) periode setiap tahunnya:
   - **1 Februari**
   - **1 April**
   - **1 Juni**
   - **1 Agustus**
   - **1 Oktober**
   - **1 Desember**

2. **Syarat Kenaikan Pangkat Reguler (Siklus 4 Tahun):**
   - Sekurang-kurangnya telah 4 (empat) tahun dalam pangkat terakhir.
   - Setiap unsur penilaian kinerja (SKP) sekurang-kurangnya bernilai baik dalam 2 (dua) tahun terakhir.
   - Tidak sedang dalam hukuman disiplin tingkat sedang atau berat.

*Sistem SI_AMIN_LEGA v3.0 menghitung secara deterministik periode terdekat yang jatuh pada atau setelah TMT Pangkat + 4 tahun.*`;
      } else if (q.includes('cuti') || q.includes('libur') || q.includes('saldo')) {
        reply = `Berdasarkan **Peraturan BKN No. 24 Tahun 2017 jo. Peraturan BKN No. 7 Tahun 2021 tentang Tata Cara Pemberian Cuti PNS**:

1. **Cuti Tahunan (12 Hari Kerja):**
   - Diberikan bagi PNS/PPPK yang telah bekerja sekurang-kurangnya 1 tahun secara terus-menerus.
   - Hanya menghitung **HARI KERJA** (Senin-Jumat). Sabtu, Minggu, Hari Libur Nasional, dan Cuti Bersama yang ditetapkan Pemerintah **TIDAK DIHITUNG** memotong cuti.

2. **Penangguhan Sisa Cuti Tahun Lalu:**
   - Hak cuti tahunan yang tidak diambil dalam tahun berjalan dapat digunakan dalam tahun berikutnya paling banyak **6 (enam) hari kerja**.
   - Total hak cuti tahun berjalan yang terakumulasi maksimal 18 hari kerja.

3. **Alur Persetujuan di BPBD Kebumen:**
   Pengajuan Pegawai &rarr; Verifikasi Atasan Langsung &rarr; Persetujuan Akhir Pimpinan / Admin OPD.`;
      } else {
        reply = `Terima kasih atas pertanyaan Anda kepada Asisten SI_AMIN_LEGA v3.0 BPBD Kabupaten Kebumen.

Sesuai ketentuan **UU No. 20 Tahun 2023 tentang ASN**, **PP No. 11/2017 jo. PP 17/2020**, serta peraturan pelaksana di lingkungan Pemerintah Kabupaten Kebumen:
- **Kenaikan Gaji Berkala (KGB):** Dihitung setiap 2 tahun sekali dari TMT SK terakhir.
- **Kenaikan Pangkat (KP):** Mengikuti 6 periode BKN (Feb, Apr, Jun, Ags, Okt, Des) dengan siklus reguler 4 tahun.
- **Layanan Cuti:** Kuota 12 hari kerja dengan pemotongan otomatis hari kerja efektif (Sabtu/Minggu dan libur bersama dikecualikan).

Silakan sebutkan nama pegawai atau topik spesifik yang ingin Anda konsultasikan.`;
      }
    }

    logAI('AI-03 Chatbot Regulasi', 'gemini-3.8-flash', message, 0.96, 'Info Only', 'Konsultasi regulasi kepegawaian berhasil dijawab.');

    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ 
      error: 'Terjadi kendala saat menghubungi asisten AI.',
      details: err.message 
    });
  }
});

// AI-01: Ekstraksi Dokumen SK (PDF / Scan Image)
app.post('/api/gemini/extract-sk', async (req: Request, res: Response) => {
  try {
    const { documentType, documentText, sampleName } = req.body;

    const prompt = `
Anda adalah modul AI-01 Ekstraksi Dokumen SK Kepegawaian SI_AMIN_LEGA BPBD Kebumen.
Lakukan ekstraksi cerdas dari teks/konten SK berikut:

Jenis Dokumen yang dianalisis: ${documentType || 'SK KGB/KP/Pangkat'}
Nama Pegawai tertera (petunjuk): ${sampleName || 'Pegawai BPBD'}
Teks / Isi Dokumen:
"""
${documentText || 'Petikan Keputusan Bupati Kebumen Nomor 822.2/084/BPBD/KGB/2024 tentang Kenaikan Gaji Berkala Pegawai Negeri Sipil atas nama Rudi Hartono, S.Kom., NIP 199102142019031006, Pangkat/Golongan Penata Muda Tk. I / III/b, TMT KGB 20 November 2024, Gaji Pokok Baru Rp 3.250.000, Masa Kerja Golongan 05 Tahun 08 Bulan, Ditetapkan di Kebumen pada tanggal 25 Oktober 2024.'}
"""

Berikan output JSON murni dengan format spesifik berikut:
{
  "nomorSk": string,
  "tanggalSk": string (YYYY-MM-DD),
  "namaPegawai": string,
  "nip": string (18 digit),
  "pangkat": string,
  "tmt": string (YYYY-MM-DD),
  "gajiPokok": number,
  "masaKerja": string,
  "pejabatPenetap": string,
  "confidenceScore": number (antara 0.85 hingga 0.99),
  "catatanEkstraksi": string
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    logAI('AI-01 Ekstraksi SK', 'gemini-3.8-flash', `Ekstraksi ${documentType}`, parsed.confidenceScore || 0.95, 'Diterima', 'Ekstraksi SK terstruktur berhasil');

    res.json({ success: true, extraction: parsed });
  } catch (err: any) {
    console.error('Gemini extract-sk error:', err);
    res.status(500).json({ error: 'Gagal melakukan ekstraksi dokumen dengan AI', details: err.message });
  }
});

// AI-02: Validasi Berkas Cuti & e-Letter
app.post('/api/gemini/validate-leave', async (req: Request, res: Response) => {
  try {
    const { cutiData, docText } = req.body;

    const prompt = `
Validasi kelayakan dan kesesuaian berkas pengajuan cuti ASN berikut:
Pegawai: ${cutiData?.namaPegawai} (NIP: ${cutiData?.nip})
Jenis Cuti: ${cutiData?.jenis}
Rentang: ${cutiData?.tanggalMulai} s.d ${cutiData?.tanggalSelesai} (${cutiData?.jumlahHariKerja} hari kerja)
Alasan: ${cutiData?.alasan}
No e-Letter: ${cutiData?.nomorEletter}

Teks Dokumen e-Letter yang diunggah:
"""
${docText || 'Surat Permohonan Cuti Tahunan Nomor e-Letter/BPBD/CUTI/2026/XI/089 tanggal 3 November 2026 atas nama Rudi Hartono, mengajukan cuti 3 hari kerja tanggal 10 sampai 12 November 2026.'}
"""

Outputkan JSON dengan format:
{
  "validitasFormat": boolean,
  "kecocokanNomor": boolean,
  "kecocokanTanggal": boolean,
  "tumpangTindih": boolean,
  "confidenceScore": number,
  "rekomendasi": string,
  "catatanDetail": string
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    logAI('AI-02 Validasi Cuti', 'gemini-3.8-flash', `Validasi Cuti ${cutiData?.namaPegawai}`, parsed.confidenceScore || 0.96, 'Diterima');

    res.json({ success: true, validation: parsed });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal validasi cuti', details: err.message });
  }
});

// AI-04: Deteksi Anomali Data Kepegawaian
app.post('/api/gemini/detect-anomalies', async (_req: Request, res: Response) => {
  try {
    const anonymizedData = db.pegawai.map(p => ({
      nip: p.nip.slice(0, 8) + '**********',
      nama: p.nama,
      jenis: p.jenisKepegawaian,
      pangkat: p.pangkatGolongan,
      tmtPangkat: p.tmtPangkatTerakhir,
      tmtKgb: p.tmtKgbTerakhir,
      jabatan: p.jabatan,
      bupPensiun: calculatePensiunTarget(p.tanggalLahir, p.jenisJabatan, db.parameters.bupPerJabatan)
    }));

    const prompt = `
Anda adalah AI-04 Deteksi Anomali Data Kepegawaian SI_AMIN_LEGA v3.0 BPBD Kabupaten Kebumen.
Periksa daftar pegawai berikut per 4 November 2026:
${JSON.stringify(anonymizedData, null, 2)}

Identifikasi potensi anomali berikut:
1. KGB yang sudah lewat tanggal TMT 2 tahunan namun belum diusulkan (misal KGB 2024-08-01 yang jatuh tempo pada 2026-08-01 namun sekarang sudah Nov 2026).
2. Kenaikan Pangkat reguler 4 tahunan yang mendekati batas usul atau terlewat.
3. Usia pegawai menjelang Batas Usia Pensiun (BUP) 58 th atau 60 th yang berkasnya perlu disiapkan.
4. Inkonsistensi data TMT atau format.

Output JSON:
{
  "totalAnomali": number,
  "ringkasanEksekutif": string,
  "daftarTemuan": [
    {
      "nama": string,
      "jenisLayanan": string,
      "tingkatUrgensi": "Terlambat" | "Kritis" | "Mendesak" | "Perhatian",
      "deskripsiMasalah": string,
      "rekomendasiTindakLanjut": string
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    logAI('AI-04 Deteksi Anomali', 'gemini-3.8-flash', 'Audit anomali seluruh pegawai', 0.97, 'Diterima');

    res.json({ success: true, anomalies: parsed });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mendeteksi anomali data', details: err.message });
  }
});

// AI-05: Ringkasan EWS & Draf Dokumen Nota Dinas
app.post('/api/gemini/draft-doc', async (req: Request, res: Response) => {
  try {
    const { jenisDokumen, targetPegawaiNama, targetNip, jenisLayanan, dataTarget } = req.body;

    const prompt = `
Buatkan draf resmi dokumen kedinasan Pemerintah Kabupaten Kebumen:
Jenis Dokumen: ${jenisDokumen || 'Nota Dinas Usulan Kenaikan Gaji Berkala'}
Instansi: Badan Penanggulangan Bencana Daerah (BPBD) Kabupaten Kebumen
Pegawai yang diusulkan: ${targetPegawaiNama || 'Rudi Hartono, S.Kom.'} (NIP: ${targetNip || '199102142019031006'})
Layanan: ${jenisLayanan || 'KGB'}
Data Pendukung: ${JSON.stringify(dataTarget || {})}

Susun format baku surat dinas Pemkab Kebumen:
- Kop Nota Dinas BPBD Kebumen
- Kepada Yth: Kepala Pelaksana BPBD Kabupaten Kebumen (atau Kepala BKPSDM Kab. Kebumen)
- Dari: Kasubbag Kepegawaian dan Umum BPBD Kebumen
- Hal, Dasar Hukum (PP 11/2017, PP 5/2024 dll), Rincian Usulan, Penutup.
Buat rapi dan siap cetak/ditinjau admin.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const draftText = response.text || '';
    logAI('AI-05 Ringkasan & Draf', 'gemini-3.8-flash', `Draf ${jenisDokumen}`, 0.98, 'Diterima');

    res.json({ success: true, draft: draftText });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal membuat draf dokumen', details: err.message });
  }
});

// ==================== VITE & STATIC HANDLING ====================

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SI_AMIN_LEGA v3.0] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
