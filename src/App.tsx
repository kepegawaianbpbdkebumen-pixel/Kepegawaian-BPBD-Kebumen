import React, { useState, useEffect } from 'react';
import { 
  AppDatabase, 
  Pegawai, 
  EWSItem, 
  UserRole, 
  CutiRecord, 
  DokumenRecord, 
  VerificationStatus,
  ParameterConfig,
  HariLibur,
  Pengguna
} from './types';
import { initialDatabase } from './data/initialData';
import { generateEWSList } from './utils/rulesEngine';
import { Header } from './components/Header';
import { EWSDashboard } from './components/EWSDashboard';
import { PegawaiList } from './components/PegawaiList';
import { LayananCuti } from './components/LayananCuti';
import { VerifikasiDokumen } from './components/VerifikasiDokumen';
import { AsistenChatbot } from './components/AsistenChatbot';
import { LaporanRekap } from './components/LaporanRekap';
import { PengaturanSistem } from './components/PengaturanSistem';
import { AuditTrail } from './components/AuditTrail';
import { FloatingChatbot } from './components/FloatingChatbot';
import { FileSignature, CheckCircle, AlertOctagon, LogIn, Mail, ShieldCheck, User } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(initialDatabase);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin Kepegawaian OPD');
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState<boolean>(false);
  const [preselectedVerificationNip, setPreselectedVerificationNip] = useState<string | null>(null);

  // Email Login Modal State (PRD FR-01 & FR-02)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginEmailInput, setLoginEmailInput] = useState<string>('kepegawaianbpbdkebumen@gmail.com');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Proposal Status Modal State
  const [proposalModalItem, setProposalModalItem] = useState<EWSItem | null>(null);
  const [newProposalStatus, setNewProposalStatus] = useState<string>('Sedang Verifikasi Berkas');
  const [newSkNomor, setNewSkNomor] = useState<string>('');
  const [newSkTmt, setNewSkTmt] = useState<string>('');

  // Draft Nota Modal State
  const [draftModalItem, setDraftModalItem] = useState<EWSItem | null>(null);
  const [draftResult, setDraftResult] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);

  // Fetch full data from backend
  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data: AppDatabase = await res.json();
        setDb(data);
        // Set default current user to primary admin if not set
        if (!currentUser) {
          const defaultAdmin = data.pengguna?.find(u => u.email === 'kepegawaianbpbdkebumen@gmail.com') || data.pengguna?.[0];
          if (defaultAdmin) {
            setCurrentUser(defaultAdmin);
            setCurrentRole(defaultAdmin.peran);
          }
        }
      }
    } catch (e) {
      console.warn('Backend server not ready yet, using initial data fallback', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute deterministic EWS Items in real-time from master data and parameters
  const ewsItems: EWSItem[] = React.useMemo(() => {
    return generateEWSList(db.pegawai, db.dokumen, db.parameters, '2026-11-04');
  }, [db.pegawai, db.dokumen, db.parameters]);

  // Current active user email for auditing
  const currentUserEmail = currentUser?.email || 'kepegawaianbpbdkebumen@gmail.com';

  const handleLoginWithEmail = async (emailToLogin: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToLogin })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login dengan email tersebut');
      }
      setCurrentUser(data.user);
      setCurrentRole(data.user.peran);
      setIsLoginModalOpen(false);
      await loadData();
    } catch (e: any) {
      setLoginError(e.message || 'Gagal melakukan login.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSavePengguna = async (pengguna: Pengguna) => {
    const res = await fetch('/api/pengguna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pengguna,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan akun pengguna');
    }
    await loadData();
  };

  const handleDeletePengguna = async (id: string) => {
    const res = await fetch(`/api/pengguna/${id}?actorEmail=${encodeURIComponent(currentUserEmail)}&actorRole=${encodeURIComponent(currentRole)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus pengguna');
    }
    await loadData();
  };

  // ==================== ACTIONS ====================

  const handleSavePegawai = async (pegawai: Pegawai) => {
    const res = await fetch('/api/pegawai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pegawai,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan pegawai');
    }
    await loadData();
  };

  const handleDeletePegawai = async (id: string) => {
    const res = await fetch(`/api/pegawai/${id}?actorEmail=${encodeURIComponent(currentUserEmail)}&actorRole=${encodeURIComponent(currentRole)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus');
    }
    await loadData();
  };

  const handleSubmitCuti = async (data: any) => {
    const res = await fetch('/api/cuti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengajukan cuti');
    }
    await loadData();
  };

  const handleVerifyAtasan = async (id: string, approved: boolean, catatan: string) => {
    const res = await fetch(`/api/cuti/${id}/verify-atasan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approved,
        catatan,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memverifikasi');
    }
    await loadData();
  };

  const handleApproveFinal = async (id: string, approved: boolean, catatan: string) => {
    const res = await fetch(`/api/cuti/${id}/approve-final`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approved,
        catatan,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memproses persetujuan');
    }
    await loadData();
  };

  const handleCancelCuti = async (id: string) => {
    const res = await fetch(`/api/cuti/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membatalkan');
    }
    await loadData();
  };

  const handleUploadDokumen = async (doc: any) => {
    const res = await fetch('/api/dokumen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dokumen: doc,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mengunggah dokumen');
    }
    await loadData();
  };

  const handleVerifyDokumenStatus = async (
    id: string, 
    status: VerificationStatus, 
    note: string, 
    updateMaster: boolean
  ) => {
    const res = await fetch(`/api/dokumen/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statusVerifikasi: status,
        catatanAdmin: note,
        updateEmployeeField: updateMaster,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal verifikasi status dokumen');
    }
    await loadData();
  };

  const handleSendNotification = async (item: EWSItem) => {
    const res = await fetch('/api/pengingat/kirim-notifikasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ewsItem: item,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (res.ok) {
      const result = await res.json();
      alert(`[BERHASIL] ${result.message}`);
      await loadData();
    }
  };

  const handleUpdateParameters = async (newParams: ParameterConfig, newHolidays: HariLibur[]) => {
    const res = await fetch('/api/settings/parameters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parameters: newParams,
        hariLibur: newHolidays,
        actorEmail: currentUserEmail,
        actorRole: currentRole
      })
    });
    if (!res.ok) throw new Error('Gagal menyimpan parameter');
    await loadData();
  };

  const handleResetDatabase = async () => {
    const res = await fetch('/api/database/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: currentUserEmail,
        userRole: currentRole
      })
    });
    if (res.ok) {
      const data = await res.json();
      setDb(data.data);
      alert('Basis data berhasil diatur ulang ke kondisi default!');
    }
  };

  const handleOpenVerification = (nip: string) => {
    setPreselectedVerificationNip(nip);
    setActiveTab('verifikasi');
  };

  const handleOpenDraftModal = async (item: EWSItem) => {
    setDraftModalItem(item);
    setDraftResult(null);
    setIsGeneratingDraft(true);
    try {
      const res = await fetch('/api/gemini/draft-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisDokumen: `Nota Dinas Usulan ${item.jenisLayanan}`,
          targetPegawaiNama: item.namaPegawai,
          targetNip: item.nip,
          jenisLayanan: item.jenisLayanan,
          dataTarget: item
        })
      });
      const data = await res.json();
      setDraftResult(data.draft);
    } catch (e) {
      console.error(e);
      alert('Gagal membuat draf nota');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-amber-500 selection:text-white">
      {/* Official Header */}
      <Header
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentUser={currentUser || undefined}
        onOpenLogin={() => {
          setLoginError(null);
          setIsLoginModalOpen(true);
        }}
        ewsItems={ewsItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenChat={() => setIsFloatingChatOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <EWSDashboard
            ewsItems={ewsItems}
            pegawaiList={db.pegawai}
            currentRole={currentRole}
            onSendNotification={handleSendNotification}
            onOpenVerification={handleOpenVerification}
            onOpenDraftModal={handleOpenDraftModal}
            onUpdateProposalStatus={(item, newSt) => {
              setProposalModalItem(item);
              setNewProposalStatus(newSt);
            }}
          />
        )}

        {activeTab === 'pegawai' && (
          <PegawaiList
            pegawaiList={db.pegawai}
            saldoCutiList={db.saldoCuti}
            riwayatKgbList={db.riwayatKGB}
            riwayatPangkatList={db.riwayatPangkat}
            currentRole={currentRole}
            onSavePegawai={handleSavePegawai}
            onDeletePegawai={handleDeletePegawai}
            onOpenVerification={handleOpenVerification}
          />
        )}

        {activeTab === 'cuti' && (
          <LayananCuti
            cutiList={db.cuti}
            pegawaiList={db.pegawai}
            saldoCutiList={db.saldoCuti}
            hariLibur={db.hariLibur}
            currentRole={currentRole}
            onSubmitCuti={handleSubmitCuti}
            onVerifyAtasan={handleVerifyAtasan}
            onApproveFinal={handleApproveFinal}
            onCancelCuti={handleCancelCuti}
          />
        )}

        {activeTab === 'verifikasi' && (
          <VerifikasiDokumen
            dokumenList={db.dokumen}
            pegawaiList={db.pegawai}
            currentRole={currentRole}
            preselectedNip={preselectedVerificationNip}
            onUploadDokumen={handleUploadDokumen}
            onVerifyStatus={handleVerifyDokumenStatus}
          />
        )}

        {activeTab === 'chatbot' && (
          <AsistenChatbot
            pegawaiList={db.pegawai}
            ewsItems={ewsItems}
            aiLogs={db.aiLogs}
            initialDraftItem={draftModalItem}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanRekap
            ewsItems={ewsItems}
            pegawaiList={db.pegawai}
            cutiList={db.cuti}
            saldoCutiList={db.saldoCuti}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrail
            auditLogs={db.auditLogs}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'pengaturan' && (
          <PengaturanSistem
            parameters={db.parameters}
            hariLibur={db.hariLibur}
            penggunaList={db.pengguna || []}
            currentRole={currentRole}
            onUpdateParameters={handleUpdateParameters}
            onResetDatabase={handleResetDatabase}
            onSavePengguna={handleSavePengguna}
            onDeletePengguna={handleDeletePengguna}
          />
        )}
      </main>

      {/* Floating Chatbot Widget (Always available on any tab) */}
      <FloatingChatbot
        isOpen={isFloatingChatOpen}
        onToggle={() => setIsFloatingChatOpen(!isFloatingChatOpen)}
      />

      {/* Modal Autentikasi Login Email (PRD FR-01, FR-02) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-orange-500 to-red-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src="/assets/aistudio/images_f34814fe.jpeg"
                    alt="Logo BPBD Kebumen"
                    className="w-full h-full object-contain rounded-full bg-white"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                    <span>Login Email Pengguna</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-semibold border border-amber-500/40">FR-01</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">SI_AMIN_LEGA v3.0 · BPBD Kab. Kebumen</p>
                </div>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-xs space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Ketentuan Keamanan (PRD T-01 & T-02):</strong> Setiap pengguna wajib login menggunakan alamat email resmi yang terdaftar. Sistem memvalidasi status akun dan mencatat audit log secara otomatis.
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {loginError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (loginEmailInput.trim()) {
                    handleLoginWithEmail(loginEmailInput.trim());
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Masukkan Alamat Email Resmi
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="nama@domain.com"
                      value={loginEmailInput}
                      onChange={(e) => setLoginEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="text-[10px] text-slate-500 font-semibold mb-1.5">
                    Pilih Cepat Akun Terdaftar (Klik untuk login langsung):
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(db.pengguna || []).map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => {
                          setLoginEmailInput(u.email);
                          handleLoginWithEmail(u.email);
                        }}
                        className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          currentUser?.email === u.email
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold flex items-center space-x-1.5">
                            <span className="truncate">{u.nama}</span>
                            {u.email === 'kepegawaianbpbdkebumen@gmail.com' && (
                              <span className="text-[9px] px-1 bg-amber-200 text-amber-900 rounded font-semibold">Primary Admin</span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">{u.email}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 font-medium text-slate-600 flex-shrink-0">
                          {u.peran}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>{loginLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Quick Draft Nota Dinas */}
      {draftModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSignature className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  Draf Nota Dinas Usulan {draftModalItem.jenisLayanan} (AI-05)
                </h3>
              </div>
              <button
                onClick={() => setDraftModalItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-xs space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-500">Pegawai Diusulkan:</span>{' '}
                <strong className="text-slate-900">{draftModalItem.namaPegawai}</strong> ({draftModalItem.nip}) · {draftModalItem.jabatan}
              </div>

              {isGeneratingDraft ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <span>Gemini 3.8 Flash sedang menyusun naskah dinas resmi...</span>
                </div>
              ) : draftResult ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto">
                  {draftResult}
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400">
                  Wajib ditinjau admin sebelum dicetak dan diajukan ke BKPSDM Kab. Kebumen.
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setDraftModalItem(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                  >
                    Tutup
                  </button>
                  {draftResult && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(draftResult);
                        alert('Naskah nota dinas telah disalin ke clipboard!');
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
                    >
                      Salin Naskah
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>SI_AMIN_LEGA v3.0</strong> · Badan Penanggulangan Bencana Daerah (BPBD) Kabupaten Kebumen
          </div>
          <div className="text-[11px] text-slate-500">
            Sistem Pengingat KGB, KP, Pensiun & Monitoring Cuti ASN Berbasis AI Native
          </div>
        </div>
      </footer>
    </div>
  );
}
