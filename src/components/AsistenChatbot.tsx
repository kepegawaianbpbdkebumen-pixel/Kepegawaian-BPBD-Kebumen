import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AILog, Pegawai, EWSItem } from '../types';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  FileCheck, 
  AlertTriangle, 
  FileSignature, 
  Copy, 
  Check, 
  RefreshCw, 
  History, 
  ShieldCheck,
  SearchCheck,
  Scale
} from 'lucide-react';

interface AsistenChatbotProps {
  pegawaiList: Pegawai[];
  ewsItems: EWSItem[];
  aiLogs: AILog[];
  initialDraftItem?: EWSItem | null;
}

export const AsistenChatbot: React.FC<AsistenChatbotProps> = ({
  pegawaiList,
  ewsItems,
  aiLogs,
  initialDraftItem
}) => {
  const [subTab, setSubTab] = useState<'CHAT' | 'ANOMALI' | 'DRAF' | 'LOGS'>('CHAT');

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `Selamat datang di **Asisten Regulasi Kepegawaian & Tanya Jawab ASN SI_AMIN_LEGA v3.0** untuk BPBD Kabupaten Kebumen.

Saya dapat membantu Anda dengan:
- **Rujukan Regulasi Resmi ASN:** UU No. 20/2023 tentang ASN, PP No. 11/2017 jo. PP No. 17/2020 (Manajemen PNS), Peraturan BKN No. 4/2023 (6 Periode Kenaikan Pangkat), Peraturan BKN Cuti No. 24/2017 & No. 7/2021, Perbup Kebumen, serta PP Gaji No. 5 & 11/2024.
- **Konsultasi Jadwal & Status Layanan:** Cek jadwal jatuh tempo KGB, periode usul KP, simulasi TMT Batas Usia Pensiun (BUP), dan perhitungan kuota cuti tahunan pegawai.
- **Penyusunan Draf Nota Dinas:** Pembuatan draf nota dinas usulan resmi ke pimpinan atau BKPSDM.

Silakan pilih topik cepat di bawah atau ketikkan pertanyaan Anda.`,
      timestamp: '08:00',
      citations: [
        { title: 'UU No. 20 Tahun 2023', pasal: 'Pasal 21 & 24 tentang Hak & Manajemen ASN' },
        { title: 'PP No. 11/2017 jo. PP 17/2020', pasal: 'Manajemen PNS & Batas Usia Pensiun' },
        { title: 'Peraturan BKN No. 4 Tahun 2023', pasal: 'Periodisasi 6 Kali Kenaikan Pangkat' }
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Anomaly detector state (AI-04)
  const [isDetecting, setIsDetecting] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState<any | null>(null);

  // Drafter state (AI-05)
  const [draftType, setDraftType] = useState('Nota Dinas Usulan Kenaikan Gaji Berkala (KGB)');
  const [draftPegawaiNip, setDraftPegawaiNip] = useState(initialDraftItem?.nip || pegawaiList[0]?.nip || '');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftContent, setDraftContent] = useState<string | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    'Kapan jadwal KGB pegawai Rudi Hartono dan bagaimana statusnya saat ini?',
    'Apa syarat Kenaikan Pangkat reguler PNS dan bagaimana pembagian 6 periode BKN?',
    'Berapa Batas Usia Pensiun (BUP) untuk Kepala Pelaksana BPBD vs Pejabat Fungsional?',
    'Bagaimana ketentuan penangguhan sisa cuti tahunan jika ada cuti bersama?',
    'Siapa saja pegawai BPBD yang saat ini status KGB atau KP-nya Terlambat atau Kritis?',
    'Jelaskan perbedaan ketentuan hak cuti dan kenaikan gaji berkala bagi PPPK vs PNS.'
  ];

  const handleSendMessage = async (userPrompt?: string) => {
    const text = userPrompt || inputMessage;
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toTimeString().slice(0, 5)
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      if (data.reply) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toTimeString().slice(0, 5),
          citations: [
            { title: 'Rujukan Regulasi ASN', pasal: 'UU 20/2023 · PP 11/2017 jo PP 17/2020 · Peraturan BKN' }
          ]
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Gagal memproses balasan');
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: `Mohon maaf, sistem mengalami kendala: ${err.message}. Layanan SI_AMIN_LEGA tetap beroperasi normal dengan data master tersimpan.`,
          timestamp: new Date().toTimeString().slice(0, 5)
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run AI-04 Anomaly Detection
  const handleRunAnomalyAudit = async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/gemini/detect-anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setAnomalyResult(data.anomalies);
    } catch (err) {
      console.error(err);
      alert('Gagal mendeteksi anomali data');
    } finally {
      setIsDetecting(false);
    }
  };

  // Run AI-05 Drafting
  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    const targetPeg = pegawaiList.find(p => p.nip === draftPegawaiNip);
    try {
      const res = await fetch('/api/gemini/draft-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisDokumen: draftType,
          targetPegawaiNama: targetPeg?.nama || 'Pegawai BPBD',
          targetNip: targetPeg?.nip || '199102142019031006',
          jenisLayanan: draftType.includes('KGB') ? 'KGB' : draftType.includes('Pangkat') ? 'KP' : 'Pensiun',
          dataTarget: targetPeg
        })
      });
      const data = await res.json();
      setDraftContent(data.draft);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat draf');
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-800">
              Pusat Kecerdasan Buatan (AI-Native Hub) & Chatbot ASN
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Gemini 3.8 Flash (Server-Side)</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Asisten konsultasi regulasi ASN (UU 20/2023, PP 11/2017), deteksi anomali integritas data (AI-04), dan generator draf naskah dinas (AI-05).
          </p>
        </div>

        {/* Subtabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('CHAT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              subTab === 'CHAT' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>Chatbot Regulasi</span>
          </button>
          <button
            onClick={() => setSubTab('ANOMALI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              subTab === 'ANOMALI' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SearchCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Deteksi Anomali</span>
          </button>
          <button
            onClick={() => setSubTab('DRAF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              subTab === 'DRAF' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5 text-blue-400" />
            <span>Draf Nota Dinas</span>
          </button>
          <button
            onClick={() => setSubTab('LOGS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              subTab === 'LOGS' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit Log AI</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: CHATBOT REGULASI */}
      {subTab === 'CHAT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <img
                src="/assets/aistudio/images_f34814fe.jpeg"
                alt="Logo BPBD Kebumen"
                className="w-9 h-9 rounded-full object-contain bg-white border border-amber-400/60 shadow-xs flex-shrink-0"
              />
              <div>
                <h3 className="font-bold text-xs">Asisten Regulasi Kepegawaian ASN Kebumen</h3>
                <p className="text-[10px] text-slate-400">Grounded with UU ASN, PP Manajemen PNS, Perka BKN & Basis Data OPD</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-300">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                <Scale className="w-3 h-3 mr-1 text-amber-400" /> Dokumen Rujukan Resmi
              </span>
              <button
                onClick={() => setMessages([messages[0]])}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 text-[10px]"
                title="Bersihkan Percakapan"
              >
                Reset Chat
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white ${
                      isUser ? 'bg-amber-600' : 'bg-slate-900'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-amber-400" />}
                  </div>

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5 ${isUser ? 'text-right' : ''}`}>
                    <div
                      className={`p-3.5 rounded-2xl shadow-xs whitespace-pre-line text-left leading-relaxed ${
                        isUser
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Citations card for assistant */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="p-2 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-[10px] text-indigo-900 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <BookOpen className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                          <span className="font-semibold truncate">
                            {msg.citations.map(c => `${c.title} (${c.pasal || ''})`).join(' · ')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="text-indigo-700 hover:text-indigo-900 flex items-center space-x-0.5 ml-2"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 px-1">{msg.timestamp}</div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center space-x-2 text-slate-500 text-xs py-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-amber-400">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-600 animate-pulse">
                  Asisten sedang menelaah basis regulasi dan data kepegawaian...
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestions Strip */}
          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 overflow-x-auto no-scrollbar flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
              Pertanyaan Cepat:
            </span>
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-full text-[11px] text-slate-700 whitespace-nowrap transition cursor-pointer font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Tanyakan ketentuan KGB, KP 6 periode, BUP pensiun, cuti tahunan, atau data pegawai..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
              />
              <button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
              >
                <Send className="w-4 h-4 text-amber-400" />
              </button>
            </form>
            <div className="text-[10px] text-slate-400 text-center mt-1.5">
              Jawaban AI bersifat referensi telaah. Keputusan resmi kepegawaian tetap berada pada wewenang admin & SK resmi.
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DETEKSI ANOMALI DATA (AI-04) */}
      {subTab === 'ANOMALI' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <SearchCheck className="w-5 h-5 text-rose-600" />
                <span>Modul AI-04: Deteksi Anomali & Rekonsiliasi Data Kepegawaian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Memindai seluruh riwayat data pegawai untuk mendeteksi KGB yang terlewat, gap kenaikan pangkat, batas pensiun, dan inkonsistensi TMT.
              </p>
            </div>

            <button
              onClick={handleRunAnomalyAudit}
              disabled={isDetecting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-sm transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
              <span>{isDetecting ? 'Memindai Seluruh Pegawai...' : 'Jalankan Audit Anomali'}</span>
            </button>
          </div>

          {anomalyResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
                <div className="font-bold text-sm">Hasil Temuan: Terdeteksi {anomalyResult.totalAnomali} Anomali / Perhatian</div>
                <p className="mt-1 leading-relaxed">{anomalyResult.ringkasanEksekutif}</p>
              </div>

              <div className="space-y-3">
                {anomalyResult.daftarTemuan?.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{item.nama}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.tingkatUrgensi === 'Terlambat' ? 'bg-red-100 text-red-800' :
                        item.tingkatUrgensi === 'Kritis' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {item.jenisLayanan} · {item.tingkatUrgensi}
                      </span>
                    </div>
                    <div className="text-slate-700"><strong>Masalah:</strong> {item.deskripsiMasalah}</div>
                    <div className="text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <strong>Rekomendasi Tindak Lanjut:</strong> {item.rekomendasiTindakLanjut}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Klik tombol "Jalankan Audit Anomali" untuk menganalisis data riwayat 12 pegawai BPBD Kebumen menggunakan Gemini 3.8 Flash.
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: PEMBUAT DRAF NOTA DINAS (AI-05) */}
      {subTab === 'DRAF' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <FileSignature className="w-5 h-5 text-blue-600" />
              <span>Modul AI-05: Generator Draf Naskah Dinas & Usulan Resmi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Menghasilkan draf resmi Nota Dinas usulan Kenaikan Gaji Berkala, Kenaikan Pangkat, atau checklist berkas pensiun sesuai format Pemkab Kebumen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jenis Naskah Dinas</label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl"
              >
                <option value="Nota Dinas Usulan Kenaikan Gaji Berkala (KGB)">Nota Dinas Usulan Kenaikan Gaji Berkala (KGB)</option>
                <option value="Nota Dinas Usulan Kenaikan Pangkat (KP) Reguler">Nota Dinas Usulan Kenaikan Pangkat (KP) Reguler</option>
                <option value="Checklist Verifikasi Dokumen Usulan Pensiun BUP">Checklist Verifikasi Dokumen Usulan Pensiun BUP</option>
                <option value="Ringkasan Mingguan EWS untuk Kepala Pelaksana BPBD">Ringkasan Mingguan EWS untuk Kepala Pelaksana BPBD</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pilih Pegawai Subjek</label>
              <select
                value={draftPegawaiNip}
                onChange={(e) => setDraftPegawaiNip(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl"
              >
                {pegawaiList.map(p => (
                  <option key={p.id} value={p.nip}>
                    {p.nama} ({p.nip}) - {p.jabatan}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerateDraft}
              disabled={isDrafting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-sm transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isDrafting ? 'Menyusun Draf Surat...' : 'Generate Draf Naskah Dinas'}</span>
            </button>
          </div>

          {draftContent && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">Draf Dokumen Siap Verifikasi Admin (Human in the Loop):</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(draftContent);
                    alert('Draf berhasil disalin ke clipboard!');
                  }}
                  className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Salin Teks Naskah
                </button>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto">
                {draftContent}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: AUDIT LOG AI */}
      {subTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Audit Log Transparansi AI (PRD Section 8 & 10)</h3>
              <p className="text-xs text-slate-500">Mencatat model, prompt, skor keyakinan, dan validasi manusia</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/60 text-slate-500 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Modul Fitur</th>
                  <th className="py-3 px-4">Model Digunakan</th>
                  <th className="py-3 px-4">Prompt Ringkas</th>
                  <th className="py-3 px-4">Confidence Score</th>
                  <th className="py-3 px-4">Keputusan Manusia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aiLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.waktu}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{log.fitur}</td>
                    <td className="py-3 px-4 font-mono text-indigo-700">{log.model}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">{log.promptRingkas}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {Math.round(log.skorKeyakinan * 100)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {log.keputusanManusia}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
