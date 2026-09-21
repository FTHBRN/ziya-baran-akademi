'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Send,
  Copy,
  ArrowRight,
  Search,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  CheckSquare,
  Table,
  HelpCircle,
  FileQuestion,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export interface TestQuestionInput {
  question_text: string;
  image_url: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

interface AdminTestManagerProps {
  classes: any[];
  testsList: any[];
  onRefresh: () => Promise<void> | void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export default function AdminTestManager({
  classes,
  testsList,
  onRefresh,
  showToast,
}: AdminTestManagerProps) {
  const [subTab, setSubTab] = useState<'create' | 'list'>('create');
  const [editingTestId, setEditingTestId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [questions, setQuestions] = useState<TestQuestionInput[]>([
    {
      question_text: '',
      image_url: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      explanation: '',
    },
    {
      question_text: '',
      image_url: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      explanation: '',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 6-Column Excel Bulk Import Modal state
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelInput, setExcelInput] = useState('');

  // Available folders cascading from selected class
  const availableFolders = useMemo(() => {
    if (!classId) return [];
    const cls = classes.find((c) => c.id === classId);
    return cls?.folders || [];
  }, [classId, classes]);

  // Update a single question field
  const handleUpdateQuestion = (
    index: number,
    field: keyof TestQuestionInput,
    value: any
  ) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add question
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        image_url: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
      },
    ]);
  };

  // Remove question
  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      showToast('En az 1 soru bulunmalıdır.', 'error');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Move question order
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    setQuestions((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[target];
      updated[target] = temp;
      return updated;
    });
  };

  // 6-Column Excel / Google Sheets Parser
  const parseExcelData = (rawText: string): TestQuestionInput[] => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: TestQuestionInput[] = [];

    for (const line of lines) {
      // Delimiter detection: Tab (\t) is standard for Excel/Sheets copy-paste.
      // Fallback to pipe (|), semicolon (;), or comma (,)
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else {
        parts = line.split(',');
      }

      parts = parts.map((p) => p.trim());

      // We need at least question text and 4 choices (5 parts)
      if (parts.length >= 5) {
        const question_text = parts[0] || '';
        const option_a = parts[1] || '';
        const option_b = parts[2] || '';
        const option_c = parts[3] || '';
        const option_d = parts[4] || '';
        const rawCorrect = (parts[5] || 'A').trim().toUpperCase();
        const explanation = (parts[6] || '').trim(); // 7th column for explanation / hint

        // Match correct option: A, B, C, D or match option texts
        let correct_option: 'A' | 'B' | 'C' | 'D' = 'A';
        if (['A', 'B', 'C', 'D'].includes(rawCorrect)) {
          correct_option = rawCorrect as 'A' | 'B' | 'C' | 'D';
        } else {
          const norm = rawCorrect.toLowerCase();
          if (norm === option_a.toLowerCase()) correct_option = 'A';
          else if (norm === option_b.toLowerCase()) correct_option = 'B';
          else if (norm === option_c.toLowerCase()) correct_option = 'C';
          else if (norm === option_d.toLowerCase()) correct_option = 'D';
        }

        if (question_text) {
          parsed.push({
            question_text,
            image_url: '',
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            explanation,
          });
        }
      }
    }
    return parsed;
  };

  const handleApplyExcelImport = () => {
    if (!excelInput.trim()) {
      showToast('Lütfen Excel tablonuzdan kopyaladığınız metni yapıştırın.', 'error');
      return;
    }

    const parsed = parseExcelData(excelInput);
    if (parsed.length === 0) {
      showToast(
        'Format okunamadı. Lütfen satırların en az 6 sütun (Soru, A, B, C, D, Doğru Şık) veya 7 sütun (+ İpucu) içerdiğinden emin olun.',
        'error'
      );
      return;
    }

    setQuestions(parsed);
    setShowExcelModal(false);
    setExcelInput('');
    showToast(`${parsed.length} soru başarıyla içe aktarıldı! 🎉`);
  };

  const handleFillSampleExcel = () => {
    const sample = `What is the capital of England?\tLondon\tParis\tBerlin\tMadrid\tA\tLondon is the capital and largest city of England.
Which animal can fly?\tDog\tCat\tEagle\tElephant\tC\tEagles are large birds with powerful wings.
Choose the correct past form of "go":\tGone\tWent\tGoes\tGoing\tB\t"Went" is the irregular past simple (V2) form of "go".
What color is the sky on a sunny day?\tGreen\tYellow\tRed\tBlue\tD\tThe sky appears blue due to sunlight scattering.`;
    setExcelInput(sample);
  };

  // Reset form
  const handleResetForm = () => {
    setEditingTestId(null);
    setTitle('');
    setDescription('');
    setClassId('');
    setFolderId('');
    setQuestions([
      {
        question_text: '',
        image_url: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
      },
      {
        question_text: '',
        image_url: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
      },
    ]);
    setCreatedUrl(null);
  };

  // Save / Publish Test
  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Lütfen test başlığını yazın.', 'error');
      return;
    }

    const validQuestions = questions.filter((q) => q.question_text.trim().length > 0);
    if (validQuestions.length === 0) {
      showToast('Lütfen en az 1 soru ekleyin.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTestId) {
        const res = await fetch('/api/admin/update-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            test_id: editingTestId,
            folder_id: folderId || null,
            title: title.trim(),
            description: description.trim() || null,
            questions: validQuestions,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Test başarıyla güncellendi!');
          setEditingTestId(null);
          setCreatedUrl(`/test/${data.test.slug}`);
          onRefresh();
        } else {
          showToast('Güncelleme hatası: ' + data.error, 'error');
        }
      } else {
        const res = await fetch('/api/admin/create-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder_id: folderId || null,
            title: title.trim(),
            description: description.trim() || null,
            questions: validQuestions,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCreatedUrl(data.shareUrl);
          showToast('Test başarıyla oluşturuldu ve yayınlandı!');
          onRefresh();
        } else {
          showToast('Kayıt başarısız: ' + data.error, 'error');
        }
      }
    } catch (err: any) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Editing Test
  const handleStartEditTest = (testObj: any) => {
    setEditingTestId(testObj.id);
    setTitle(testObj.title || '');
    setDescription(testObj.description || '');

    if (testObj.folders?.class_id) {
      setClassId(testObj.folders.class_id);
    }
    if (testObj.folder_id) {
      setFolderId(testObj.folder_id);
    }

    const sorted = (testObj.test_questions || [])
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      .map((q: any) => ({
        question_text: q.question_text || '',
        image_url: q.image_url || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_option: (q.correct_option || 'A') as 'A' | 'B' | 'C' | 'D',
        explanation: q.explanation || '',
      }));

    if (sorted.length > 0) {
      setQuestions(sorted);
    } else {
      setQuestions([
        {
          question_text: '',
          image_url: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_option: 'A',
          explanation: '',
        },
      ]);
    }

    setCreatedUrl(null);
    setSubTab('create');
  };

  // Delete Test
  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (
      !window.confirm(
        `"${testTitle}" testini ve tüm sorularını silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/admin/delete-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Test silindi.');
        onRefresh();
      } else {
        showToast('Silme hatası: ' + data.error, 'error');
      }
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  // Filtered tests list
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return testsList;
    const q = searchQuery.toLowerCase().trim();
    return testsList.filter((t) => t.title?.toLowerCase().includes(q));
  }, [testsList, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('create')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              subTab === 'create'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {editingTestId ? '✏️ Testi Düzenle' : '➕ Yeni Test Oluştur'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              subTab === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Tüm Testler ({testsList.length})
          </button>
        </div>

        {subTab === 'create' && (
          <button
            type="button"
            onClick={() => setShowExcelModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-xs shadow-2xs transition"
          >
            <Table className="w-4 h-4 text-emerald-600" />
            <span>📊 Excel'den 6 Sütunlu Yükle</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: CREATE OR EDIT TEST                             */}
      {/* ========================================================= */}
      {subTab === 'create' && (
        <form onSubmit={handleSaveTest} className="space-y-6">
          {/* Editing Mode Notice */}
          {editingTestId && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs sm:text-sm">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Şu anda "{title}" testini düzenliyorsunuz.</span>
              </div>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition"
              >
                Düzenlemeyi İptal Et
              </button>
            </div>
          )}

          {/* Success / Share Alert */}
          {createdUrl && (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm sm:text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Test Başarıyla Yayında! Öğrencilerinizle Paylaşabilirsiniz:</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${createdUrl}`}
                  className="flex-1 px-3 py-2 bg-white rounded-xl border border-emerald-200 text-xs font-mono text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}${createdUrl}`;
                    navigator.clipboard.writeText(fullUrl);
                    showToast('Test linki kopyalandı! 🎉');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Linki Kopyala</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}${createdUrl}`;
                    const text = encodeURIComponent(
                      `Sevgili öğrenciler, "${title}" İngilizce testimiz hazır:\n${fullUrl}`
                    );
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <Link
                  href={createdUrl}
                  target="_blank"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
                >
                  <span>Testi Çöz</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Test Meta Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Test Temel Bilgileri & Konum</span>
            </h3>

            {/* Class & Folder Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Modül Seçin (İsteğe Bağlı):
                </label>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setFolderId('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Modül Seçin (veya Genel) --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Klasör Seçin:
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  disabled={!classId}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Klasör Seçin --</option>
                  {availableFolders.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Test Title & Description */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Test Başlığı <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: 5. Sınıf Simple Past Tense 4-Şıklı Test"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Test Açıklaması / Alt Başlık (İsteğe Bağlı):
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Örn: 1. Dönem 1. Yazılı Hazırlık Değerlendirme Soruları"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-normal text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-blue-600" />
                <span>Test Soruları ({questions.length} Soru)</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExcelModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Excel'den Yapıştır</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Soru Ekle</span>
                </button>
              </div>
            </div>

            {questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4 relative group"
              >
                {/* Question Header & Order Controls */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Soru {idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
                      title="Yukarı Taşı"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition"
                      title="Aşağı Taşı"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                      title="Soruyu Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Soru Metni */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Soru Metni <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={2}
                    value={q.question_text}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, 'question_text', e.target.value)
                    }
                    placeholder="Soru cümlesini veya metnini yazın..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Soru Görsel URL'si (Opsiyonel) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Soru Görseli URL (İsteğe Bağlı):</span>
                    </span>
                    {q.image_url && (
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(idx, 'image_url', '')}
                        className="text-[11px] text-rose-500 hover:underline"
                      >
                        Görseli Kaldır
                      </button>
                    )}
                  </label>
                  <input
                    type="url"
                    value={q.image_url}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, 'image_url', e.target.value)
                    }
                    placeholder="https://... (Görsel bağlantısı)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-normal text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  {q.image_url && (
                    <div className="pt-1">
                      <img
                        src={q.image_url}
                        alt="Önizleme"
                        className="h-20 w-auto rounded-lg border border-slate-200 object-cover shadow-2xs"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 4 Şık (A, B, C, D) ve Doğru Şık Seçimi */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Şıklar ve Doğru Cevap:
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Yeşil daire işaretli olan şık doğru cevaptır.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const fieldKey = `option_${letter.toLowerCase()}` as keyof TestQuestionInput;
                      const isCorrect = q.correct_option === letter;

                      return (
                        <div
                          key={letter}
                          className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                              : 'bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuestion(idx, 'correct_option', letter)
                            }
                            className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                            title={`Doğru cevap olarak ${letter} şıkkını seç`}
                          >
                            {letter}
                          </button>

                          <input
                            type="text"
                            value={q[fieldKey] as string}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, fieldKey, e.target.value)
                            }
                            placeholder={`${letter} Şıkkı metni...`}
                            className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateQuestion(idx, 'correct_option', letter)
                            }
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md shrink-0 transition ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                          >
                            {isCorrect ? '✓ Doğru' : 'Seç'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Soru Açıklaması / Çözüm Notu (Opsiyonel) */}
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">
                    Açıklama / Çözüm İpucu (Öğrenci cevabı gördükten sonra gösterilir, opsiyonel):
                  </label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, 'explanation', e.target.value)
                    }
                    placeholder="Örn: 'Yesterday' geçmiş zaman zarfı olduğu için fiil 2. halde kullanılır."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-normal text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 text-slate-600 hover:text-blue-600 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Soru Ekle</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {editingTestId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
              >
                Vazgeç
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    {editingTestId
                      ? 'Değişiklikleri Güncelle'
                      : 'Testi Kaydet ve Yayınla'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: LIST OF ALL TESTS                               */}
      {/* ========================================================= */}
      {subTab === 'list' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test adı veya konu ara..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {filteredTests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs sm:text-sm">
              Henüz test bulunmuyor veya aramayla eşleşen sonuç yok.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTests.map((test) => {
                const qCount = test.test_questions?.length || 0;
                const shareUrl = `/test/${test.slug}`;

                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                          {test.folders?.classes?.name || 'Genel'}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-600 font-medium">
                          {test.folders?.name || 'Genel Testler'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold ml-1">
                          {qCount} Soru
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base">
                        {test.title}
                      </h4>

                      {test.description && (
                        <p className="text-xs text-slate-500 line-clamp-1 font-normal">
                          {test.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Link
                        href={shareUrl}
                        target="_blank"
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition"
                        title="Öğrenci Görünümünde Çöz"
                      >
                        <span>Çöz</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          const fullUrl = `${window.location.origin}${shareUrl}`;
                          navigator.clipboard.writeText(fullUrl);
                          showToast('Test linki kopyalandı! 🎉');
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Linki Kopyala"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const fullUrl = `${window.location.origin}${shareUrl}`;
                          const text = encodeURIComponent(
                            `Sevgili öğrenciler, "${test.title}" İngilizce testimiz hazır:\n${fullUrl}`
                          );
                          window.open(
                            `https://api.whatsapp.com/send?text=${text}`,
                            '_blank'
                          );
                        }}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                        title="WhatsApp'ta Paylaş"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditTest(test)}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition"
                        title="Testi Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTest(test.id, test.title)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Testi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 6-COLUMN EXCEL BULK IMPORT MODAL                          */}
      {/* ========================================================= */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Excel'den 6 veya 7 Sütunlu Test İçe Aktar
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Excel veya Google E-Tablolar'dan kopyaladığınız tabloyu yapıştırın.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExcelModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Instructions Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sütun Sıralaması (6 veya 7 Sütun):</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px] pt-1">
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                    1. Soru Metni
                  </span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                    2. A Şıkkı
                  </span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                    3. B Şıkkı
                  </span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                    4. C Şıkkı
                  </span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200">
                    5. D Şıkkı
                  </span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200 font-bold text-emerald-700">
                    6. Doğru Şık
                  </span>
                  <span className="bg-white/80 px-2 py-1 rounded-md border border-emerald-200 sm:col-span-2 text-indigo-700 font-semibold">
                    7. İpucu / Açıklama (Opsiyonel)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 pt-1 font-normal">
                  * 7. sütun (İpucu/Açıklama) isteğe bağlıdır. Dilerseniz sadece ilk 6 sütunu da yapıştırabilirsiniz.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Kopyalanan Tabloyu Buraya Yapıştırın:
                  </label>
                  <button
                    type="button"
                    onClick={handleFillSampleExcel}
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Örnek Veri Doldur
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={excelInput}
                  onChange={(e) => setExcelInput(e.target.value)}
                  placeholder={`Örnek:\nWhat is the capital of England?\tLondon\tParis\tBerlin\tMadrid\tA\nWhich animal can fly?\tDog\tCat\tEagle\tElephant\tC`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowExcelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleApplyExcelImport}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabloyu Ayrıştır ve Ekle</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
