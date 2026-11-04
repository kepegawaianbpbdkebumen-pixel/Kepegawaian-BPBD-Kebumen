import React from 'react';
import { UserRole, EWSItem } from '../types';
import { 
  ShieldAlert, 
  UserCheck, 
  Calendar, 
  BellRing, 
  Building2,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  LogIn
} from 'lucide-react';
import { Pengguna } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser?: Pengguna;
  onOpenLogin: () => void;
  ewsItems: EWSItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  setCurrentRole,
  currentUser,
  onOpenLogin,
  ewsItems,
  activeTab,
  setActiveTab,
  onOpenChat,
}) => {
  const terlambatCount = ewsItems.filter(i => i.tingkat === 'Terlambat').length;
  const kritisCount = ewsItems.filter(i => i.tingkat === 'Kritis').length;
  const mendesakCount = ewsItems.filter(i => i.tingkat === 'Mendesak').length;

  const roles: { role: UserRole; desc: string }[] = [
    { role: 'Admin Kepegawaian OPD', desc: 'Kasubbag Umum & Kepegawaian (Akses Penuh)' },
    { role: 'Atasan Langsung', desc: 'Kepala Seksi / Sekretaris (Verifikasi Cuti & EWS Bawahan)' },
    { role: 'Pimpinan', desc: 'Kepala Pelaksana BPBD (Persetujuan Akhir & Dasbor)' },
    { role: 'Pegawai', desc: 'PNS / PPPK Personal (Profil, Ajukan Cuti, Dokumen Sendiri)' },
    { role: 'Auditor', desc: 'Inspektorat / BPK (Audit Log & Laporan Read-Only)' },
  ];

  const navTabs = [
    { id: 'dashboard', label: 'Dasbor EWS', icon: '📊' },
    { id: 'pegawai', label: 'Data Pegawai', icon: '👥' },
    { id: 'cuti', label: 'Layanan Cuti ASN', icon: '📑' },
    { id: 'verifikasi', label: 'Verifikasi Dokumen', icon: '📂' },
    { id: 'chatbot', label: 'Asisten AI & Chatbot', icon: '🤖' },
    { id: 'laporan', label: 'Laporan & Rekap', icon: '📋' },
    { id: 'audit', label: 'Audit Trail', icon: '📜' },
    { id: 'pengaturan', label: 'Parameter & Aturan', icon: '⚙️' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      {/* Top Bar with Emergency Warning Notification */}
      {(terlambatCount > 0 || kritisCount > 0) && (
        <div className="bg-gradient-to-r from-red-900 via-rose-900 to-amber-900 px-4 py-1.5 text-xs font-medium flex items-center justify-between text-red-100 border-b border-red-800">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-red-400 animate-ping" />
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>
              <strong>Peringatan Dini EWS:</strong> Terdapat{' '}
              {terlambatCount > 0 && <span className="bg-red-700/80 px-1.5 py-0.5 rounded font-bold text-white mr-1">{terlambatCount} Layanan Terlambat</span>}
              {kritisCount > 0 && <span className="bg-amber-600/80 px-1.5 py-0.5 rounded font-bold text-white">{kritisCount} Layanan Kritis (&le;15 Hari)</span>}
              {' '}yang membutuhkan tindak lanjut segera oleh Admin Kepegawaian!
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="underline hover:text-white font-semibold cursor-pointer text-xs"
          >
            Lihat Matriks EWS &rarr;
          </button>
        </div>
      )}

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Identity with Official BPBD Kebumen Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-orange-500 to-red-600 shadow-md flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-amber-400/40">
              <img
                src="/assets/aistudio/images_f34814fe.jpeg"
                alt="Logo BPBD Kabupaten Kebumen"
                className="w-full h-full object-contain rounded-full bg-white shadow-xs"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-amber-100 bg-clip-text text-transparent">
                  SI_AMIN_LEGA <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded font-mono font-semibold">v3.0</span>
                </h1>
                <span className="hidden md:inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                  <Sparkles className="w-3 h-3 mr-1 text-cyan-400" /> AI-Native
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-md">
                Sistem Pengingat KGB, KP, Pensiun & Monitoring Cuti ASN · <span className="text-amber-200">BPBD Kab. Kebumen</span>
              </p>
            </div>
          </div>

          {/* Center Info: System Baseline Date */}
          <div className="hidden lg:flex items-center space-x-3 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Status Referensi Sistem</div>
              <div className="font-semibold text-slate-200">4 November 2026 (WIB)</div>
            </div>
          </div>

          {/* Right: Quick Action Chatbot & Role Switcher */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenChat}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
              title="Buka Chatbot Asisten Regulasi Kepegawaian ASN"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="hidden sm:inline">Tanya Chatbot AI</span>
            </button>

            {/* Verified Email User Badge & Login Button */}
            <div className="relative group">
              <div className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs flex-shrink-0">
                  {currentUser?.nama ? currentUser.nama.charAt(0) : 'A'}
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-medium flex items-center space-x-1">
                    <span className="truncate max-w-[120px] sm:max-w-[160px] text-slate-300 font-mono">
                      {currentUser?.email || 'kepegawaianbpbdkebumen@gmail.com'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Email Terverifikasi" />
                  </div>
                  <div className="text-xs font-bold text-amber-300 truncate max-w-[130px] sm:max-w-none">
                    {currentRole}
                  </div>
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-1 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2.5 hidden group-hover:block group-focus-within:block z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-2 py-1.5 border-b border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Akun Terautentikasi (FR-01)</div>
                  <div className="text-xs font-bold text-white mt-0.5">{currentUser?.nama || 'Admin Kepegawaian'}</div>
                  <div className="text-[11px] font-mono text-amber-400 truncate">{currentUser?.email || 'kepegawaianbpbdkebumen@gmail.com'}</div>
                </div>

                <div className="pt-2 pb-1">
                  <button
                    onClick={onOpenLogin}
                    className="w-full text-center px-3 py-1.5 mb-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk dengan Alamat Email Lain</span>
                  </button>
                </div>

                <div className="px-2 py-1 border-t border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Beralih Hak Akses (RBAC OPD):
                </div>
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => setCurrentRole(r.role)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex flex-col my-0.5 ${
                      currentRole === r.role
                        ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="font-bold flex items-center justify-between">
                      {r.role}
                      {currentRole === r.role && <span className="text-[10px] text-amber-400">● Aktif</span>}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 overflow-x-auto mt-3 pt-2 border-t border-slate-800/80 no-scrollbar">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'dashboard' && (terlambatCount > 0 || kritisCount > 0) && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white">
                    {terlambatCount + kritisCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
