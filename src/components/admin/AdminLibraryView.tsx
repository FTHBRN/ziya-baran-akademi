'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Folder,
  Layers,
  Sparkles,
  CheckSquare,
  Search,
  Share2,
  ExternalLink,
  Edit3,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  KeyRound,
  MoveRight,
  FolderPlus,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { decodeModuleMetadata, MODULE_THEMES } from '@/lib/module-utils';
import { decodeSetDescription } from '@/lib/set-utils';
import { ShareItem } from './ShareModal';
import AdminSettingsManager from './AdminSettingsManager';

interface AdminLibraryViewProps {
  classes: any[];
  allSetsList: any[];
  storiesList: any[];
  testsList: any[];
  onShare: (item: ShareItem) => void;
  onEditSet: (setObj: any, classObj?: any, folderObj?: any) => void;
  onDeleteSet: (id: string, title: string) => void;
  onMoveSet: (setObj: any, currentFolderId: string) => void;
  onOpenSetAiModal: (setObj: any) => void;
  onReorderModule: (classId: string, direction: 'up' | 'down') => void;
  onStartEditModule: (classObj: any) => void;
  onDeleteModule: (classId: string, name: string) => void;
  onCreateContent: (type: 'set' | 'story-set' | 'module' | 'test', classId?: string, folderId?: string) => void;
  onQuickAddFolder: (classId: string) => void;
  onEditStory: (story: any) => void;
  onDeleteStory: (id: string, title: string) => void;
  onEditTest: (test: any) => void;
  onDeleteTest: (id: string, title: string) => void;
}

type LibraryFilter = 'all' | 'sets' | 'modules' | 'stories' | 'tests' | 'settings';

