import React, { useState } from 'react';
import { Pegawai, SaldoCuti, UserRole, RiwayatKGB, RiwayatPangkat } from '../types';
import { 
  UserPlus, 
  Search, 
  Filter, 
  FileEdit, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  BadgePercent, 
  CheckCircle, 
  AlertCircle,
  Eye,
  ShieldAlert,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { validateNIP } from '../utils/rulesEngine';

interface PegawaiListProps {
  pegawaiList: Pegawai[];
  saldoCutiList: SaldoCuti[];
  riwayatKgbList: RiwayatKGB[];
  riwayatPangkatList: RiwayatPangkat[];
  currentRole: UserRole;
  onSavePegawai: (pegawai: Pegawai) => Promise<void>;
  onDeletePegawai: (id: string) => Promise<void>;
  onOpenVerification: (nip: string) => void;
}

export const PegawaiList: React.FC<PegawaiListProps> = ({
  pegawaiList,
  saldoCutiList,
  riwayatKgbList,
  riwayatPangkatList,
  currentRole,
  onSavePegawai,
  onDeletePegawai,
  onOpenVerification
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'SEMUA' | 'PNS' | 'PPPK'>('SEMUA');
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTabDetail, setActiveTabDetail] = useState<'PROFIL' | 'KGB' | 'KP' | 'CUTI'>('PROFIL');

  const isAdmin = currentRole === 'Admin Kepegawaian OPD';

  const filtered = pegawaiList.filter(p => {
    if (filterType !== 'SEMUA' && p.jenisKepegawaian !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.nama.toLowerCase().includes(q) || p.nip.includes(q) || p.jabatan.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenAdd = () => {
    setFormData({
      jenisKepegawaian: 'PNS',
      jenisJabatan: 'Administrasi',
      unitKerja: 'BPBD Kabupaten Kebumen',
      statusAktif: true,
      pangkatGolongan: 'Penata Muda / III/a',
      gajiPokokTerakhir: 3000000,
      tmtPangkatTerakhir: '2023-04-01',
      tmtKgbTerakhir: '2025-01-01'
    });
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (p: Pegawai) => {
    setFormData({ ...p });
    setErrorMsg(null);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.nama) {
      setErrorMsg('NIP dan Nama Pegawai wajib diisi');
      return;
    }

    const nipCheck = validateNIP(formData.nip);
    if (!nipCheck.isValid) {
      setErrorMsg(nipCheck.message);
      return;
    }

    try {
      await onSavePegawai(formData as Pegawai);
      setIsEditing(false);
      setFormData({});
      setErrorMsg(null);
      if (selectedPegawai && selectedPegawai.id === formData.id) {
        setSelectedPegawai(formData as Pegawai);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <span>Daftar Pegawai ASN & PPPK</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              Total: {pegawaiList.length} Personil
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Data terverifikasi Badan Penanggulangan Bencana Daerah (BPBD) Kabupaten Kebumen
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pegawai Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          {(['SEMUA', 'PNS', 'PPPK'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterType === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {t === 'SEMUA' ? 'Semua Pegawai' : t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIP 18-digit, jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Grid of Employees */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => {
          const saldo = saldoCutiList.find(s => s.nip === p.nip && s.tahun === 2026);
          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={p.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={p.nama}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{p.nama}</h3>
                      <div className="font-mono text-xs text-slate-500 mt-0.5">{p.nip}</div>
                      <span className={`inline-block mt-1 px-2 py-0.2 rounded text-[10px] font-bold ${
                        p.jenisKepegawaian === 'PNS' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {p.jenisKepegawaian} · {p.pangkatGolongan}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Jabatan:</span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">{p.jabatan}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">TMT KGB Terakhir:</span>
                    <span className="font-semibold text-slate-700">{p.tmtKgbTerakhir || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">TMT Pangkat:</span>
                    <span className="font-semibold text-slate-700">{p.tmtPangkatTerakhir || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sisa Cuti 2026:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {saldo ? saldo.sisa : 12} Hari Kerja
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedPegawai(p);
                    setActiveTabDetail('PROFIL');
                  }}
                  className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rincian & Riwayat</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onOpenVerification(p.nip)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Periksa Dokumen SK"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Edit Pegawai"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus pegawai ${p.nama}?`)) {
                            onDeletePegawai(p.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Pegawai"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee Detail Modal */}
      {selectedPegawai && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedPegawai.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedPegawai.nama}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <h3 className="font-bold text-base">{selectedPegawai.nama}</h3>
                  <p className="font-mono text-xs text-amber-400">{selectedPegawai.nip}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPegawai(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-5 pt-3 bg-slate-50 gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTabDetail('PROFIL')}
                className={`pb-2 border-b-2 transition ${
                  activeTabDetail === 'PROFIL' ? 'border-amber-500 text-amber-600 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Profil Lengkap
              </button>
              <button
                onClick={() => setActiveTabDetail('KGB')}
                className={`pb-2 border-b-2 transition ${
                  activeTabDetail === 'KGB' ? 'border-amber-500 text-amber-600 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Riwayat KGB
              </button>
              <button
                onClick={() => setActiveTabDetail('KP')}
                className={`pb-2 border-b-2 transition ${
                  activeTabDetail === 'KP' ? 'border-amber-500 text-amber-600 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Riwayat Pangkat
              </button>
              <button
                onClick={() => setActiveTabDetail('CUTI')}
                className={`pb-2 border-b-2 transition ${
                  activeTabDetail === 'CUTI' ? 'border-amber-500 text-amber-600 font-bold' : 'border-transparent text-slate-500'
                }`}
              >
                Saldo Cuti
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-xs max-h-96 overflow-y-auto">
              {activeTabDetail === 'PROFIL' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Jenis Kepegawaian</span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedPegawai.jenisKepegawaian}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Pangkat & Golongan</span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedPegawai.pangkatGolongan}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Jabatan & Unit</span>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedPegawai.jabatan}</div>
                    <div className="text-slate-500 text-[10px]">{selectedPegawai.unitKerja}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Jenis Jabatan (BUP)</span>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedPegawai.jenisJabatan}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Tanggal Lahir</span>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedPegawai.tanggalLahir}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">TMT CPNS</span>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedPegawai.tmtCpns || '-'}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Gaji Pokok Terakhir</span>
                    <div className="font-bold text-emerald-700 text-sm mt-0.5">
                      Rp {selectedPegawai.gajiPokokTerakhir?.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[11px]">Kontak WhatsApp & Email</span>
                    <div className="font-medium text-slate-800 mt-0.5">{selectedPegawai.nomorWhatsApp}</div>
                    <div className="text-slate-500 text-[11px]">{selectedPegawai.email}</div>
                  </div>
                </div>
              )}

              {activeTabDetail === 'KGB' && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900">
                    <span className="font-bold">Ketentuan KGB:</span> Diberikan setiap 2 tahun sekali. TMT Terakhir: {selectedPegawai.tmtKgbTerakhir}.
                  </div>
                  {riwayatKgbList.filter(k => k.nip === selectedPegawai.nip).length === 0 ? (
                    <div className="text-center py-6 text-slate-400">Belum ada catatan riwayat KGB terarsip.</div>
                  ) : (
                    riwayatKgbList.filter(k => k.nip === selectedPegawai.nip).map(k => (
                      <div key={k.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{k.nomorSk}</span>
                          <span className="text-slate-500 font-mono">TMT: {k.tmt}</span>
                        </div>
                        <div className="text-slate-600 mt-1">Gaji Pokok: Rp {k.gajiPokok.toLocaleString('id-ID')} · MKG: {k.masaKerjaTahun} Th {k.masaKerjaBulan} Bln</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTabDetail === 'KP' && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
                    <span className="font-bold">Ketentuan KP:</span> Siklus 4 tahunan reguler. TMT Terakhir: {selectedPegawai.tmtPangkatTerakhir}.
                  </div>
                  {riwayatPangkatList.filter(kp => kp.nip === selectedPegawai.nip).length === 0 ? (
                    <div className="text-center py-6 text-slate-400">Belum ada catatan riwayat KP terarsip.</div>
                  ) : (
                    riwayatPangkatList.filter(kp => kp.nip === selectedPegawai.nip).map(kp => (
                      <div key={kp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{kp.pangkatGolongan}</span>
                          <span className="text-slate-500 font-mono">TMT: {kp.tmt}</span>
                        </div>
                        <div className="text-slate-600 mt-1">No SK: {kp.nomorSk} · Pejabat: {kp.pejabatPenetap}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTabDetail === 'CUTI' && (
                <div>
                  {saldoCutiList.filter(s => s.nip === selectedPegawai.nip).map(s => (
                    <div key={s.tahun} className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
                      <div className="font-bold text-sm mb-2">Saldo Cuti Tahun {s.tahun}</div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white p-2 rounded-xl">
                          <div className="text-[10px] text-slate-500">Hak Tahunan</div>
                          <div className="font-bold text-slate-800 text-sm">{s.hak} Hari</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl">
                          <div className="text-[10px] text-slate-500">Penangguhan</div>
                          <div className="font-bold text-slate-800 text-sm">{s.ditangguhkan} Hari</div>
                        </div>
                        <div className="bg-white p-2 rounded-xl">
                          <div className="text-[10px] text-slate-500">Terpakai</div>
                          <div className="font-bold text-red-600 text-sm">{s.terpakai} Hari</div>
                        </div>
                        <div className="bg-emerald-600 text-white p-2 rounded-xl">
                          <div className="text-[10px] text-emerald-100">Sisa Kuota</div>
                          <div className="font-bold text-sm">{s.sisa} Hari</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedPegawai(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Pegawai Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {formData.id ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru BPBD Kebumen'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NIP (18 Digit Angka)</label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    placeholder="198309192008042001"
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Harus 18 digit teks valid</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    placeholder="Budi Santoso, S.T., M.M."
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jenis Kepegawaian</label>
                  <select
                    value={formData.jenisKepegawaian || 'PNS'}
                    onChange={(e) => setFormData({ ...formData, jenisKepegawaian: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                    <option value="PPPK">PPPK (Pegawai Pemerintah dgn Perjanjian Kerja)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jenis Jabatan (BUP)</label>
                  <select
                    value={formData.jenisJabatan || 'Administrasi'}
                    onChange={(e) => setFormData({ ...formData, jenisJabatan: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Administrasi">Administrasi (BUP 58 Tahun)</option>
                    <option value="Fungsional Pertama/Muda/Terampil">Fungsional Pertama/Muda/Terampil (BUP 58 Tahun)</option>
                    <option value="Fungsional Madya">Fungsional Madya (BUP 60 Tahun)</option>
                    <option value="Pimpinan Tinggi">Pimpinan Tinggi (BUP 60 Tahun)</option>
                    <option value="Fungsional Utama">Fungsional Utama (BUP 65 Tahun)</option>
                    <option value="PPPK">PPPK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jabatan Dinas</label>
                  <input
                    type="text"
                    placeholder="Pranata Penanggulangan Bencana"
                    value={formData.jabatan || ''}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Pangkat / Golongan</label>
                  <input
                    type="text"
                    placeholder="Penata Muda / III/a"
                    value={formData.pangkatGolongan || ''}
                    onChange={(e) => setFormData({ ...formData, pangkatGolongan: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">TMT KGB Terakhir</label>
                  <input
                    type="date"
                    value={formData.tmtKgbTerakhir || ''}
                    onChange={(e) => setFormData({ ...formData, tmtKgbTerakhir: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">TMT Pangkat Terakhir</label>
                  <input
                    type="date"
                    value={formData.tmtPangkatTerakhir || ''}
                    onChange={(e) => setFormData({ ...formData, tmtPangkatTerakhir: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">No WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.nomorWhatsApp || ''}
                    onChange={(e) => setFormData({ ...formData, nomorWhatsApp: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Resmi Dinas</label>
                  <input
                    type="email"
                    placeholder="nama@kebumenkab.go.id"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm"
                >
                  Simpan Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
