import React, { useState } from 'react';
import { EWSItem, JenisLayanan, EWSStatus, UserRole, Pegawai } from '../types';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Send, 
  FileText, 
  Sparkles, 
  Filter, 
  Search, 
  Download, 
  Printer, 
  ChevronRight,
  ShieldCheck,
  FileSignature
} from 'lucide-react';

interface EWSDashboardProps {
  ewsItems: EWSItem[];
  pegawaiList: Pegawai[];
  currentRole: UserRole;
  onSendNotification: (item: EWSItem) => Promise<void>;
  onOpenVerification: (nip: string) => void;
  onOpenDraftModal: (item: EWSItem) => void;
  onUpdateProposalStatus: (item: EWSItem, newStatus: any) => void;
}

export const EWSDashboard: React.FC<EWSDashboardProps> = ({
  ewsItems,
  pegawaiList,
  currentRole,
  onSendNotification,
  onOpenVerification,
  onOpenDraftModal,
  onUpdateProposalStatus,
}) => {
  const [filterLayanan, setFilterLayanan] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // Status counts
  const countTerlambat = ewsItems.filter(i => i.tingkat === 'Terlambat').length;
  const countKritis = ewsItems.filter(i => i.tingkat === 'Kritis').length;
  const countMendesak = ewsItems.filter(i => i.tingkat === 'Mendesak').length;
  const countPerhatian = ewsItems.filter(i => i.tingkat === 'Perhatian').length;
  const countPersiapan = ewsItems.filter(i => i.tingkat === 'Persiapan').length;
  const countAman = ewsItems.filter(i => i.tingkat === 'Aman').length;

  // Filtered items
  const filtered = ewsItems.filter(item => {
    if (filterLayanan !== 'SEMUA' && item.jenisLayanan !== filterLayanan) return false;
    if (filterStatus !== 'SEMUA' && item.tingkat !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNama = item.namaPegawai.toLowerCase().includes(q);
      const matchNip = item.nip.includes(q);
      const matchJabatan = item.jabatan.toLowerCase().includes(q);
      if (!matchNama && !matchNip && !matchJabatan) return false;
    }
    return true;
  });

  const handleSendNotif = async (item: EWSItem) => {
    setSendingId(item.id);
    try {
      await onSendNotification(item);
    } finally {
      setSendingId(null);
    }
  };

  const handleGenerateAISummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/gemini/draft-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisDokumen: 'Ringkasan Mingguan EWS Kepegawaian untuk Kepala Pelaksana BPBD Kebumen',
          targetPegawaiNama: 'Daftar Pegawai Perlu Tindak Lanjut',
          jenisLayanan: 'KGB, KP, dan Pensiun',
          dataTarget: {
            totalTerlambat: countTerlambat,
            totalKritis: countKritis,
            totalMendesak: countMendesak,
            daftarUrgensi: ewsItems.filter(i => ['Terlambat', 'Kritis', 'Mendesak'].includes(i.tingkat)).map(i => ({
              nama: i.namaPegawai,
              nip: i.nip,
              layanan: i.jenisLayanan,
              tingkat: i.tingkat,
              target: i.tanggalTarget,
              sisaHari: i.sisaHari
            }))
          }
        })
      });
      const data = await res.json();
      if (data.draft) {
        setAiSummary(data.draft);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const exportCSV = () => {
    const headers = ['NIP', 'Nama Pegawai', 'Jabatan', 'Layanan', 'TMT Terakhir', 'Tanggal Target', 'Sisa Hari', 'Tingkat Urgensi', 'Status Usulan', 'Verifikasi Dokumen'];
    const rows = filtered.map(i => [
      `'${i.nip}`,
      `"${i.namaPegawai}"`,
      `"${i.jabatan}"`,
      i.jenisLayanan,
      i.riwayatTMTLama,
      i.tanggalTarget,
      i.sisaHari,
      i.tingkat,
      i.statusUsulan,
      i.statusVerifikasiDokumen
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EWS_SI_AMIN_LEGA_BPBD_KEBUMEN_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">
              Matriks Peringatan Dini (Early Warning System)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Mesin Aturan Deterministik Aktif
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Pemantauan otomatis siklus 2 tahunan KGB, 4 tahunan KP reguler (6 periode BKN), dan Batas Usia Pensiun (BUP) pegawai BPBD Kebumen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateAISummary}
            disabled={loadingSummary}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{loadingSummary ? 'Menyusun Ringkasan AI...' : 'Ringkasan Eksekutif AI (AI-05)'}</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Unduh Excel/CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* AI Summary Banner if generated */}
      {aiSummary && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-700 relative animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-indigo-500/30 rounded-lg border border-indigo-400/40 text-amber-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="font-bold text-base text-amber-200">
                Ringkasan Mingguan EWS untuk Kepala Pelaksana BPBD (AI-05 Draft)
              </h3>
            </div>
            <button
              onClick={() => setAiSummary(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
            >
              Tutup Ringkasan
            </button>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans max-h-72 overflow-y-auto pr-2 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            {aiSummary}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Model: Gemini 3.8 Flash · Human in the Loop (Wajib diverifikasi admin sebelum diajukan resmi)</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(aiSummary);
                alert('Teks ringkasan telah disalin ke clipboard!');
              }}
              className="px-2.5 py-1 bg-indigo-700/60 hover:bg-indigo-600 text-white rounded font-medium"
            >
              Salin Teks Nota
            </button>
          </div>
        </div>
      )}

      {/* Urgency Matrix Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Terlambat */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'Terlambat' ? 'SEMUA' : 'Terlambat')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'Terlambat' ? 'ring-2 ring-red-500 shadow-md' : ''
          } bg-gradient-to-b from-red-50 to-red-100/60 border-red-200 hover:border-red-400`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">Terlambat</span>
            <AlertOctagon className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-2">{countTerlambat}</div>
          <p className="text-[10px] text-red-600 mt-0.5">Lewat tanggal target (perlu rapel/usul segera)</p>
        </div>

        {/* Kritis */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'Kritis' ? 'SEMUA' : 'Kritis')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'Kritis' ? 'ring-2 ring-rose-500 shadow-md' : ''
          } bg-gradient-to-b from-rose-50 to-rose-100/60 border-rose-200 hover:border-rose-400`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Kritis</span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{countKritis}</div>
          <p className="text-[10px] text-rose-600 mt-0.5">Sisa &le; 15 hari (Segera proses berkas)</p>
        </div>

        {/* Mendesak */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'Mendesak' ? 'SEMUA' : 'Mendesak')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'Mendesak' ? 'ring-2 ring-amber-500 shadow-md' : ''
          } bg-gradient-to-b from-amber-50 to-amber-100/60 border-amber-200 hover:border-amber-400`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Mendesak</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{countMendesak}</div>
          <p className="text-[10px] text-amber-600 mt-0.5">Sisa &le; 30 hari (Verifikasi kelengkapan SK)</p>
        </div>

        {/* Perhatian */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'Perhatian' ? 'SEMUA' : 'Perhatian')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'Perhatian' ? 'ring-2 ring-yellow-500 shadow-md' : ''
          } bg-gradient-to-b from-yellow-50 to-yellow-100/60 border-yellow-200 hover:border-yellow-400`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-800">Perhatian</span>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-black text-yellow-700 mt-2">{countPerhatian}</div>
          <p className="text-[10px] text-yellow-600 mt-0.5">Sisa &le; 60/90 hari (Pemberitahuan awal)</p>
        </div>

        {/* Persiapan */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'Persiapan' ? 'SEMUA' : 'Persiapan')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'Persiapan' ? 'ring-2 ring-blue-500 shadow-md' : ''
          } bg-gradient-to-b from-blue-50 to-blue-100/60 border-blue-200 hover:border-blue-400`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Persiapan</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">{countPersiapan}</div>
          <p className="text-[10px] text-blue-600 mt-0.5">H-75 (KGB) / H-120 (KP & PPPK) / H-365 (BUP)</p>
        </div>

        {/* Aman */}
        <div 
          onClick={() => setFilterStatus(filterStatus === 'Aman' ? 'SEMUA' : 'Aman')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'Aman' ? 'ring-2 ring-emerald-500 shadow-md' : ''
          } bg-gradient-to-b from-emerald-50 to-emerald-100/60 border-emerald-200 hover:border-emerald-400`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Aman</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{countAman}</div>
          <p className="text-[10px] text-emerald-600 mt-0.5">Belum masuk titik pengingat awal</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 mr-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Layanan:</span>
          </div>
          {['SEMUA', 'KGB', 'KP', 'Pensiun', 'PPPK'].map(lay => (
            <button
              key={lay}
              onClick={() => setFilterLayanan(lay)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterLayanan === lay
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {lay === 'SEMUA' ? 'Semua Layanan' : lay}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pegawai, NIP, jabatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Main EWS Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Pegawai / NIP</th>
                <th className="py-3 px-4">Layanan & TMT Terakhir</th>
                <th className="py-3 px-4">Tanggal Target</th>
                <th className="py-3 px-4">Sisa Waktu</th>
                <th className="py-3 px-4">Tingkat Urgensi</th>
                <th className="py-3 px-4">Verifikasi Dokumen</th>
                <th className="py-3 px-4">Status Usulan</th>
                <th className="py-3 px-4 text-right">Aksi Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data pegawai yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const badgeColor = {
                    'Terlambat': 'bg-red-100 text-red-800 border-red-300',
                    'Kritis': 'bg-rose-100 text-rose-800 border-rose-300',
                    'Mendesak': 'bg-amber-100 text-amber-800 border-amber-300',
                    'Perhatian': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    'Persiapan': 'bg-blue-100 text-blue-800 border-blue-300',
                    'Aman': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    'Selesai': 'bg-slate-100 text-slate-700 border-slate-300'
                  }[item.tingkat] || 'bg-slate-100 text-slate-700';

                  const docBadge = {
                    'Sesuai': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Selisih': 'bg-red-50 text-red-700 border-red-200 animate-pulse',
                    'Dokumen kurang': 'bg-amber-50 text-amber-700 border-amber-200',
                    'Belum terverifikasi': 'bg-slate-100 text-slate-600 border-slate-200'
                  }[item.statusVerifikasiDokumen];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Pegawai */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.namaPegawai}</div>
                        <div className="font-mono text-[11px] text-slate-500">{item.nip}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.jabatan}</div>
                      </td>

                      {/* Layanan & TMT Terakhir */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.jenisLayanan === 'KGB' ? 'bg-indigo-100 text-indigo-800' :
                          item.jenisLayanan === 'KP' ? 'bg-purple-100 text-purple-800' :
                          item.jenisLayanan === 'Pensiun' ? 'bg-orange-100 text-orange-800' :
                          'bg-teal-100 text-teal-800'
                        }`}>
                          {item.jenisLayanan}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">
                          TMT: <span className="font-semibold">{item.riwayatTMTLama}</span>
                        </div>
                      </td>

                      {/* Tanggal Target */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{item.tanggalTarget}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.jenisLayanan === 'KGB' ? 'Siklus 2 Thn' : item.jenisLayanan === 'KP' ? 'Periode BKN 4 Thn' : 'Batas Pensiun'}
                        </div>
                      </td>

                      {/* Sisa Hari */}
                      <td className="py-3.5 px-4">
                        {item.sisaHari < 0 ? (
                          <span className="font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            Terlambat {Math.abs(item.sisaHari)} Hari
                          </span>
                        ) : (
                          <span className={`font-semibold ${
                            item.sisaHari <= 15 ? 'text-rose-600 font-bold' :
                            item.sisaHari <= 30 ? 'text-amber-600 font-bold' :
                            'text-slate-700'
                          }`}>
                            H - {item.sisaHari} Hari
                          </span>
                        )}
                      </td>

                      {/* Tingkat Urgensi */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}>
                          {item.tingkat}
                        </span>
                      </td>

                      {/* Status Verifikasi Dokumen */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onOpenVerification(item.nip)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer hover:shadow-sm ${docBadge}`}
                          title="Klik untuk membuka layar verifikasi 2 kolom"
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {item.statusVerifikasiDokumen}
                        </button>
                      </td>

                      {/* Status Usulan */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                          item.statusUsulan === 'SK Terbit / Selesai' ? 'bg-emerald-100 text-emerald-800' :
                          item.statusUsulan === 'Diusulkan ke BKPSDM' ? 'bg-blue-100 text-blue-800' :
                          item.statusUsulan === 'Sedang Verifikasi Berkas' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.statusUsulan}
                        </span>
                      </td>

                      {/* Tindakan */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Send Notification Button */}
                          <button
                            onClick={() => handleSendNotif(item)}
                            disabled={sendingId === item.id}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg border border-slate-200 transition"
                            title="Kirim Notifikasi Pengingat (WhatsApp & Email)"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Draft Nota Dinas Button */}
                          <button
                            onClick={() => onOpenDraftModal(item)}
                            className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg border border-slate-200 transition"
                            title="Buat Draf Nota Dinas Usulan (AI-05)"
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Verify 2-Column button */}
                          <button
                            onClick={() => onOpenVerification(item.nip)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-sm"
                          >
                            <span>Periksa</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
