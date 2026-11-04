export type KepegawaianType = 'PNS' | 'PPPK';

export type JenisJabatan = 
  | 'Pimpinan Tinggi' 
  | 'Fungsional Utama'
  | 'Fungsional Madya' 
  | 'Fungsional Pertama/Muda/Terampil' 
  | 'Administrasi' 
  | 'PPPK';

export type UserRole = 
  | 'Admin Kepegawaian OPD'
  | 'Atasan Langsung'
  | 'Pimpinan'
  | 'Pegawai'
  | 'Auditor';

export type EWSStatus = 
  | 'Aman'
  | 'Persiapan'
  | 'Perhatian'
  | 'Mendesak'
  | 'Kritis'
  | 'Terlambat'
  | 'Selesai';

export type UsulanStatus = 
  | 'Belum Diproses'
  | 'Sedang Verifikasi Berkas'
  | 'Diusulkan ke BKPSDM'
  | 'SK Terbit / Selesai';

export type VerificationStatus = 
  | 'Sesuai'
  | 'Selisih'
  | 'Dokumen kurang'
  | 'Belum terverifikasi';

export type JenisLayanan = 'KGB' | 'KP' | 'Pensiun' | 'PPPK';

export type JenisCuti = 
  | 'Tahunan'
  | 'Besar'
  | 'Sakit'
  | 'Melahirkan'
  | 'Alasan Penting'
  | 'Di Luar Tanggungan Negara';

export type StatusCuti = 
  | 'Menunggu Verifikasi Atasan'
  | 'Diverifikasi Atasan'
  | 'Disetujui'
  | 'Ditolak Atasan'
  | 'Ditolak Pimpinan'
  | 'Dibatalkan';

export type JenisDokumen = 
  | 'SK CPNS/PNS'
  | 'SK Pangkat Terakhir'
  | 'SK KGB Terakhir'
  | 'SK Jabatan Terakhir'
  | 'Akta Kelahiran'
  | 'Perjanjian Kerja PPPK'
  | 'Surat Cuti / e-letter'
  | 'Surat Dokter / Lampiran';

export interface RiwayatKGB {
  id: string;
  nip: string;
  tmt: string; // YYYY-MM-DD
  nomorSk: string;
  tanggalSk: string;
  gajiPokok: number;
  masaKerjaTahun: number;
  masaKerjaBulan: number;
  pejabatPenetap: string;
  tautanBerkas?: string;
  catatan?: string;
}

export interface RiwayatPangkat {
  id: string;
  nip: string;
  pangkatGolongan: string;
  tmt: string; // YYYY-MM-DD
  nomorSk: string;
  tanggalSk: string;
  pejabatPenetap: string;
  tautanBerkas?: string;
}

export interface SaldoCuti {
  nip: string;
  tahun: number;
  hak: number; // default 12
  terpakai: number;
  ditangguhkan: number; // sisa tahun lalu max 6
  sisa: number;
}

export interface CutiRecord {
  id: string;
  nip: string;
  namaPegawai: string;
  jabatan: string;
  unitKerja: string;
  jenis: JenisCuti;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  jumlahHariKerja: number;
  alasan: string;
  status: StatusCuti;
  catatanAtasan?: string;
  catatanAdmin?: string;
  nomorEletter?: string;
  tautanEletter?: string;
  dokumenLampiran?: string;
  verifikasiAi?: {
    validitasFormat: boolean;
    kecocokanNomor: boolean;
    tumpangTindih: boolean;
    catatan: string;
    confidence: number;
  };
  pemroses?: string;
  waktuPengajuan: string;
  waktuPersetujuan?: string;
}

