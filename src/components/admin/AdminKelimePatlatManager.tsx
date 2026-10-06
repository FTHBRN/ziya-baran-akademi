'use client';

import { useState, useEffect } from 'react';
import {
  Gamepad2,
  Plus,
  Trash2,
  Edit2,
  Search,
  Save,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';
import { WordPair, DEFAULT_KELIME_PATLAT_WORDS } from '@/lib/kelime-patlat-words';

export default function AdminKelimePatlatManager() {
  const [words, setWords] = useState<WordPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Add Single Word
  const [newEn, setNewEn] = useState('');
  const [newTr, setNewTr] = useState('');

  // Bulk Add Modal/State
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEn, setEditEn] = useState('');
  const [editTr, setEditTr] = useState('');

  useEffect(() => {
    fetchWords();
  }, []);

  async function fetchWords() {
    setLoading(true);
    try {
      const res = await fetch('/api/kelime-patlat');
      const data = await res.json();
      if (Array.isArray(data.words)) {
        setWords(data.words);
      }
    } catch (err: any) {
      console.error('Fetch words error:', err);
      setMessage({ type: 'error', text: 'Kelimeler yüklenirken hata oluştu.' });
    } finally {
      setLoading(false);
    }
  }

  async function saveWordsToServer(updatedList: WordPair[]) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/kelime-patlat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', words: updatedList }),
      });

      if (!res.ok) throw new Error('Kaydedilemedi');

      setWords(updatedList);
      setMessage({ type: 'success', text: 'Kelimeler başarıyla güncellendi ve kaydedildi!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Kaydetme hatası: ' + err.message });
    } finally {
      setSaving(false);
    }
  }

  // 1. Add Single Word
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEn.trim() || !newTr.trim()) {
      setMessage({ type: 'error', text: 'Lütfen hem İngilizce hem Türkçe kelimeyi yazın.' });
      return;
    }

    const newPair: WordPair = {
      id: `kp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      en: newEn.trim(),
      tr: newTr.trim(),
    };

    const updated = [newPair, ...words];
    saveWordsToServer(updated);
    setNewEn('');
    setNewTr('');
  };

  // 2. Bulk Add Words
  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n');
    const newItems: WordPair[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Split by ' - ', ' = ', ':', or tab
      let parts: string[] = [];
      if (trimmed.includes(' - ')) parts = trimmed.split(' - ');
      else if (trimmed.includes(' = ')) parts = trimmed.split(' = ');
      else if (trimmed.includes(':')) parts = trimmed.split(':');
      else if (trimmed.includes('\t')) parts = trimmed.split('\t');
      else if (trimmed.includes(',')) parts = trimmed.split(',');

      if (parts.length >= 2) {
        const en = parts[0].trim();
        const tr = parts[1].trim();
        if (en && tr) {
          newItems.push({
            id: `kp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            en,
            tr,
          });
        }
      }
    });

    if (newItems.length === 0) {
      setMessage({
        type: 'error',
        text: 'Geçerli formatta kelime bulunamadı. Örnek format: Apple - Elma',
      });
      return;
    }

    const updated = [...newItems, ...words];
    saveWordsToServer(updated);
    setBulkText('');
    setShowBulkAdd(false);
  };

  // 3. Delete Word
  const handleDeleteWord = (id: string) => {
    if (!confirm('Bu kelimeyi silmek istediğinize emin misiniz?')) return;
    const updated = words.filter((w) => w.id !== id);
    saveWordsToServer(updated);
  };

  // 4. Save Edit Inline
  const handleSaveEdit = (id: string) => {
    if (!editEn.trim() || !editTr.trim()) return;
    const updated = words.map((w) =>
      w.id === id ? { ...w, en: editEn.trim(), tr: editTr.trim() } : w
    );
    saveWordsToServer(updated);
    setEditingId(null);
  };

  // 5. Reset to defaults
  const handleResetDefaults = async () => {
    if (
      !confirm(
        'Varsayılan 80 adet popüler kelime listesine dönmek istediğinize emin misiniz? Özel ekledikleriniz sıfırlanır.'
      )
    )
      return;

    setSaving(true);
    try {
      const res = await fetch('/api/kelime-patlat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (!res.ok) throw new Error('Sıfırlanamadı');
      setWords(DEFAULT_KELIME_PATLAT_WORDS);
      setMessage({ type: 'success', text: 'Varsayılan kelime listesi geri yüklendi!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Sıfırlama hatası: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Filter words
  const filteredWords = words.filter(
    (w) =>
      w.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm mb-1">
            <Zap className="w-4 h-4 fill-amber-500" />
            <span>Oyun Yönetimi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Kelime Patlat Havuzu
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Oyunda çıkan 5'li İngilizce - Türkçe eşleştirme kart havuzunu buradan yönetebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/kelime-patlat"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition"
          >
            <span>💥 Kelime Patlat</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="/kelime-kosusu"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition"
          >
            <span>🏃‍♂️ Kelime Koşusu</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleResetDefaults}
            disabled={saving}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Varsayılan kelimeleri geri yükle"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Varsayılanlar</span>
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add Forms Container */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-600" />
            <span>Yeni Kelime Ekle</span>
          </h3>

          <button
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showBulkAdd ? 'Tekli Eklemeye Dön' : 'Toplu Kelime Yapıştır'}</span>
          </button>
        </div>

        {/* 1. Single Add */}
        {!showBulkAdd ? (
          <form onSubmit={handleAddSingle} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="İngilizce (Örn: Apple)"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-600 focus:bg-white transition"
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Türkçe (Örn: Elma)"
                value={newTr}
                onChange={(e) => setNewTr(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:border-brand-600 focus:bg-white transition"
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                disabled={saving || !newEn.trim() || !newTr.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm shadow-brand-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Ekle</span>
              </button>
            </div>
          </form>
        ) : (
          /* 2. Bulk Add */
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Her satıra bir kelime çifti gelecek şekilde yapıştırın. Örnek: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Apple - Elma</code> veya <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Book = Kitap</code>
            </p>
            <textarea
              rows={5}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Apple - Elma\nBook - Kitap\nWater - Su`}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-brand-600 focus:bg-white transition"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkAdd(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={saving || !bulkText.trim()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                Tümünü Havuza Ekle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Words List Header & Search */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">Aktif Kelime Listesi</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {words.length} Kelime
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Kelime ara (İngilizce/Türkçe)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-brand-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            Kelimeler yükleniyor...
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Aramaya uygun kelime bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredWords.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between gap-2"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editEn}
                        onChange={(e) => setEditEn(e.target.value)}
                        className="w-1/2 px-2 py-1 rounded bg-white border border-brand-500 text-xs font-semibold"
                      />
                      <span className="text-slate-400 text-xs">-</span>
                      <input
                        type="text"
                        value={editTr}
                        onChange={(e) => setEditTr(e.target.value)}
                        className="w-1/2 px-2 py-1 rounded bg-white border border-brand-500 text-xs font-semibold"
                      />
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        title="Kaydet"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-slate-900 text-xs truncate">{item.en}</span>
                      <span className="text-slate-400 text-xs">↔</span>
                      <span className="text-slate-600 text-xs truncate">{item.tr}</span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditEn(item.en);
                          setEditTr(item.tr);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-200/60 transition"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWord(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
