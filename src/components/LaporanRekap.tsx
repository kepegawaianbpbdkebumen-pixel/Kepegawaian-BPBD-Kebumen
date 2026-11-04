import React, { useState } from 'react';
import { EWSItem, Pegawai, CutiRecord, SaldoCuti } from '../types';
import { 
  FileText, 
  Printer, 
  Download, 
  Filter, 
  Building2, 
  Calendar,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

interface LaporanRekapProps {
  ewsItems: EWSItem[];
  pegawaiList: Pegawai[];
  cutiList: CutiRecord[];
  saldoCutiList: SaldoCuti[];
}

export const LaporanRekap: React.FC<LaporanRekapProps> = ({
  ewsItems,
  pegawaiList,
  cutiList,
  saldoCutiList
}) => {
  const [reportType, setReportType] = useState<'KGB' | 'KP' | 'PENSIUN' | 'CUTI'>('KGB');

  const printReport = () => {
    window.print();
  };

  const downloadCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (reportType === 'KGB') {
      filename = 'Rekap_Usulan_KGB_BPBD_Kebumen';
      headers = ['No', 'NIP', 'Nama Pegawai', 'Pangkat/Gol', 'Jabatan', 'TMT KGB Terakhir', 'Jatuh Tempo KGB', 'Status EWS'];
      const kgbItems = ewsItems.filter(i => i.jenisLayanan === 'KGB');
      rows = kgbItems.map((item, idx) => [
        idx + 1,
        `'${item.nip}`,
        `"${item.namaPegawai}"`,
        `"${pegawaiList.find(p => p.nip === item.nip)?.pangkatGolongan || '-'}"`,
        `"${item.jabatan}"`,
        item.riwayatTMTLama,
        item.tanggalTarget,
        item.tingkat
      ]);
    } else if (reportType === 'KP') {
      filename = 'Rekap_Usulan_KP_BPBD_Kebumen';
      headers = ['No', 'NIP', 'Nama Pegawai', 'Pangkat Saat Ini', 'Jabatan', 'TMT Pangkat Terakhir', 'Periode Usul KP BKN', 'Status EWS'];
      const kpItems = ewsItems.filter(i => i.jenisLayanan === 'KP');
      rows = kpItems.map((item, idx) => [
        idx + 1,
        `'${item.nip}`,
        `"${item.namaPegawai}"`,
        `"${pegawaiList.find(p => p.nip === item.nip)?.pangkatGolongan || '-'}"`,
        `"${item.jabatan}"`,
        item.riwayatTMTLama,
        item.tanggalTarget,
        item.tingkat
      ]);
    } else if (reportType === 'PENSIUN') {
      filename = 'Rekap_Proyeksi_Pensiun_BUP_BPBD_Kebumen';
      headers = ['No', 'NIP', 'Nama Pegawai', 'Tanggal Lahir', 'Jenis Jabatan', 'Usia BUP', 'TMT Pensiun', 'Status EWS'];
      const pensiunItems = ewsItems.filter(i => i.jenisLayanan === 'Pensiun');
      rows = pensiunItems.map((item, idx) => {
        const p = pegawaiList.find(peg => peg.nip === item.nip);
        return [
          idx + 1,
          `'${item.nip}`,
          `"${item.namaPegawai}"`,
          p?.tanggalLahir || '-',
          p?.jenisJabatan || '-',
          p?.jenisJabatan === 'Pimpinan Tinggi' ? '60 Tahun' : '58 Tahun',
          item.tanggalTarget,
          item.tingkat
        ];
      });
    } else {
      filename = 'Rekapitulasi_Layanan_Cuti_BPBD_Kebumen';
      headers = ['No', 'NIP', 'Nama Pegawai', 'Jenis Cuti', 'Tgl Mulai', 'Tgl Selesai', 'Hari Kerja', 'Status Persetujuan', 'Nomor e-Letter'];
      rows = cutiList.map((c, idx) => [
        idx + 1,
        `'${c.nip}`,
        `"${c.namaPegawai}"`,
        c.jenis,
        c.tanggalMulai,
        c.tanggalSelesai,
        c.jumlahHariKerja,
        c.status,
        `"${c.nomorEletter || '-'}"`
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
            <span>Laporan & Rekapitulasi Kepegawaian (PRD FR-16)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Format baku cetak dinas Pemerintah Kabupaten Kebumen dengan kop resmi dan tanda tangan berjenjang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel/CSV</span>
          </button>
          <button
            onClick={printReport}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi</span>
          </button>
        </div>
      </div>

      {/* Select Report Tab */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 print:hidden">
        {[
          { id: 'KGB', label: 'Rekap Usulan Kenaikan Gaji Berkala (KGB)' },
          { id: 'KP', label: 'Rekap Usulan Kenaikan Pangkat (KP)' },
          { id: 'PENSIUN', label: 'Rekap Proyeksi Pensiun (BUP)' },
          { id: 'CUTI', label: 'Rekapitulasi Layanan Cuti Bulanan' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              reportType === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PRINT-READY OFFICIAL REPORT SHEET */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm font-serif print:border-none print:shadow-none print:p-0">
        {/* Official Letterhead with BPBD Kebumen Emblem */}
        <div className="flex items-center justify-between pb-4 border-b-4 border-double border-slate-900 mb-6 gap-4">
          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
            <img
              src="/assets/aistudio/images_f34814fe.jpeg"
              alt="Logo Resmi BPBD Kabupaten Kebumen"
              className="w-18 h-18 object-contain"
            />
          </div>
          <div className="text-center flex-1 pr-6 sm:pr-14">
            <div className="text-sm font-bold uppercase tracking-widest text-slate-800">
              Pemerintah Kabupaten Kebumen
            </div>
            <div className="text-base font-extrabold uppercase tracking-wide text-slate-950 mt-0.5">
              Badan Penanggulangan Bencana Daerah (BPBD)
            </div>
            <div className="text-xs text-slate-600 font-sans mt-0.5">
              Jalan Arungbinang No. 9 Kebumen, Jawa Tengah 54311 · Telp/Fax: (0287) 381188
            </div>
            <div className="text-[11px] text-slate-500 font-sans italic">
              Posko Penanganan Darurat Bencana: Pusdalops-PB BPBD Kabupaten Kebumen
            </div>
          </div>
        </div>

        {/* Report Title & Metadata */}
        <div className="text-center mb-6 font-sans">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 underline">
            {reportType === 'KGB' && 'Daftar Rekapitulasi Usulan Kenaikan Gaji Berkala (KGB) Pegawai'}
            {reportType === 'KP' && 'Daftar Usulan Kenaikan Pangkat (KP) Reguler 6 Periode BKN'}
            {reportType === 'PENSIUN' && 'Daftar Nominatif Pegawai Menjelang Batas Usia Pensiun (BUP)'}
            {reportType === 'CUTI' && 'Rekapitulasi Pelaksanaan Layanan Cuti Pegawai ASN'}
          </h3>
          <div className="text-xs text-slate-600 mt-1">
            Status Terverifikasi per Tanggal: <strong>4 November 2026</strong> · Tahun Anggaran 2026
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto mb-8 font-sans">
          <table className="w-full text-left text-xs border border-slate-400 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                <th className="p-2 border-r border-slate-400 w-10 text-center">No</th>
                <th className="p-2 border-r border-slate-400">Nama Pegawai / NIP</th>
                <th className="p-2 border-r border-slate-400">Pangkat / Golongan</th>
                <th className="p-2 border-r border-slate-400">Jabatan & Unit Kerja</th>
                {reportType === 'KGB' && (
                  <>
                    <th className="p-2 border-r border-slate-400">TMT Terakhir</th>
                    <th className="p-2 border-r border-slate-400">Jatuh Tempo KGB</th>
                    <th className="p-2 text-center">Status Urgensi</th>
                  </>
                )}
                {reportType === 'KP' && (
                  <>
                    <th className="p-2 border-r border-slate-400">TMT Pangkat Terakhir</th>
                    <th className="p-2 border-r border-slate-400">Periode Usul KP</th>
                    <th className="p-2 text-center">Status Urgensi</th>
                  </>
                )}
                {reportType === 'PENSIUN' && (
                  <>
                    <th className="p-2 border-r border-slate-400">Tanggal Lahir</th>
                    <th className="p-2 border-r border-slate-400">TMT BUP Pensiun</th>
                    <th className="p-2 text-center">BUP (Thn)</th>
                  </>
                )}
                {reportType === 'CUTI' && (
                  <>
                    <th className="p-2 border-r border-slate-400">Jenis Cuti</th>
                    <th className="p-2 border-r border-slate-400">Rentang Waktu</th>
                    <th className="p-2 border-r border-slate-400 text-center">Hari Kerja</th>
                    <th className="p-2 text-center">Status Persetujuan</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {reportType === 'KGB' && ewsItems.filter(i => i.jenisLayanan === 'KGB').map((item, idx) => {
                const p = pegawaiList.find(peg => peg.nip === item.nip);
                return (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="p-2 text-center border-r border-slate-300">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold">{item.namaPegawai}</div>
                      <div className="font-mono text-[10px] text-slate-600">{item.nip}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300">{p?.pangkatGolongan || '-'}</td>
                    <td className="p-2 border-r border-slate-300">{item.jabatan}</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{item.riwayatTMTLama}</td>
                    <td className="p-2 border-r border-slate-300 font-bold font-mono text-slate-900">{item.tanggalTarget}</td>
                    <td className="p-2 text-center font-bold">{item.tingkat}</td>
                  </tr>
                );
              })}

              {reportType === 'KP' && ewsItems.filter(i => i.jenisLayanan === 'KP').map((item, idx) => {
                const p = pegawaiList.find(peg => peg.nip === item.nip);
                return (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="p-2 text-center border-r border-slate-300">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold">{item.namaPegawai}</div>
                      <div className="font-mono text-[10px] text-slate-600">{item.nip}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300">{p?.pangkatGolongan || '-'}</td>
                    <td className="p-2 border-r border-slate-300">{item.jabatan}</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{item.riwayatTMTLama}</td>
                    <td className="p-2 border-r border-slate-300 font-bold font-mono text-slate-900">{item.tanggalTarget}</td>
                    <td className="p-2 text-center font-bold">{item.tingkat}</td>
                  </tr>
                );
              })}

              {reportType === 'PENSIUN' && ewsItems.filter(i => i.jenisLayanan === 'Pensiun').map((item, idx) => {
                const p = pegawaiList.find(peg => peg.nip === item.nip);
                return (
                  <tr key={item.id} className="border-b border-slate-300">
                    <td className="p-2 text-center border-r border-slate-300">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold">{item.namaPegawai}</div>
                      <div className="font-mono text-[10px] text-slate-600">{item.nip}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300">{p?.pangkatGolongan || '-'}</td>
                    <td className="p-2 border-r border-slate-300">{item.jabatan}</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{p?.tanggalLahir || '-'}</td>
                    <td className="p-2 border-r border-slate-300 font-bold font-mono text-slate-900">{item.tanggalTarget}</td>
                    <td className="p-2 text-center font-bold">{p?.jenisJabatan === 'Pimpinan Tinggi' ? '60 Th' : '58 Th'}</td>
                  </tr>
                );
              })}

              {reportType === 'CUTI' && cutiList.map((c, idx) => (
                <tr key={c.id} className="border-b border-slate-300">
                  <td className="p-2 text-center border-r border-slate-300">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-300">
                    <div className="font-bold">{c.namaPegawai}</div>
                    <div className="font-mono text-[10px] text-slate-600">{c.nip}</div>
                  </td>
                  <td className="p-2 border-r border-slate-300">{c.jenis}</td>
                  <td className="p-2 border-r border-slate-300">{c.unitKerja}</td>
                  <td className="p-2 border-r border-slate-300 font-mono">{c.tanggalMulai} s.d {c.tanggalSelesai}</td>
                  <td className="p-2 border-r border-slate-300 font-bold text-center">{c.jumlahHariKerja} Hari</td>
                  <td className="p-2 text-center font-bold">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures Block (Tanda Tangan Pengesahan Dinas) */}
        <div className="grid grid-cols-2 pt-6 font-sans text-xs text-slate-900">
          <div className="text-center">
            <div>Mengetahui,</div>
            <div className="font-bold">KEPALA PELAKSANA BPBD KABUPATEN KEBUMEN</div>
            <div className="h-20" />
            <div className="font-bold underline">Drs. H. HARYONO, M.Si.</div>
            <div>Pembina Utama Muda / IV/c</div>
            <div className="font-mono text-[11px]">NIP. 19680514 199403 1 004</div>
          </div>

          <div className="text-center">
            <div>Kebumen, 4 November 2026</div>
            <div>Pengelola Kepegawaian,</div>
            <div className="font-bold">KASUBBAG KEPEGAWAIAN DAN UMUM</div>
            <div className="h-20" />
            <div className="font-bold underline">SITI NURJANAH, S.A.P.</div>
            <div>Penata Tk. I / III/d</div>
            <div className="font-mono text-[11px]">NIP. 19830919 200804 2 001</div>
          </div>
        </div>
      </div>
    </div>
  );
};