export default function AdminLibraryView({
  classes,
  allSetsList,
  storiesList,
  testsList,
  onShare,
  onEditSet,
  onDeleteSet,
  onMoveSet,
  onOpenSetAiModal,
  onReorderModule,
  onStartEditModule,
  onDeleteModule,
  onCreateContent,
  onQuickAddFolder,
  onEditStory,
  onDeleteStory,
  onEditTest,
  onDeleteTest,
}: AdminLibraryViewProps) {
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Total folders count
  const totalFoldersCount = useMemo(() => {
    return classes.reduce((acc, c) => acc + (c.folders?.length || 0), 0);
  }, [classes]);

  // Filtered sets
  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) return allSetsList;
    const q = searchQuery.toLowerCase().trim();
    return allSetsList.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.folderName?.toLowerCase().includes(q)
    );
  }, [allSetsList, searchQuery]);

  // Filtered modules
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const q = searchQuery.toLowerCase().trim();
    return classes.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.folders?.some((f: any) => f.name?.toLowerCase().includes(q))
    );
  }, [classes, searchQuery]);

  // Filtered stories
  const filteredStories = useMemo(() => {
    if (!searchQuery.trim()) return storiesList;
    const q = searchQuery.toLowerCase().trim();
    return storiesList.filter(
      (st) =>
        st.title?.toLowerCase().includes(q) ||
        st.folders?.name?.toLowerCase().includes(q)
    );
  }, [storiesList, searchQuery]);

  // Filtered tests
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return testsList;
    const q = searchQuery.toLowerCase().trim();
    return testsList.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.folders?.name?.toLowerCase().includes(q)
    );
  }, [testsList, searchQuery]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ziya-baran-akademi.vercel.app';

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats Overview Bar (Quizlet / LMS Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('sets')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'sets'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
              Setler
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{allSetsList.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Kelime & Çalışma Seti</div>
        </button>

        <button
          onClick={() => setFilter('modules')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'modules'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/40'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-600 mb-1.5">
            <Layers className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full">
              Hiyerarşi
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{classes.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">{totalFoldersCount} Konu Klasörü</div>
        </button>

        <button
          onClick={() => setFilter('stories')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'stories'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1.5">
            <Sparkles className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
              Hikâyeler
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{storiesList.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Sesli & Resimli E-Book</div>
        </button>

        <button
          onClick={() => setFilter('tests')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filter === 'tests'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/40'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1.5">
            <CheckSquare className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full">
              Testler
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{testsList.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Çoktan Seçmeli Sınav</div>
        </button>
      </div>

      {/* 2. Filter Pills & Instant Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Tüm İçerikler
            </button>

            <button
              onClick={() => setFilter('sets')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'sets'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              Setler ({allSetsList.length})
            </button>

            <button
              onClick={() => setFilter('modules')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'modules'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              Modüller & Klasörler ({classes.length})
            </button>

            <button
              onClick={() => setFilter('stories')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'stories'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              Hikâyeler ({storiesList.length})
            </button>

            <button
              onClick={() => setFilter('tests')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === 'tests'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              Testler ({testsList.length})
            </button>

            <button
              onClick={() => setFilter('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                filter === 'settings'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Şifre & Güvenlik</span>
            </button>
          </div>

          {/* Instant Search Bar */}
          {filter !== 'settings' && (
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İçerik, konu veya set ara..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. SETTINGS TAB */}
      {filter === 'settings' && <AdminSettingsManager />}

      {/* 4. MODULES & FOLDERS VIEW (When filter is 'all' or 'modules') */}
      {(filter === 'all' || filter === 'modules') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Modüller ve Konu Klasörleri ({filteredClasses.length})</span>
            </h3>
            <button
              onClick={() => onCreateContent('module')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Modül / Sınıf Ekle</span>
            </button>
          </div>

          <div className="space-y-4">
            {filteredClasses.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Aramayla eşleşen modül bulunamadı.
              </div>
            ) : (
              filteredClasses.map((c, idx) => {
                const meta = decodeModuleMetadata(c.description, c.order_index || idx, c.name);
                const theme = MODULE_THEMES[meta.theme];
                const moduleShareUrl = `${origin}/module/${c.slug}`;

                let totalSetsCount = 0;
                (c.folders || []).forEach((f: any) => {
                  totalSetsCount += (f.sets?.length || 0);
                });

                return (
                  <div
                    key={c.id}
                    className={`rounded-3xl border ${theme.border} ${theme.cardBg} p-5 space-y-4 shadow-xs transition-all`}
                  >
                    {/* Module Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-base">{c.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 text-slate-700 border border-slate-200">
                              {c.folders?.length || 0} Klasör • {totalSetsCount} Set
                            </span>
                          </div>
                          {meta.description && (
                            <p className="text-xs text-slate-600 font-medium line-clamp-1">{meta.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Module Controls & Universal Share */}
                      <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                        {/* Universal Share Button for this Module */}
                        <button
                          type="button"
                          onClick={() =>
                            onShare({
                              title: c.name,
                              url: moduleShareUrl,
                              type: 'module',
                              subtitle: meta.description || 'Modül ve tüm konu içerikleri',
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                          title="Modülün Öğrenci Linkini Paylaş"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Modülü Paylaş</span>
                        </button>

                        <Link
                          href={`/module/${c.slug}`}
                          target="_blank"
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                          title="Öğrenci Görünümünde Aç"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onReorderModule(c.id, 'up')}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                          title="Yukarı Taşı"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === classes.length - 1}
                          onClick={() => onReorderModule(c.id, 'down')}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                          title="Aşağı Taşı"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onStartEditModule(c)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 shadow-2xs"
                          title="Modülü Düzenle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteModule(c.id, c.name)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 shadow-2xs"
                          title="Modülü Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Add Bar inside Module */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="font-bold text-slate-600 mr-1">Bu Modüle Ekle:</span>
                      <button
                        type="button"
                        onClick={() => onCreateContent('set', c.id)}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold shadow-2xs transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Kelime Seti</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onQuickAddFolder(c.id)}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold shadow-2xs transition flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ Yeni Klasör</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onCreateContent('test', c.id)}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-bold shadow-2xs transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Test</span>
                      </button>
                    </div>

                    {/* Folders Hierarchy inside Module */}
                    <div className="space-y-3 pt-2">
                      {c.folders?.length === 0 ? (
                        <div className="p-3.5 bg-white/70 rounded-2xl border border-black/5 text-xs text-slate-500 italic">
                          Bu modülde henüz alt klasör yok. Yukarıdaki "+ Yeni Klasör" butonuyla konu klasörleri oluşturabilirsiniz.
                        </div>
                      ) : (
                        c.folders.map((f: any) => {
                          const folderShareUrl = `${origin}/module/${c.slug}?folder=${f.id}`;
                          const fSets = f.sets || [];

                          return (
                            <div
                              key={f.id}
                              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
                            >
                              {/* Folder Title + Folder Share Button */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Folder className="w-4 h-4" />
                                  </div>
                                  <span className="font-extrabold text-slate-900 text-sm">{f.name}</span>
                                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {fSets.length} Set
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                  {/* Share Folder Link */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onShare({
                                        title: `${c.name} > ${f.name}`,
                                        url: folderShareUrl,
                                        type: 'folder',
                                        subtitle: `${fSets.length} çalışma seti içeren konu klasörü`,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition"
                                    title="Bu Klasörün Öğrenci Linkini Paylaş"
                                  >
                                    <Share2 className="w-3 h-3" />
                                    <span>Klasörü Paylaş</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onCreateContent('set', c.id, f.id)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 transition"
                                    title="Bu Klasörün İçine Yeni Set Ekle"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Set Ekle</span>
                                  </button>
                                </div>
                              </div>

                              {/* Sets List inside this Folder */}
                              {fSets.length === 0 ? (
                                <p className="text-xs text-slate-400 italic pl-2">Bu klasörde henüz set bulunmuyor.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {fSets.map((s: any) => {
                                    const setShareUrl = `${origin}/set/${s.slug}`;
                                    const cardCount = s.set_cards?.length || 0;

                                    return (
                                      <div
                                        key={s.id}
                                        className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 flex items-center justify-between gap-2 transition"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-slate-900 text-xs truncate">{s.title}</p>
                                          <p className="text-[11px] text-slate-500 font-medium">
                                            {cardCount} Kart
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          {/* Set Share Button */}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onShare({
                                                title: s.title,
                                                url: setShareUrl,
                                                type: 'set',
                                                subtitle: `${c.name} > ${f.name} (${cardCount} Kart)`,
                                              })
                                            }
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 shadow-2xs"
                                            title="Seti Paylaş"
                                          >
                                            <Share2 className="w-3.5 h-3.5" />
                                          </button>

                                          <Link
                                            href={`/set/${s.slug}`}
                                            target="_blank"
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                                            title="Öğrenci Gözüyle Aç"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                          </Link>

                                          <button
                                            type="button"
                                            onClick={() => onEditSet(s, c, f)}
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 shadow-2xs"
                                            title="Seti Düzenle"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => onMoveSet(s, f.id)}
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 shadow-2xs"
                                            title="Farklı Klasöre Taşı"
                                          >
                                            <MoveRight className="w-3.5 h-3.5" />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => onDeleteSet(s.id, s.title)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                            title="Seti Sil"
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
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. ALL SETS GRID (When filter is 'all' or 'sets') */}
      {(filter === 'all' || filter === 'sets') && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>Tüm Çalışma Setleri ({filteredSets.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Öğrencilerinizle tek tıkla paylaşabileceğiniz tüm kelime ve ezber setleri.
              </p>
            </div>
            <button
              onClick={() => onCreateContent('set')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Set Oluştur</span>
            </button>
          </div>

          {filteredSets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Aramanızla eşleşen set bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSets.map((s) => {
                const setShareUrl = `${origin}/set/${s.slug}`;
                const { coverImageUrl } = decodeSetDescription(s.description);

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Cover Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0 overflow-hidden flex items-center justify-center font-black text-sm">
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>ZB</span>
                        )}
                      </div>

                      {/* Set Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">{s.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {s.cardCount} Kart
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">
                          {s.className} ➔ {s.folderName}
                        </p>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                      {/* Universal Share Button */}
                      <button
                        type="button"
                        onClick={() =>
                          onShare({
                            title: s.title,
                            url: setShareUrl,
                            type: 'set',
                            subtitle: `${s.className} > ${s.folderName} (${s.cardCount} Kart)`,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Set Bağlantısını Kopyala veya WhatsApp'ta Paylaş"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Paylaş</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenSetAiModal(s)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-purple-600 hover:bg-purple-50 shadow-2xs"
                          title="Tüm Kartlara AI Resim Çiz"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditSet(s, { id: s.classId }, { id: s.folderId })}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 transition"
                          title="Seti Düzenle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>

                        <Link
                          href={`/set/${s.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                          title="Öğrenci Gözüyle Aç"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => onDeleteSet(s.id, s.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Seti Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. STORIES VIEW (When filter is 'all' or 'stories') */}
      {(filter === 'all' || filter === 'stories') && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span>Hikâyeler & E-Book Studio ({filteredStories.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesli ve resimli hikâyeleri yönetin, öğrencilerinize linkini paylaşın.
              </p>
            </div>
            <button
              onClick={() => onCreateContent('story-set')}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Hikâye Ekle</span>
            </button>
          </div>

          {filteredStories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Henüz hikâye bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredStories.map((st) => {
                const storyShareUrl = `${origin}/story/${st.slug}`;
                const pageCount = st.story_pages?.length || 0;

                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                        {st.cover_image_url ? (
                          <img src={st.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>📖</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{st.title}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {pageCount} Sayfa • {st.folders?.name || 'Genel'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onShare({
                            title: st.title,
                            url: storyShareUrl,
                            type: 'story',
                            subtitle: `${pageCount} sayfalık sesli hikâye`,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                        title="Hikâye Linkini Paylaş"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Paylaş</span>
                      </button>

                      <Link
                        href={`/story/${st.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                        title="Öğrenci Gözüyle Oku"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => onEditStory(st)}
                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700"
                        title="Hikâyeyi Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteStory(st.id, st.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hikâyeyi Sil"
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

      {/* 7. TESTS VIEW (When filter is 'all' or 'tests') */}
      {(filter === 'all' || filter === 'tests') && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span>İnteraktif Testler ({filteredTests.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Çoktan seçmeli testleri yönetin ve doğrudan çözme linkini öğrencilere gönderin.
              </p>
            </div>
            <button
              onClick={() => onCreateContent('test')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Test Ekle</span>
            </button>
          </div>

          {filteredTests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              Henüz test bulunmuyor.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredTests.map((t) => {
                const testShareUrl = `${origin}/test/${t.slug}`;
                const qCount = t.test_questions?.length || 0;

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 shrink-0 flex items-center justify-center font-bold text-base">
                        📝
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {qCount} Soru • {t.folders?.name || 'Genel Testler'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onShare({
                            title: t.title,
                            url: testShareUrl,
                            type: 'test',
                            subtitle: `${qCount} soruluk test`,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                        title="Test Linkini Paylaş"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Paylaş</span>
                      </button>

                      <Link
                        href={`/test/${t.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                        title="Öğrenci Gözüyle Çöz"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => onEditTest(t)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700"
                        title="Testi Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTest(t.id, t.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
    </div>
  );
}
