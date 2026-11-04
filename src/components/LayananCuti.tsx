import React, { useState } from 'react';
import { CutiRecord, Pegawai, SaldoCuti, HariLibur, UserRole, JenisCuti } from '../types';
import { 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  UserCheck, 
  Send, 
  PlusCircle,
  FileCheck2,
  CalendarDays,
  ShieldCheck,
  Undo2
} from 'lucide-react';
import { calculateWorkDays } from '../utils/rulesEngine';

interface LayananCutiProps {
  cutiList: CutiRecord[];
  pegawaiList: Pegawai[];
  saldoCutiList: SaldoCuti[];
  hariLibur: HariLibur[];
  currentRole: UserRole;
  onSubmitCuti: (formData: any) => Promise<void>;
  onVerifyAtasan: (id: string, approved: boolean, catatan: string) => Promise<void>;
  onApproveFinal: (id: string, approved: boolean, catatan: string) => Promise<void>;
  onCancelCuti: (id: string) => Promise<void>;
}

export const LayananCuti: React.FC<LayananCutiProps> = ({
  cutiList,
  pegawaiList,
  saldoCutiList,
  hariLibur,
  currentRole,
  onSubmitCuti,
  onVerifyAtasan,
  onApproveFinal,
  onCancelCuti
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'DAFTAR' | 'AJUKAN' | 'KALENDER' | 'SALDO'>('DAFTAR');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  
  // Form submission state
  const [selectedNip, setSelectedNip] = useState(pegawaiList[0]?.nip || '');
  const [jenisCuti, setJenisCuti] = useState<JenisCuti>('Tahunan');
  const [tglMulai, setTglMulai] = useState('2026-11-10');
  const [tglSelesai, setTglSelesai] = useState('2026-11-12');
  const [alasan, setAlasan] = useState('');
  const [nomorEletter, setNomorEletter] = useState('e-Letter/BPBD/CUTI/2026/XI/105');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Approval modal state
  const [actionModal, setActionModal] = useState<{
    cuti: CutiRecord;
    actionType: 'VERIFY_ATASAN' | 'APPROVE_FINAL';
  } | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  // AI Validation state
  const [validatingAiId, setValidatingAiId] = useState<string | null>(null);
  const [aiValidationResult, setAiValidationResult] = useState<any | null>(null);

  const selectedPegawai = pegawaiList.find(p => p.nip === selectedNip);
  const currentSaldo = saldoCutiList.find(s => s.nip === selectedNip && s.tahun === 2026);
  const calculatedDays = calculateWorkDays(tglMulai, tglSelesai, hariLibur);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (calculatedDays <= 0) {
      setFormError('Rentang tanggal tidak mencakup hari kerja (Sabtu, Minggu, atau Hari Libur).');
      return;
    }

    if (jenisCuti === 'Tahunan' && currentSaldo && currentSaldo.sisa < calculatedDays) {
      setFormError(`Sisa saldo cuti tahunan tidak mencukupi (Tersedia: ${currentSaldo.sisa} hari kerja, Permohonan: ${calculatedDays} hari kerja)`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitCuti({
        nip: selectedNip,
        jenis: jenisCuti,
        tanggalMulai: tglMulai,
        tanggalSelesai: tglSelesai,
        alasan,
        nomorEletter
      });
      alert('Permohonan cuti berhasil diajukan dan masuk ke tahap verifikasi atasan langsung.');
      setActiveSubTab('DAFTAR');
      setAlasan('');
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengajukan cuti');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiValidate = async (cuti: CutiRecord) => {
    setValidatingAiId(cuti.id);
    try {
      const res = await fetch('/api/gemini/validate-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutiData: cuti,
          docText: `Permohonan cuti ${cuti.jenis} Nomor: ${cuti.nomorEletter} atas nama ${cuti.namaPegawai}. Tanggal ${cuti.tanggalMulai} sampai ${cuti.tanggalSelesai} (${cuti.jumlahHariKerja} hari kerja). Alasan: ${cuti.alasan}. Disertai dokumen e-Letter Pemkab Kebumen.`
        })
      });
      const data = await res.json();
      setAiValidationResult({ cutiId: cuti.id, data: data.validation });
    } catch (err) {
      console.error(err);
    } finally {
      setValidatingAiId(null);
    }
  };

  const filteredCuti = cutiList.filter(c => {
    if (filterStatus === 'SEMUA') return true;
    return c.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <span>Monitoring & Layanan Cuti ASN BPBD Kebumen</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Siklus Cuti Terpadu & e-Letter
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Penghitungan deterministik hari kerja (mengecualikan Sabtu/Minggu & Hari Libur/Cuti Bersama), saldo otomatis, dan verifikasi berkas AI-02.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('DAFTAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'DAFTAR' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Daftar Usulan Cuti
          </button>
          <button
            onClick={() => setActiveSubTab('AJUKAN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1 ${
              activeSubTab === 'AJUKAN' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ajukan Cuti</span>
          </button>
          <button
            onClick={() => setActiveSubTab('KALENDER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'KALENDER' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kalender Unit
          </button>
          <button
            onClick={() => setActiveSubTab('SALDO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'SALDO' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Rekap Saldo Cuti
          </button>
        </div>
      </div>

      {/* SUBTAB 1: DAFTAR CUTI & WORKFLOW */}
      {activeSubTab === 'DAFTAR' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 mr-2">Filter Status:</span>
            {[
              'SEMUA',
              'Menunggu Verifikasi Atasan',
              'Diverifikasi Atasan',
              'Disetujui',
              'Ditolak Atasan',
              'Ditolak Pimpinan',
              'Dibatalkan'
            ].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* List of Leave Applications */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Pegawai / Unit</th>
                    <th className="py-3 px-4">Jenis Cuti</th>
                    <th className="py-3 px-4">Rentang & Hari Kerja</th>
                    <th className="py-3 px-4">Alasan & e-Letter</th>
                    <th className="py-3 px-4">Status Persetujuan</th>
                    <th className="py-3 px-4">Validasi AI-02</th>
                    <th className="py-3 px-4 text-right">Aksi Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCuti.map(c => {
                    const statusColor = {
                      'Menunggu Verifikasi Atasan': 'bg-amber-100 text-amber-800 border-amber-300',
                      'Diverifikasi Atasan': 'bg-blue-100 text-blue-800 border-blue-300',
                      'Disetujui': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      'Ditolak Atasan': 'bg-red-100 text-red-800 border-red-300',
                      'Ditolak Pimpinan': 'bg-rose-100 text-rose-800 border-rose-300',
                      'Dibatalkan': 'bg-slate-100 text-slate-600 border-slate-300'
                    }[c.status] || 'bg-slate-100 text-slate-700';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{c.namaPegawai}</div>
                          <div className="font-mono text-slate-500 text-[11px]">{c.nip}</div>
                          <div className="text-slate-400 text-[10px] truncate max-w-xs">{c.unitKerja}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {c.jenis}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {c.tanggalMulai} s.d {c.tanggalSelesai}
                          </div>
                          <div className="text-emerald-700 font-bold mt-0.5">
                            {c.jumlahHariKerja} Hari Kerja (Ekskl. Libur)
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-slate-700 text-xs italic">"{c.alasan}"</div>
                          {c.nomorEletter && (
                            <div className="text-[10px] text-indigo-600 font-mono mt-1">
                              Doc: {c.nomorEletter}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}`}>
                            {c.status}
                          </span>
                          {c.catatanAtasan && (
                            <div className="text-[10px] text-slate-500 mt-1">
                              Atasan: {c.catatanAtasan}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {c.verifikasiAi ? (
                            <div className="text-[10px] text-slate-600">
                              <span className="inline-flex items-center text-emerald-700 font-semibold">
                                <CheckCircle className="w-3 h-3 mr-0.5" /> Valid ({Math.round(c.verifikasiAi.confidence * 100)}%)
                              </span>
                              <div className="text-slate-500 line-clamp-1">{c.verifikasiAi.catatan}</div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAiValidate(c)}
                              disabled={validatingAiId === c.id}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold flex items-center space-x-1"
                            >
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>{validatingAiId === c.id ? 'Memvalidasi...' : 'Validasi AI'}</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Atasan Step: Menunggu Verifikasi Atasan */}
                            {c.status === 'Menunggu Verifikasi Atasan' && (
                              <button
                                onClick={() => setActionModal({ cuti: c, actionType: 'VERIFY_ATASAN' })}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs"
                              >
                                Verifikasi Atasan
                              </button>
                            )}

                            {/* Pimpinan / Admin Step: Diverifikasi Atasan */}
                            {c.status === 'Diverifikasi Atasan' && (
                              <button
                                onClick={() => setActionModal({ cuti: c, actionType: 'APPROVE_FINAL' })}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                              >
                                Persetujuan Akhir
                              </button>
                            )}

                            {/* Cancel option */}
                            {['Menunggu Verifikasi Atasan', 'Diverifikasi Atasan', 'Disetujui'].includes(c.status) && (
                              <button
                                onClick={() => {
                                  if (confirm('Yakin ingin membatalkan cuti ini? Saldo hari kerja yang telah dipotong akan otomatis dikembalikan.')) {
                                    onCancelCuti(c.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                title="Batalkan Permohonan Cuti"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: AJUKAN CUTI FORM */}
      {activeSubTab === 'AJUKAN' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span>Formulir Permohonan Cuti ASN BPBD Kebumen</span>
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Sistem otomatis menghitung hari kerja efektif dan mengecek tumpang tindih tanggal serta saldo cuti.
          </p>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pilih Pegawai Pemohon</label>
              <select
                value={selectedNip}
                onChange={(e) => setSelectedNip(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-500"
              >
                {pegawaiList.map(p => (
                  <option key={p.id} value={p.nip}>
                    {p.nama} ({p.nip}) - {p.jabatan}
                  </option>
                ))}
              </select>
            </div>

            {selectedPegawai && currentSaldo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold">Informasi Saldo Cuti 2026:</span> Kuota Hak: {currentSaldo.hak} Hari · Penangguhan Lalu: {currentSaldo.ditangguhkan} Hari · Terpakai: {currentSaldo.terpakai} Hari
                </div>
                <div className="font-extrabold text-sm bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                  Sisa: {currentSaldo.sisa} Hari
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Jenis Cuti</label>
                <select
                  value={jenisCuti}
                  onChange={(e) => setJenisCuti(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Tahunan">Cuti Tahunan (12 Hari Kerja)</option>
                  <option value="Besar">Cuti Besar (Masa Kerja &ge; 5 Th)</option>
                  <option value="Sakit">Cuti Sakit (Surat Dokter)</option>
                  <option value="Melahirkan">Cuti Melahirkan (Anak 1-3)</option>
                  <option value="Alasan Penting">Cuti Karena Alasan Penting</option>
                  <option value="Di Luar Tanggungan Negara">Cuti di Luar Tanggungan Negara (CLTN)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nomor Registrasi e-Letter</label>
                <input
                  type="text"
                  required
                  placeholder="e-Letter/BPBD/CUTI/2026/XI/..."
                  value={nomorEletter}
                  onChange={(e) => setNomorEletter(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tanggal Mulai Cuti</label>
                <input
                  type="date"
                  required
                  value={tglMulai}
                  onChange={(e) => setTglMulai(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tanggal Selesai Cuti</label>
                <input
                  type="date"
                  required
                  value={tglSelesai}
                  onChange={(e) => setTglSelesai(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Calculated work days badge */}
            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Hari Kerja yang Dihitung Sistem:</span>
              <span className="font-extrabold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-300">
                {calculatedDays} Hari Kerja Efektif
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Alasan Pengajuan Cuti</label>
              <textarea
                required
                rows={3}
                placeholder="Tuliskan keperluan cuti dan alamat/kontak selama menjalankan cuti..."
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('DAFTAR')}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSubmitting ? 'Mengajukan...' : 'Kirim Usulan Cuti'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 3: KALENDER CUTI UNIT */}
      {activeSubTab === 'KALENDER' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Kalender Ketersediaan Personil BPBD Kebumen (November 2026)
              </h3>
              <p className="text-xs text-slate-500">
                Memastikan kecukupan personil penanganan bencana, regu TRC, dan operasional piket darurat.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
              <div key={d} className="font-bold py-2 bg-slate-100 rounded-lg text-slate-700">
                {d}
              </div>
            ))}

            {/* Days 1 to 30 of November 2026 */}
            {Array.from({ length: 30 }, (_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
              const d = new Date(2026, 10, dayNum);
              const dayOfWeek = d.getDay(); // 0 is Sunday
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              const activeLeaves = cutiList.filter(c => 
                c.status === 'Disetujui' &&
                dateStr >= c.tanggalMulai && dateStr <= c.tanggalSelesai
              );

              return (
                <div
                  key={dayNum}
                  className={`p-2 min-h-24 rounded-xl border flex flex-col justify-between text-left transition ${
                    isWeekend ? 'bg-slate-50/70 border-slate-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isWeekend ? 'text-red-500' : 'text-slate-800'}`}>
                      {dayNum}
                    </span>
                    {activeLeaves.length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                        {activeLeaves.length} Cuti
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1 overflow-y-auto max-h-16">
                    {activeLeaves.map(al => (
                      <div key={al.id} className="text-[9px] bg-blue-50 text-blue-900 p-1 rounded font-medium truncate">
                        {al.namaPegawai.split(',')[0]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: REKAP SALDO CUTI */}
      {activeSubTab === 'SALDO' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-sm text-slate-800">
              Rekapitulasi Saldo Cuti Pegawai BPBD Tahun Anggaran 2026
            </h3>
            <p className="text-xs text-slate-500">
              Hak cuti tahunan: 12 hari kerja · Penangguhan sisa tahun lalu maksimal 6 hari kerja
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/60 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Pegawai / NIP</th>
                  <th className="py-3 px-4">Hak Cuti 2026</th>
                  <th className="py-3 px-4">Penangguhan 2025</th>
                  <th className="py-3 px-4">Total Kuota Tersedia</th>
                  <th className="py-3 px-4">Cuti Terpakai</th>
                  <th className="py-3 px-4">Sisa Kuota Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saldoCutiList.map(s => {
                  const peg = pegawaiList.find(p => p.nip === s.nip);
                  const total = s.hak + s.ditangguhkan;
                  return (
                    <tr key={s.nip} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{peg ? peg.nama : s.nip}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{s.nip}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold">{s.hak} Hari</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{s.ditangguhkan} Hari</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{total} Hari</td>
                      <td className="py-3 px-4 font-bold text-red-600">{s.terpakai} Hari</td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          {s.sisa} Hari Kerja
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {actionModal.actionType === 'VERIFY_ATASAN' ? 'Verifikasi Atasan Langsung' : 'Persetujuan Akhir Pimpinan / Admin'}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{actionModal.cuti.namaPegawai}</div>
                <div className="text-slate-500">
                  {actionModal.cuti.jenis} · {actionModal.cuti.tanggalMulai} s.d {actionModal.cuti.tanggalSelesai} ({actionModal.cuti.jumlahHariKerja} hari kerja)
                </div>
                <div className="text-slate-700 italic">"{actionModal.cuti.alasan}"</div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Persetujuan / Penolakan</label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan disposisi atau catatan rekomendasi..."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (actionModal.actionType === 'VERIFY_ATASAN') {
                      await onVerifyAtasan(actionModal.cuti.id, false, approvalNote || 'Ditolak atasan langsung');
                    } else {
                      await onApproveFinal(actionModal.cuti.id, false, approvalNote || 'Ditolak pimpinan');
                    }
                    setActionModal(null);
                    setApprovalNote('');
                  }}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl"
                >
                  Tolak Permohonan
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (actionModal.actionType === 'VERIFY_ATASAN') {
                      await onVerifyAtasan(actionModal.cuti.id, true, approvalNote || 'Disetujui atasan langsung');
                    } else {
                      await onApproveFinal(actionModal.cuti.id, true, approvalNote || 'Disetujui pimpinan / Admin OPD');
                    }
                    setActionModal(null);
                    setApprovalNote('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Setujui Usulan Cuti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