export interface Pegawai {
  id: string;
  nip: string; // 18-digit string
  nik?: string;
  nama: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  jenisKepegawaian: KepegawaianType;
  tanggalLahir: string; // YYYY-MM-DD
  tmtCpns?: string; // YYYY-MM-DD
  pangkatGolongan: string;
  jabatan: string;
  jenisJabatan: JenisJabatan;
  unitKerja: string;
  atasanLangsungId?: string | null;
  atasanLangsungNama?: string;
  email: string;
  nomorWhatsApp: string;
  statusAktif: boolean;
  tmtPangkatTerakhir: string; // YYYY-MM-DD
  tmtKgbTerakhir: string; // YYYY-MM-DD
  gajiPokokTerakhir: number;
  tmtPerjanjianSelesai?: string; // For PPPK YYYY-MM-DD
  fotoUrl?: string;
}

export interface EWSItem {
  id: string;
  nip: string;
  namaPegawai: string;
  jabatan: string;
  unitKerja: string;
  jenisLayanan: JenisLayanan;
  tanggalTarget: string; // YYYY-MM-DD
  sisaHari: number;
  tingkat: EWSStatus;
  statusUsulan: UsulanStatus;
  statusVerifikasiDokumen: VerificationStatus;
  keterangan: string;
  kontak: {
    email: string;
    wa: string;
  };
  notifikasiTerakhir?: string;
  riwayatTMTLama: string;
}

export interface DokumenRecord {
  id: string;
  nip: string;
  namaPegawai: string;
  jenisDokumen: JenisDokumen;
  nomorDokumen: string;
  tanggalDokumen: string;
  namaBerkas: string;
  ukuran: string;
  hash: string;
  versi: number;
  pengunggah: string;
  waktuUnggah: string;
  previewUrl?: string;
  nilaiTerbaca: {
    nomorSk?: string;
    tmt?: string;
    pangkat?: string;
    gajiPokok?: number;
    masaKerja?: string;
    tanggalLahir?: string;
    namaPegawai?: string;
    nip?: string;
  };
  confidenceScore: number;
  statusVerifikasi: VerificationStatus;
  catatanAdmin?: string;
}

export interface ParameterConfig {
  ambangKGB: number[]; // [75, 60, 30, 15]
  ambangKP: number[]; // [120, 90, 60, 30]
  ambangPensiun: number[]; // [365, 180, 90, 30]
  ambangPPPK: number[]; // [120, 90, 60, 30]
  bupPerJabatan: Record<JenisJabatan, number>;
  periodeKP: string[]; // ["02-01", "04-01", "06-01", "08-01", "10-01", "12-01"]
  kuotaCutiTahunan: number;
  maksPenangguhanCuti: number;
  namaInstansi: string;
  opd: string;
  kabupaten: string;
}

export interface HariLibur {
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  jenis: 'Libur Nasional' | 'Cuti Bersama';
}

export interface AuditLog {
  id: string;
  waktu: string;
  email: string;
  peran: string;
  aksi: string;
  entitas: string;
  rincian: string;
  nilaiSebelum?: any;
  nilaiSesudah?: any;
}

export interface AILog {
  id: string;
  waktu: string;
  fitur: string;
  model: string;
  promptRingkas: string;
  skorKeyakinan: number;
  keputusanManusia: 'Diterima' | 'Dikoreksi' | 'Ditolak' | 'Info Only';
  catatan?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: { title: string; pasal?: string; url?: string }[];
  isDraft?: boolean;
}

export interface Pengguna {
  id: string;
  email: string;
  nama: string;
  nip?: string;
  peran: UserRole;
  statusAktif: boolean;
  password?: string;
  terakhirLogin?: string;
}

export interface AppDatabase {
  pengguna: Pengguna[];
  pegawai: Pegawai[];
  riwayatKGB: RiwayatKGB[];
  riwayatPangkat: RiwayatPangkat[];
  cuti: CutiRecord[];
  saldoCuti: SaldoCuti[];
  dokumen: DokumenRecord[];
  parameters: ParameterConfig;
  hariLibur: HariLibur[];
  auditLogs: AuditLog[];
  aiLogs: AILog[];
}
