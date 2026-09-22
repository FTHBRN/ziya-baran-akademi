'use client';

import { useState } from 'react';
import { Copy, Check, Send, ExternalLink, X, Share2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export interface ShareItem {
  title: string;
  url: string;
  type: 'set' | 'folder' | 'module' | 'story' | 'test';
  subtitle?: string;
}

interface ShareModalProps {
  item: ShareItem | null;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const TYPE_CONFIG = {
  set: { label: 'Kelime Seti', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  folder: { label: 'Klasör', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  module: { label: 'Modül', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  story: { label: 'Hikâye', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  test: { label: 'Test / Quiz', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function ShareModal({ item, onClose, showToast }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const typeInfo = TYPE_CONFIG[item.type] || { label: 'İçerik', color: 'bg-slate-100 text-slate-700 border-slate-200' };

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    triggerHaptic('success');
    if (showToast) showToast('Bağlantı kopyalandı!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    triggerHaptic('selection');
    const msg = encodeURIComponent(
      `Sevgili öğrenciler, "${item.title}" ${typeInfo.label.toLowerCase()} çalışmamız hazır!\n\nBuradan hemen çalışmaya başlayabilirsiniz:\n${item.url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Paylaşım Bağlantısı</h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Info */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <p className="font-bold text-slate-900 text-sm">{item.title}</p>
          {item.subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.subtitle}</p>
          )}
        </div>

        {/* Link Input + Copy Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600">Öğrenci Erişim Linki</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={item.url}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={handleWhatsApp}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp ile Paylaş</span>
          </button>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>Öğrenci Gözüyle Sayfayı Aç</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>
    </div>
  );
}
