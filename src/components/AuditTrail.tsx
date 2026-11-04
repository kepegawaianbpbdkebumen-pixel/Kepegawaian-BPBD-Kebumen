import React, { useState } from 'react';
import { AuditLog, UserRole } from '../types';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Lock, 
  Eye, 
  FileText,
  User,
  ArrowRight
} from 'lucide-react';

interface AuditTrailProps {
  auditLogs: AuditLog[];
  currentRole: UserRole;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ auditLogs, currentRole }) => {
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('SEMUA');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filtered = auditLogs.filter(log => {
    if (filterEntity !== 'SEMUA' && log.entitas !== filterEntity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.aksi.toLowerCase().includes(q) ||
        log.email.toLowerCase().includes(q) ||
        log.rincian.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">
              Jejak Audit Sistem Terproteksi (Immutable Audit Trail)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>PRD FR-17: Tidak Dapat Diubah</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Rekaman kronologis setiap aksi pembuatan, pengubahan, persetujuan, dan akses data sensitif ASN BPBD Kebumen untuk kepentingan akuntabilitas dan inspektorat.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span>Total Aktivitas Terekam:</span>
          <span className="font-bold text-slate-900 font-mono">{auditLogs.length} Entri</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-2">Entitas:</span>
          {['SEMUA', 'Pegawai', 'Cuti', 'Dokumen', 'Pengingat', 'Parameter'].map(ent => (
            <button
              key={ent}
              onClick={() => setFilterEntity(ent)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterEntity === ent
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {ent}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari aksi, email pemroses, rincian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Waktu Kejadian</th>
                <th className="py-3 px-4">Pemroses / Peran</th>
                <th className="py-3 px-4">Aksi Dilakukan</th>
                <th className="py-3 px-4">Entitas Terkait</th>
                <th className="py-3 px-4">Deskripsi Rincian</th>
                <th className="py-3 px-4 text-right">Detail Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {log.waktu}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{log.email}</div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {log.peran}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {log.aksi}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-700">{log.entitas}</span>
                  </td>
                  <td className="py-3.5 px-4 max-w-md text-slate-600">
                    {log.rincian}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {(log.nilaiSebelum || log.nilaiSesudah) && (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Nilai</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Detail Jejak Audit: {selectedLog.aksi}
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Waktu: <span className="font-mono font-bold text-slate-900">{selectedLog.waktu}</span></div>
                <div>Aktor: <span className="font-bold text-slate-900">{selectedLog.email}</span></div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold">Rincian Perubahan:</span>
                <p className="mt-1 text-slate-800 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {selectedLog.rincian}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {selectedLog.nilaiSebelum && (
                  <div>
                    <span className="text-red-700 font-bold block mb-1">Nilai Sebelum (Old):</span>
                    <pre className="p-2.5 bg-red-50 border border-red-200 rounded-xl font-mono text-[10px] text-red-900 overflow-x-auto max-h-48">
                      {JSON.stringify(selectedLog.nilaiSebelum, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.nilaiSesudah && (
                  <div>
                    <span className="text-emerald-700 font-bold block mb-1">Nilai Sesudah (New):</span>
                    <pre className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-mono text-[10px] text-emerald-900 overflow-x-auto max-h-48">
                      {JSON.stringify(selectedLog.nilaiSesudah, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
