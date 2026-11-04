import React, { useState } from 'react';
import { ParameterConfig, HariLibur, UserRole, Pengguna } from '../types';
import { 
  Sliders, 
  Calendar, 
  Database, 
  RefreshCw, 
  Save, 
  ShieldAlert, 
  Building,
  CheckCircle,
  Plus,
  Trash2,
  Users,
  UserPlus,
  Mail,
  ShieldCheck
} from 'lucide-react';

interface PengaturanSistemProps {
  parameters: ParameterConfig;
  hariLibur: HariLibur[];
  penggunaList: Pengguna[];
  currentRole: UserRole;
  onUpdateParameters: (newParams: ParameterConfig, newHolidays: HariLibur[]) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onSavePengguna: (p: Pengguna) => Promise<void>;
  onDeletePengguna: (id: string) => Promise<void>;
}

export const PengaturanSistem: React.FC<PengaturanSistemProps> = ({
  parameters,
  hariLibur,
  penggunaList,
  currentRole,
  onUpdateParameters,
  onResetDatabase,
  onSavePengguna,
  onDeletePengguna
}) => {
  const [params, setParams] = useState<ParameterConfig>({ ...parameters });
  const [holidays, setHolidays] = useState<HariLibur[]>([...hariLibur]);
  const [isSaving, setIsSaving] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'Libur Nasional' | 'Cuti Bersama'>('Libur Nasional');

  // User management state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<Partial<Pengguna>>({
    email: '',
    nama: '',
    peran: 'Admin Kepegawaian OPD',
    statusAktif: true
  });
  const [userError, setUserError] = useState<string | null>(null);

  const isAdmin = currentRole === 'Admin Kepegawaian OPD';

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email || !userForm.nama) {
      setUserError('Email dan Nama Pengguna wajib diisi.');
      return;
    }
    try {
      await onSavePengguna(userForm as Pengguna);
      setShowUserModal(false);
      setUserForm({ email: '', nama: '', peran: 'Admin Kepegawaian OPD', statusAktif: true });
      setUserError(null);
      alert('Pengguna berhasil disimpan dan dapat langsung login menggunakan alamat email tersebut.');
    } catch (err: any) {
      setUserError(err.message || 'Gagal menyimpan akun pengguna');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateParameters(params, holidays);
      alert('Pengaturan parameter dan kalender hari libur berhasil disimpan.');
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = () => {
    if (!newDate || !newDesc) return;
    setHolidays(prev => [...prev, { tanggal: newDate, keterangan: newDesc, jenis: newType }]);
    setNewDate('');
    setNewDesc('');
  };

  const handleRemoveHoliday = (idx: number) => {
    setHolidays(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <span>Konfigurasi Parameter & Mesin Aturan EWS (PRD FR-18)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Menyesuaikan ambang pengingat mundur (H-Days), Batas Usia Pensiun per jenjang jabatan, dan kalender libur nasional.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>Peran Anda saat ini adalah <strong>{currentRole}</strong> (Read-Only). Hanya <strong>Admin Kepegawaian OPD</strong> yang dapat mengubah konfigurasi parameter.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Ambang Hari Pengingat (EWS Thresholds) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Ambang Hari Pengingat Berjenjang (H-Days)</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                KGB: Titik Pengingat (H-75, H-60, H-30, H-15)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {params.ambangKGB.map((val, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[10px] text-slate-400">Titik {i + 1}</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={val}
                      onChange={(e) => {
                        const newArr = [...params.ambangKGB];
                        newArr[i] = parseInt(e.target.value, 10) || 0;
                        setParams({ ...params, ambangKGB: newArr });
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                KP: Titik Pengingat (H-120, H-90, H-60, H-30)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {params.ambangKP.map((val, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[10px] text-slate-400">Titik {i + 1}</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={val}
                      onChange={(e) => {
                        const newArr = [...params.ambangKP];
                        newArr[i] = parseInt(e.target.value, 10) || 0;
                        setParams({ ...params, ambangKP: newArr });
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Pensiun BUP: Titik Pengingat (H-365, H-180, H-90, H-30)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {params.ambangPensiun.map((val, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[10px] text-slate-400">Titik {i + 1}</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={val}
                      onChange={(e) => {
                        const newArr = [...params.ambangPensiun];
                        newArr[i] = parseInt(e.target.value, 10) || 0;
                        setParams({ ...params, ambangPensiun: newArr });
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                PPPK: Pemantauan Berakhir Perjanjian Kerja (H-120, H-90, H-60, H-30)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(params.ambangPPPK || [120, 90, 60, 30]).map((val, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[10px] text-slate-400">Titik {i + 1}</span>
                    <input
                      type="number"
                      disabled={!isAdmin}
                      value={val}
                      onChange={(e) => {
                        const newArr = [...(params.ambangPPPK || [120, 90, 60, 30])];
                        newArr[i] = parseInt(e.target.value, 10) || 0;
                        setParams({ ...params, ambangPPPK: newArr });
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-lg text-center font-bold text-teal-800"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Batas Usia Pensiun (BUP) per Jabatan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
            <Building className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-slate-900 text-sm">Batas Usia Pensiun (BUP) per Jenjang Jabatan</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pejabat Administrasi (Staf, Kasubbag, Kasi)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={params.bupPerJabatan['Administrasi'] || 58}
                onChange={(e) => setParams({
                  ...params,
                  bupPerJabatan: { ...params.bupPerJabatan, Administrasi: parseInt(e.target.value, 10) || 58 }
                })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Fungsional Pertama / Muda / Terampil</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={params.bupPerJabatan['Fungsional Pertama/Muda/Terampil'] || 58}
                onChange={(e) => setParams({
                  ...params,
                  bupPerJabatan: { ...params.bupPerJabatan, 'Fungsional Pertama/Muda/Terampil': parseInt(e.target.value, 10) || 58 }
                })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pimpinan Tinggi Pratama (Kepala Pelaksana BPBD)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={params.bupPerJabatan['Pimpinan Tinggi'] || 60}
                onChange={(e) => setParams({
                  ...params,
                  bupPerJabatan: { ...params.bupPerJabatan, 'Pimpinan Tinggi': parseInt(e.target.value, 10) || 60 }
                })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Fungsional Madya</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={params.bupPerJabatan['Fungsional Madya'] || 60}
                onChange={(e) => setParams({
                  ...params,
                  bupPerJabatan: { ...params.bupPerJabatan, 'Fungsional Madya': parseInt(e.target.value, 10) || 60 }
                })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Kalender Hari Libur Nasional & Cuti Bersama */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-slate-900 text-sm">Kalender Hari Libur & Cuti Bersama Tahun 2026</h3>
          </div>
          <span className="text-slate-500 text-[11px]">{holidays.length} Hari Terdaftar (Tidak dihitung cuti)</span>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white"
            />
            <input
              type="text"
              placeholder="Keterangan hari libur..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-lg bg-white col-span-1 sm:col-span-2"
            />
            <button
              onClick={handleAddHoliday}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
          {holidays.map((h, idx) => (
            <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold font-mono text-slate-800">{h.tanggal}</div>
                <div className="text-slate-600 truncate max-w-[200px]">{h.keterangan}</div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                  h.jenis === 'Cuti Bersama' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {h.jenis}
                </span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleRemoveHoliday(idx)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card 4: Manajemen Pengguna & Akses Login Email (PRD FR-01 & FR-02) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Manajemen Akun Pengguna & Akses Login Email (PRD FR-01 & FR-02)</h3>
              <p className="text-[11px] text-slate-500">
                Pengaturan hak akses login menggunakan alamat email terdaftar untuk Admin, Pimpinan, Atasan Langsung, dan Pegawai.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setUserForm({ email: '', nama: '', nip: '', peran: 'Admin Kepegawaian OPD', statusAktif: true });
                setUserError(null);
                setShowUserModal(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Akun Email</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Nama Pegawai / Admin</th>
                <th className="py-2.5 px-3">Alamat Email Login</th>
                <th className="py-2.5 px-3">Peran (RBAC)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Terakhir Login</th>
                {isAdmin && <th className="py-2.5 px-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(penggunaList || []).map((u) => {
                const isPrimaryAdmin = u.email.toLowerCase() === 'kepegawaianbpbdkebumen@gmail.com';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{u.nama}</div>
                      {u.nip && <div className="text-[10px] text-slate-400 font-mono">NIP: {u.nip}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-mono text-slate-800 font-medium">{u.email}</span>
                      </div>
                      {isPrimaryAdmin && (
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Primary Admin
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.peran === 'Admin Kepegawaian OPD' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        u.peran === 'Pimpinan' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                        u.peran === 'Atasan Langsung' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                        u.peran === 'Auditor' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                        'bg-slate-100 text-slate-800 border border-slate-300'
                      }`}>
                        {u.peran}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        u.statusAktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.statusAktif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{u.statusAktif ? 'Aktif' : 'Non-aktif'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {u.terakhirLogin || 'Belum pernah'}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setUserForm({ ...u });
                            setUserError(null);
                            setShowUserModal(true);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded text-[11px] font-semibold"
                        >
                          Ubah
                        </button>
                        {!isPrimaryAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus akses login untuk email ${u.email}?`)) {
                                onDeletePengguna(u.id);
                              }
                            }}
                            className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-[11px] font-semibold"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Pengguna */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {userForm.id ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 text-xs space-y-4">
              {userError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {userError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Alamat Email Resmi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="contoh: kepegawaianbpbdkebumen@gmail.com"
                    value={userForm.email || ''}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Email ini yang akan dimasukkan saat admin atau pegawai melakukan login.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap beserta gelar..."
                  value={userForm.nama || ''}
                  onChange={(e) => setUserForm({ ...userForm, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  NIP / NIPPPK (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="18 digit NIP jika ASN..."
                  value={userForm.nip || ''}
                  onChange={(e) => setUserForm({ ...userForm, nip: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Peran & Hak Akses (Role) <span className="text-red-500">*</span>
                </label>
                <select
                  value={userForm.peran || 'Admin Kepegawaian OPD'}
                  onChange={(e) => setUserForm({ ...userForm, peran: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="Admin Kepegawaian OPD">Admin Kepegawaian OPD (Kasubbag Umum & Kepegawaian - Akses Penuh)</option>
                  <option value="Atasan Langsung">Atasan Langsung (Sekretaris / Kepala Seksi - Verifikasi Cuti)</option>
                  <option value="Pimpinan">Pimpinan (Kepala Pelaksana BPBD - Persetujuan Akhir)</option>
                  <option value="Pegawai">Pegawai (PNS / PPPK - Ajukan Cuti & Dokumen)</option>
                  <option value="Auditor">Auditor (Inspektorat / BPK - Read-Only)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="statusAktif"
                  checked={userForm.statusAktif !== false}
                  onChange={(e) => setUserForm({ ...userForm, statusAktif: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="statusAktif" className="text-slate-700 font-medium">
                  Status Akun Aktif (Dapat Login ke Sistem)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simpan Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card 5: Database Maintenance & Reset */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <Database className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-slate-900 text-sm">Pemeliharaan & Reset Basis Data</h3>
          </div>
          <p className="text-slate-600">
            Jika diperlukan untuk presentasi atau pengujian ulang, Anda dapat mengatur ulang seluruh basis data ke kondisi awal prototipe.
          </p>
          <button
            onClick={() => {
              if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh data kembali ke kondisi awal?')) {
                onResetDatabase();
              }
            }}
            className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Database ke Default</span>
          </button>
        </div>
      )}
    </div>
  );
};
