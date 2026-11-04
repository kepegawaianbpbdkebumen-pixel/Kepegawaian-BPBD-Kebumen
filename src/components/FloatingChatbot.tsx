import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User, Minimize2, Maximize2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface FloatingChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ isOpen, onToggle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'float-welcome',
      role: 'assistant',
      content: 'Halo! Saya Asisten AI SI_AMIN_LEGA BPBD Kebumen. Tanyakan apa saja seputar regulasi KGB, KP 6 periode BKN, Batas Usia Pensiun, atau aturan cuti ASN.',
      timestamp: '08:00'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const text = customText || inputMessage;
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
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toTimeString().slice(0, 5)
          }
        ]);
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: 'Maaf, terjadi kesalahan koneksi. Silakan coba kembali.',
          timestamp: new Date().toTimeString().slice(0, 5)
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const quickChips = [
    'Jadwal KGB Rudi Hartono',
    'Aturan 6 Periode KP BKN',
    'Syarat Cuti Melahirkan',
    'BUP Pensiun 58 vs 60'
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 p-2.5 rounded-full bg-slate-900 shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-2 group cursor-pointer border-2 border-amber-400 ring-4 ring-slate-900/30"
        title="Buka Chatbot Asisten AI SI_AMIN_LEGA"
      >
        <img
          src="/assets/aistudio/images_f34814fe.jpeg"
          alt="Logo BPBD"
          className="w-8 h-8 rounded-full object-contain bg-white"
        />
        <span className="font-bold text-xs text-amber-300 pr-1.5 hidden sm:inline">Tanya Chatbot AI</span>
        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 absolute top-0.5 right-0.5 ring-2 ring-slate-900" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Widget Header */}
      <div className="bg-slate-900 text-white p-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <img
            src="/assets/aistudio/images_f34814fe.jpeg"
            alt="Logo BPBD Kebumen"
            className="w-8 h-8 rounded-full object-contain bg-white border border-amber-400/60"
          />
          <div>
            <h4 className="font-bold text-xs">Chatbot AI SI_AMIN_LEGA</h4>
            <span className="text-[10px] text-emerald-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 inline-block" /> Online · Gemini 3.8 Flash
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/70 text-xs">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-white flex-shrink-0 ${
                  isUser ? 'bg-amber-600' : 'bg-slate-900'
                }`}
              >
                {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-amber-400" />}
              </div>
              <div
                className={`p-2.5 rounded-xl max-w-[82%] whitespace-pre-line leading-relaxed ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs italic">
            <Bot className="w-4 h-4 text-amber-500 animate-spin" />
            <span>Asisten sedang mengetik...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Chips */}
      <div className="p-1.5 bg-slate-100 border-t border-slate-200 flex space-x-1 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-slate-200 rounded-full text-[10px] text-slate-700 whitespace-nowrap transition cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2.5 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-1.5"
        >
          <input
            type="text"
            placeholder="Tuliskan pertanyaan kepegawaian..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl transition"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </form>
      </div>
    </div>
  );
};
