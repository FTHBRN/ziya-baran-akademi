'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Search,
  Sparkles,
  Bot,
  MessageSquare,
  Mic,
  Share2,
  HelpCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Check,
  Send,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface SentenceItem {
  id?: string;
  turkish_sentence: string;
  target_hint?: string;
  image_url?: string;
}

interface AiPracticeTest {
  id: string;
  title: string;
  slug: string;
  description?: string;
  created_at: string;
  items?: SentenceItem[];
  itemCount?: number;
}

interface AdminAiPracticeManagerProps {
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export default function AdminAiPracticeManager({ showToast }: AdminAiPracticeManagerProps) {
  const [subTab, setSubTab] = useState<'list' | 'create'>('list');
  const [tests, setTests] = useState<AiPracticeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Sentences list
  const [sentences, setSentences] = useState<SentenceItem[]>([
    { turkish_sentence: '', target_hint: '', image_url: '' },
    { turkish_sentence: '', target_hint: '', image_url: '' },
    { turkish_sentence: '', target_hint: '', image_url: '' },
  ]);

  // Created modal state
  const [createdTestModal, setCreatedTestModal] = useState<{
    title: string;
    slug: string;
    url: string;
  } | null>(null);

  // Fetch tests
  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-tests');
      if (res.ok) {
        const data = await res.json();
        const testList = (data.tests || []).map((t: any) => ({
          ...t,
          itemCount: t.items ? (Array.isArray(t.items) ? t.items.length : t.items[0]?.count || 0) : 0,
        }));
        setTests(testList);
      }
    } catch (err) {
      console.error('Fetch tests error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Filtered tests
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests;
    const q = searchQuery.toLowerCase();
    return tests.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.slug.toLowerCase().includes(q)
    );
  }, [tests, searchQuery]);

  // Add empty sentence
  const handleAddSentence = () => {
    setSentences([...sentences, { turkish_sentence: '', target_hint: '', image_url: '' }]);
  };

  // Remove sentence
  const handleRemoveSentence = (index: number) => {
    if (sentences.length <= 1) {
      showToast('En az bir cümle bulunmalıdır.', 'error');
      return;
    }
    setSentences(sentences.filter((_, idx) => idx !== index));
  };

  // Update sentence field
  const handleUpdateSentence = (index: number, field: keyof SentenceItem, value: string) => {
    const updated = [...sentences];
    updated[index] = { ...updated[index], [field]: value };
    setSentences(updated);
  };

  // Bulk add sentences from textarea
  const handleProcessBulk = () => {
    if (!bulkText.trim()) {
      setShowBulkModal(false);
      return;
    }

    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setShowBulkModal(false);
      return;
    }

    const newItems: SentenceItem[] = lines.map((line) => {
      // Check if user separated with pipe or tab (e.g. "Türkçe Cümle | ipucu | resim")
      const parts = line.split('|').map((p) => p.trim());
      return {
        turkish_sentence: parts[0] || '',
        target_hint: parts[1] || '',
        image_url: parts[2] || '',
      };
    });

    // Remove empty default rows if any
    const existingClean = sentences.filter((s) => s.turkish_sentence.trim().length > 0);
    setSentences([...existingClean, ...newItems]);
    setBulkText('');
    setShowBulkModal(false);
    showToast(`${newItems.length} cümle listeye eklendi!`, 'success');
  };

  // Submit new AI Practice Test
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Lütfen test başlığını girin.', 'error');
      return;
    }

    const validSentences = sentences.filter((s) => s.turkish_sentence.trim().length > 0);
    if (validSentences.length === 0) {
      showToast('Lütfen en az bir Türkçe cümle ekleyin.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        items: validSentences,
      };

      const res = await fetch('/api/admin/ai-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Test oluşturulamadı.');
      }

      const generatedSlug = data.test.slug;
      const shareUrl = `${window.location.origin}/ai-pratik/${generatedSlug}`;

      // Reset form
      setTitle('');
      setSlug('');
      setDescription('');
      setSentences([
        { turkish_sentence: '', target_hint: '', image_url: '' },
        { turkish_sentence: '', target_hint: '', image_url: '' },
        { turkish_sentence: '', target_hint: '', image_url: '' },
      ]);

      showToast('Niko AI Testi başarıyla oluşturuldu!', 'success');
      await fetchTests();

      // Show success modal with shareable link
      setCreatedTestModal({
        title: data.test.title,
        slug: generatedSlug,
        url: shareUrl,
      });
      setSubTab('list');
    } catch (err: any) {
      console.error('Submit error:', err);
      showToast(err.message || 'Bir hata oluştu.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete test
  const handleDeleteTest = async (id: string, testTitle: string) => {
    if (!confirm(`"${testTitle}" testini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/ai-tests?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Test silindi.', 'success');
        fetchTests();
      } else {
        showToast('Silinirken hata oluştu.', 'error');
      }
    } catch {
      showToast('Sunucu hatası oluştu.', 'error');
    }
  };

  // Copy WhatsApp link
  const copyLink = (testSlug: string) => {
    const url = `${window.location.origin}/ai-pratik/${testSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(testSlug);
    showToast('Öğrenci linki panoya kopyalandı!', 'success');
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Open WhatsApp share
  const shareOnWhatsApp = (testTitle: string, testSlug: string) => {
    const url = `${window.location.origin}/ai-pratik/${testSlug}`;
    const text = `Merhaba! 👋 Ziya Baran Akademi'de hazırladığım "${testTitle}" AI Çeviri & Konuşma Atölyesi testine aşağıdaki linkten katılabilirsin:\n\n🔗 ${url}\n\nİster yazarak, ister mikrofonla konuşarak yapay zeka asistanımız Niko ile pratik yapabilirsin. Başarılar!`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Subtab Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Niko AI Testleri ({tests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'create'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Yeni AI Testi Oluştur</span>
          </button>
        </div>

        {subTab === 'list' && (
          <button
            type="button"
            onClick={fetchTests}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
            title="Listeyi Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        )}
      </div>

      {/* SUBTAB 1: TEST LISTESI */}
      {subTab === 'list' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Niko AI Çeviri & Konuşma Atölyesi Hakkında
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Burada oluşturduğunuz testler mobil uygulamadan bağımsız, web tabanlı özel linkler üretir.
                Öğrencileriniz linke tıkladığında hiçbir giriş yapmadan doğrudan teste başlar. Cümleleri ister yazarak,
                ister <b>Groq Whisper mikrofonuyla konuşarak</b> çevirebilirler. Yapay zeka asistanı <b>Niko</b>, öğrencilere
                adım adım rehberlik ederek doğru cümleye ulaşmalarını sağlar.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Test başlığı, açıklama veya slug ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Test Cards */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-medium">Testler yükleniyor...</p>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Henüz AI Pratik Testi Yok</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                İlk yapay zeka destekli çeviri ve konuşma testinizi oluşturarak öğrencilerinize WhatsApp üzerinden özel link paylaşabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('create')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>İlk Testi Oluştur</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTests.map((test) => {
                const isCopied = copiedSlug === test.slug;
                const studentUrl = `/ai-pratik/${test.slug}`;

                return (
                  <div
                    key={test.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              🤖 Niko Atölyesi
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-slate-400" />
                              {test.itemCount || (test.items ? test.items.length : 0)} Cümle
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600">
                            {test.title}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTest(test.id, test.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Testi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {test.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {test.description}
                        </p>
                      )}

                      <div className="text-[11px] text-slate-400 font-mono truncate bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        slug: /{test.slug}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(test.slug)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Kopyalandı!' : 'Linki Kopyala'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => shareOnWhatsApp(test.title, test.slug)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition flex items-center gap-1.5 cursor-pointer"
                          title="WhatsApp İle Gönder"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      <Link
                        href={studentUrl}
                        target="_blank"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>Dene</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: YENI TEST OLUSTUR */}
      {subTab === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header & Quick bulk import CTA */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  <span>Yeni Niko AI Çeviri Testi Oluştur</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Öğrencilerinizin web üzerinden hem yazarak hem konuşarak pratik yapacağı test oluşturun.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>⚡ Toplu Cümle Yapıştır (Hızlı Ekle)</span>
              </button>
            </div>

            {/* Basic Test Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Test Başlığı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Günlük Hayat & Geçmiş Zaman Cümleleri"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Özel Link / Slug <span className="text-slate-400 font-normal">(Opsiyonel)</span>
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white">
                  <span className="text-xs text-slate-400 font-mono select-none">/ai-pratik/</span>
                  <input
                    type="text"
                    placeholder="past-simple-1"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono text-slate-800 focus:outline-none pl-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Açıklama veya Yönerge <span className="text-slate-400 font-normal">(Opsiyonel)</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: Bu testte 30 geçmiş zaman cümlesi bulunmaktadır. İster yazın, ister sesli söyleyin."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sentence Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Cümleler ({sentences.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Öğrenciye sırayla gösterilecek Türkçe cümleler ve opsiyonel ipuçları / görseller.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSentence}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cümle Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {sentences.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                      #{idx + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveSentence(idx)}
                      className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Bu Cümleyi Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Turkish Sentence */}
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Türkçe Cümle <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Dün akşam arkadaşlarımla sinemaya gittim."
                        value={item.turkish_sentence}
                        onChange={(e) => handleUpdateSentence(idx, 'turkish_sentence', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Target Hint (Optional) */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        İpucu Kelimeler <span className="text-slate-400 font-normal">(Opsiyonel)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: go -> went, cinema"
                        value={item.target_hint || ''}
                        onChange={(e) => handleUpdateSentence(idx, 'target_hint', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Image URL (Optional) */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Resim URL <span className="text-slate-400 font-normal">(Opsiyonel)</span>
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={item.image_url || ''}
                        onChange={(e) => handleUpdateSentence(idx, 'image_url', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add & Submit Buttons */}
            <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={handleAddSentence}
                className="px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Yeni Cümle Satırı Ekle</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>🚀 Niko AI Pratik Testini Yayınla</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* BULK IMPORT MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Toplu Cümle Yapıştır (Hızlı Ekle)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Her satıra bir Türkçe cümle yazın veya Word/Not defterinizden kopyalayıp buraya yapıştırın.
              İsterseniz yanına dik çizgi <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">|</code> koyarak
              ipucu veya resim linki de ekleyebilirsiniz.
            </p>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono space-y-1">
              <p className="font-semibold text-slate-700">Örnek Format:</p>
              <p>Dün arkadaşımla sinemaya gittim.</p>
              <p>Yarın sabah erken uyanmam gerek. | wake up early</p>
              <p>Kahve içmeyi çok severim. | like coffee | https://image.url</p>
            </div>

            <textarea
              rows={8}
              placeholder="Cümlelerinizi buraya alt alta yapıştırın..."
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleProcessBulk}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cümleleri Listeye Aktar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATED TEST SUCCESS MODAL */}
      {createdTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                Testiniz Başarıyla Hazırlandı! 🎉
              </h3>
              <p className="text-xs text-slate-600">
                <b>"{createdTestModal.title}"</b> testi yayınlandı. Bu bağlantıyı kopyalayarak WhatsApp üzerinden öğrencilerinize hemen gönderebilirsiniz.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Öğrenci Doğrudan Erişim Linki
              </span>
              <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-mono text-slate-800 truncate">
                  {createdTestModal.url}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdTestModal.url);
                    showToast('Link panoya kopyalandı!', 'success');
                  }}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition shrink-0 cursor-pointer"
                  title="Linki Kopyala"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Merhaba! 👋 Ziya Baran Akademi'de hazırladığım "${createdTestModal.title}" AI Çeviri & Konuşma Atölyesi testine aşağıdaki linkten katılabilirsin:\n\n🔗 ${createdTestModal.url}\n\nİster yazarak, ister mikrofonla konuşarak yapay zeka asistanımız Niko ile pratik yapabilirsin. Başarılar!`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp İle Paylaş</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/ai-pratik/${createdTestModal.slug}`}
                  target="_blank"
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Hemen Test Et</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setCreatedTestModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
