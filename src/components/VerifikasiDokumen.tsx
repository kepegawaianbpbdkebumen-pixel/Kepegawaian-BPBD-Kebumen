import React, { useState } from 'react';
import { DokumenRecord, Pegawai, UserRole, VerificationStatus, JenisDokumen } from '../types';
import { 
  FileCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  UploadCloud, 
  FileSearch, 
  Eye, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import { calculateKgbTarget, calculateKpTarget } from '../utils/rulesEngine';

interface VerifikasiDokumenProps {
  dokumenList: DokumenRecord[];
  pegawaiList: Pegawai[];
  currentRole: UserRole;
  preselectedNip?: string | null;
  onUploadDokumen: (doc: any) => Promise<void>;
  onVerifyStatus: (id: string, status: VerificationStatus, note: string, updateMaster: boolean) => Promise<void>;
}

export const VerifikasiDokumen: React.FC<VerifikasiDokumenProps> = ({
  dokumenList,
  pegawaiList,
  currentRole,
  preselectedNip,
  onUploadDokumen,
  onVerifyStatus
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    dokumenList.find(d => preselectedNip ? d.nip === preselectedNip : true)?.id || dokumenList[0]?.id || ''
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [editableValues, setEditableValues] = useState<any>({});
  const [adminNote, setAdminNote] = useState<string>('');
  const [updateMasterPegawai, setUpdateMasterPegawai] = useState<boolean>(true);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);

  // New upload form state
  const [uploadNip, setUploadNip] = useState<string>(pegawaiList[0]?.nip || '');
  const [uploadJenis, setUploadJenis] = useState<JenisDokumen>('SK KGB Terakhir');
  const [uploadNoDokumen, setUploadNoDokumen] = useState<string>('822.2/112/BPBD/KGB/2026');
  const [uploadTglDokumen, setUploadTglDokumen] = useState<string>('2026-10-20');
  const [uploadFileName, setUploadFileName] = useState<string>('SK_KGB_RESMI_SCAN.pdf');

  const selectedDoc = dokumenList.find(d => d.id === selectedDocId) || dokumenList[0];
  const linkedPegawai = selectedDoc ? pegawaiList.find(p => p.nip === selectedDoc.nip) : null;

  // Initialize editable fields whenever selected doc changes
  React.useEffect(() => {
    if (selectedDoc) {
      setEditableValues({
        nomorSk: selectedDoc.nilaiTerbaca.nomorSk || selectedDoc.nomorDokumen,
        tmt: selectedDoc.nilaiTerbaca.tmt || '',
        pangkat: selectedDoc.nilaiTerbaca.pangkat || (linkedPegawai?.pangkatGolongan || ''),
        gajiPokok: selectedDoc.nilaiTerbaca.gajiPokok || (linkedPegawai?.gajiPokokTerakhir || 0),
        tanggalLahir: selectedDoc.nilaiTerbaca.tanggalLahir || (linkedPegawai?.tanggalLahir || '')
      });
      setAdminNote(selectedDoc.catatanAdmin || '');
    }
  }, [selectedDoc?.id]);

  // Handle AI-01 Extraction
  const handleRunAiExtraction = async () => {
    if (!selectedDoc) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/gemini/extract-sk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedDoc.jenisDokumen,
          sampleName: selectedDoc.namaPegawai,
          documentText: `Keputusan Bupati Kebumen tentang ${selectedDoc.jenisDokumen} Nomor ${selectedDoc.nomorDokumen} atas nama ${selectedDoc.namaPegawai} (NIP ${selectedDoc.nip}). TMT berlaku ${selectedDoc.nilaiTerbaca.tmt || '2024-11-20'}, Gaji Pokok Rp ${selectedDoc.nilaiTerbaca.gajiPokok || 3250000}, Golongan ${selectedDoc.nilaiTerbaca.pangkat || 'Penata Muda Tk.I / III/b'}. Ditandatangani di Kebumen.`
        })
      });
      const data = await res.json();
      if (data.extraction) {
        setEditableValues((prev: any) => ({
          ...prev,
          nomorSk: data.extraction.nomorSk || prev.nomorSk,
          tmt: data.extraction.tmt || prev.tmt,
          pangkat: data.extraction.pangkat || prev.pangkat,
          gajiPokok: data.extraction.gajiPokok || prev.gajiPokok
        }));
        setAdminNote(`Ekstraksi AI-01 berhasil (Skor: ${Math.round(data.extraction.confidenceScore * 100)}%). ${data.extraction.catatanEkstraksi || ''}`);
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menjalankan ekstraksi AI.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Recomputed target date based on document values
  let calculatedNextTarget = '-';
  if (selectedDoc?.jenisDokumen === 'SK KGB Terakhir' && editableValues.tmt) {
    calculatedNextTarget = calculateKgbTarget(editableValues.tmt);
  } else if (selectedDoc?.jenisDokumen === 'SK Pangkat Terakhir' && editableValues.tmt) {
    calculatedNextTarget = calculateKpTarget(editableValues.tmt);
  }

  // Handle saving verification status
  const handleVerify = async (status: VerificationStatus) => {
    if (!selectedDoc) return;
    try {
      await onVerifyStatus(selectedDoc.id, status, adminNote, updateMasterPegawai);
      alert(`Status verifikasi berhasil diperbarui menjadi '${status}'.`);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan status verifikasi');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const peg = pegawaiList.find(p => p.nip === uploadNip);
    try {
      await onUploadDokumen({
        nip: uploadNip,
        namaPegawai: peg ? peg.nama : 'Pegawai',
        jenisDokumen: uploadJenis,
        nomorDokumen: uploadNoDokumen,
        tanggalDokumen: uploadTglDokumen,
        namaBerkas: uploadFileName,
        nilaiTerbaca: {
          nomorSk: uploadNoDokumen,
          tmt: uploadTglDokumen
        },
        statusVerifikasi: 'Belum terverifikasi'
      });
      setUploadModalOpen(false);
      alert('Dokumen berhasil diunggah dan siap diverifikasi pada layar dua kolom.');
    } catch (err: any) {
      alert(err.message || 'Gagal unggah dokumen');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <span>Verifikasi Dokumen Dasar (Layar Dua Kolom)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              PRD FR-23 & AI-01
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Rekonsiliasi berkas fisik / e-Letter dengan data master. Menghitung ulang tanggal target dan memberi status: Sesuai, Selisih, atau Dokumen Kurang.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition"
        >
          <UploadCloud className="w-4 h-4 text-amber-400" />
          <span>Unggah Berkas Baru</span>
        </button>
      </div>

      {/* Document Selection Strip */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap px-2">Pilih Dokumen:</span>
        {dokumenList.map(doc => {
          const isSelected = selectedDoc?.id === doc.id;
          const statusBg = {
            'Sesuai': 'text-emerald-700 bg-emerald-50 border-emerald-200',
            'Selisih': 'text-red-700 bg-red-50 border-red-200',
            'Dokumen kurang': 'text-amber-700 bg-amber-50 border-amber-200',
            'Belum terverifikasi': 'text-slate-600 bg-slate-100 border-slate-200'
          }[doc.statusVerifikasi];

          return (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={`px-3 py-2 rounded-xl text-xs transition flex flex-col text-left whitespace-nowrap border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className="font-semibold">{doc.namaPegawai.split(',')[0]}</span>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${statusBg}`}>
                  {doc.jenisDokumen} · {doc.statusVerifikasi}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* PRD FR-23: TWO-COLUMN VERIFICATION VIEW */}
      {selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: DOCUMENT VIEWER (DOKUMEN DI KIRI) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSearch className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Kolom Kiri: Pratinjau Dokumen Unggahan
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedDoc.namaBerkas} ({selectedDoc.ukuran})
              </span>
            </div>

            {/* Document Preview Container */}
            <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex flex-col items-center justify-center min-h-[380px]">
              <div className="relative w-full max-w-md bg-white p-6 rounded-xl shadow-md border border-slate-300 text-xs font-serif leading-relaxed">
                {/* Official Letterhead Simulation with BPBD Logo */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900 mb-4 gap-2">
                  <img
                    src="/assets/aistudio/images_f34814fe.jpeg"
                    alt="Logo Resmi BPBD Kabupaten Kebumen"
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                  <div className="text-center flex-1">
                    <div className="font-bold text-[10px] uppercase tracking-wider text-slate-900">
                      Pemerintah Kabupaten Kebumen
                    </div>
                    <div className="font-extrabold text-[11px] uppercase tracking-tight text-slate-900 leading-tight">
                      Badan Penanggulangan Bencana Daerah (BPBD)
                    </div>
                    <div className="text-[8px] text-slate-500 font-sans">
                      Jalan Arungbinang No. 9 Kebumen, Jawa Tengah 54311
                    </div>
                  </div>
                </div>

                <div className="text-center font-bold uppercase text-[11px] mb-3 underline">
                  Petikan Keputusan Bupati Kebumen
                </div>

                <div className="space-y-2 font-sans text-slate-800 text-[11px]">
                  <div><strong>Nomor:</strong> {selectedDoc.nomorDokumen}</div>
                  <div><strong>Menimbang & Mengingat:</strong> PP No. 11 Tahun 2017 & PP No. 5 Tahun 2024</div>
                  <div><strong>Nama:</strong> {selectedDoc.namaPegawai}</div>
                  <div><strong>NIP:</strong> {selectedDoc.nip}</div>
                  <div><strong>Pangkat / Golongan:</strong> {selectedDoc.nilaiTerbaca.pangkat || linkedPegawai?.pangkatGolongan}</div>
                  <div><strong>TMT Berlaku:</strong> <span className="bg-amber-100 px-1 font-bold">{selectedDoc.nilaiTerbaca.tmt || '2024-11-20'}</span></div>
                  {selectedDoc.nilaiTerbaca.gajiPokok && (
                    <div><strong>Gaji Pokok Baru:</strong> Rp {selectedDoc.nilaiTerbaca.gajiPokok.toLocaleString('id-ID')}</div>
                  )}
                  {selectedDoc.nilaiTerbaca.masaKerja && (
                    <div><strong>Masa Kerja Golongan:</strong> {selectedDoc.nilaiTerbaca.masaKerja}</div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-sans">
                  <span>Ditetapkan di Kebumen</span>
                  <span className="font-bold text-slate-700">a.n. BUPATI KEBUMEN</span>
                </div>
              </div>
            </div>

            {/* Document Metadata Bar */}
            <div className="p-4 bg-white text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Pengunggah:</span>
                <span className="font-medium text-slate-800">{selectedDoc.pengunggah}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Unggah:</span>
                <span className="font-mono text-slate-700">{selectedDoc.waktuUnggah}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hash SHA-256 Integritas:</span>
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">{selectedDoc.hash}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: VERIFICATION FORM (ISIAN DI KANAN) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Kolom Kanan: Verifikasi Nilai & Rekonsiliasi
                </span>
              </div>
              <button
                onClick={handleRunAiExtraction}
                disabled={isExtracting}
                className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{isExtracting ? 'Membaca SK...' : 'Ekstraksi Cerdas AI-01'}</span>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Target Calculation Preview Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-blue-900">
                <div className="font-bold text-xs mb-1 flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Perhitungan Ulang Mesin Aturan dari Nilai Dokumen:</span>
                </div>
                <div className="text-slate-600 leading-relaxed">
                  TMT Terbaca: <strong>{editableValues.tmt || '-'}</strong> &rarr; Target Layanan Berikutnya:{' '}
                  <span className="font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {calculatedNextTarget}
                  </span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Surat Keputusan (SK)</label>
                  <input
                    type="text"
                    value={editableValues.nomorSk || ''}
                    onChange={(e) => setEditableValues({ ...editableValues, nomorSk: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">TMT Terbaca (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={editableValues.tmt || ''}
                      onChange={(e) => setEditableValues({ ...editableValues, tmt: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Pangkat / Golongan</label>
                    <input
                      type="text"
                      value={editableValues.pangkat || ''}
                      onChange={(e) => setEditableValues({ ...editableValues, pangkat: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Gaji Pokok (SK KGB)</label>
                    <input
                      type="number"
                      value={editableValues.gajiPokok || 0}
                      onChange={(e) => setEditableValues({ ...editableValues, gajiPokok: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Skor Keyakinan AI</label>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-emerald-700 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{Math.round((selectedDoc.confidenceScore || 0.95) * 100)}% Terverifikasi</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Catatan Audit Admin Kepegawaian</label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan catatan rekonsiliasi atau alasan jika ada selisih..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Auto Update Master Pegawai checkbox */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="updateMaster"
                    checked={updateMasterPegawai}
                    onChange={(e) => setUpdateMasterPegawai(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                  />
                  <label htmlFor="updateMaster" className="text-slate-700 font-medium">
                    Sinkronkan nilai TMT dokumen ini langsung ke Data Master Pegawai
                  </label>
                </div>
              </div>

              {/* Status Decision Buttons (PRD FR-23) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Tetapkan Status Verifikasi (Admin Decision):
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleVerify('Sesuai')}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sesuai</span>
                  </button>

                  <button
                    onClick={() => handleVerify('Selisih')}
                    className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Selisih</span>
                  </button>

                  <button
                    onClick={() => handleVerify('Dokumen kurang')}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Dokumen Kurang</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Unggah Dokumen Dasar Pegawai</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pegawai Pemilik SK</label>
                <select
                  value={uploadNip}
                  onChange={(e) => setUploadNip(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  {pegawaiList.map(p => (
                    <option key={p.id} value={p.nip}>{p.nama} ({p.nip})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Jenis Dokumen</label>
                  <select
                    value={uploadJenis}
                    onChange={(e) => setUploadJenis(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="SK KGB Terakhir">SK KGB Terakhir</option>
                    <option value="SK Pangkat Terakhir">SK Pangkat Terakhir</option>
                    <option value="SK CPNS/PNS">SK CPNS/PNS</option>
                    <option value="SK Jabatan Terakhir">SK Jabatan Terakhir</option>
                    <option value="Akta Kelahiran">Akta Kelahiran (Bukti BUP)</option>
                    <option value="Perjanjian Kerja PPPK">Perjanjian Kerja PPPK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Dokumen SK</label>
                  <input
                    type="text"
                    required
                    value={uploadNoDokumen}
                    onChange={(e) => setUploadNoDokumen(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal Dokumen</label>
                  <input
                    type="date"
                    required
                    value={uploadTglDokumen}
                    onChange={(e) => setUploadTglDokumen(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Berkas PDF/Foto</label>
                  <input
                    type="text"
                    required
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <p className="text-slate-600 font-medium">Berkas aman tersimpan di folder restricted OPD.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Format didukung: PDF, PNG, JPG (Maks 10 MB per berkas)</p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Simpan & Buka Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
