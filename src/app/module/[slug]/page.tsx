'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { decodeModuleMetadata, MODULE_THEMES } from '@/lib/module-utils';
import { decodeSetDescription } from '@/lib/set-utils';
import {
  ArrowLeft,
  Layers,
  BookOpen,
  CheckSquare,
  Sparkles,
  Play,
  Volume2,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [moduleData, setModuleData] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'sets' | 'tests' | 'stories'>('all');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadModule() {
      if (!slug) return;
      try {
        setLoading(true);
        // 1. Fetch module by slug
        const { data: cls, error: clsErr } = await supabase
          .from('classes')
          .select('*')
          .eq('slug', slug)
          .single();

        if (clsErr || !cls) {
          console.error('Modül bulunamadı:', clsErr);
          setLoading(false);
          return;
        }

        setModuleData(cls);

        // 2. Fetch folders of this module
        const { data: fList } = await supabase
          .from('folders')
          .select('*')
          .eq('class_id', cls.id)
          .order('order_index');

        const folderIds = (fList || []).map((f) => f.id);
        setFolders(fList || []);

        // 3. Fetch sets, tests, and stories belonging to these folders
        if (folderIds.length > 0) {
          const [setsRes, testsRes, storiesRes] = await Promise.all([
            supabase
              .from('sets')
              .select('*, set_cards(id), folders(name)')
              .in('folder_id', folderIds)
              .eq('is_published', true)
              .order('order_index'),
            supabase
              .from('manual_tests')
              .select('*, test_questions(id), folders(name)')
              .in('folder_id', folderIds)
              .eq('is_published', true)
              .order('order_index'),
            supabase
              .from('stories')
              .select('*, story_pages(id), folders(name)')
              .in('folder_id', folderIds)
              .eq('is_published', true)
              .order('created_at', { ascending: false }),
          ]);

          if (setsRes.data) setSets(setsRes.data);
          if (testsRes.data) setTests(testsRes.data);
          if (storiesRes.data) setStories(storiesRes.data);
        }
      } catch (err) {
        console.error('Modül yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    }

    loadModule();
  }, [slug]);

  const meta = useMemo(() => {
    if (!moduleData) return null;
    return decodeModuleMetadata(moduleData.description, moduleData.order_index || 0, moduleData.name);
  }, [moduleData]);

  const themeConfig = meta ? MODULE_THEMES[meta.theme] : MODULE_THEMES.amber;

  // Filtered lists
  const filteredSets = useMemo(() => {
    return sets.filter((s) => {
      const matchFolder = activeFolderId === 'all' || s.folder_id === activeFolderId;
      const matchQuery = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFolder && matchQuery;
    });
  }, [sets, activeFolderId, searchQuery]);

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchFolder = activeFolderId === 'all' || t.folder_id === activeFolderId;
      const matchQuery = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFolder && matchQuery;
    });
  }, [tests, activeFolderId, searchQuery]);

  const filteredStories = useMemo(() => {
    return stories.filter((st) => {
      const matchFolder = activeFolderId === 'all' || st.folder_id === activeFolderId;
      const matchQuery = !searchQuery || st.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFolder && matchQuery;
    });
  }, [stories, activeFolderId, searchQuery]);

  const totalItemCount = filteredSets.length + filteredTests.length + filteredStories.length;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Modül içerikleri yükleniyor...</p>
      </div>
    );
  }

  if (!moduleData || !meta) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-4xl">🔍</div>
        <h2 className="text-xl font-bold text-slate-800">Modül Bulunamadı</h2>
        <p className="text-sm text-slate-500">Aradığınız modül mevcut değil veya silinmiş olabilir.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
        >
          <ArrowLeft className="w-4 h-4" /> Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Back to Home link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tüm Modüllere Dön</span>
        </Link>
      </div>

      {/* Module Header Card matching screenshot theme */}
      <section className={`rounded-3xl border ${themeConfig.border} ${themeConfig.cardBg} p-6 sm:p-8 shadow-xs relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${themeConfig.badgeBg} ${themeConfig.badgeText} shadow-xs`}>
                {meta.badge}
              </span>
              {meta.tagline && (
                <span className="text-xs font-medium text-slate-500 italic">
                  {meta.tagline}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">{meta.icon}</span>
              <span>{moduleData.name}</span>
            </h1>

            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {meta.description}
            </p>

            {/* Quick summary badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/80 border border-slate-200/80 text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                <span>{sets.length} Kelime Seti</span>
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/80 border border-slate-200/80 text-slate-700 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>{tests.length} Test</span>
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/80 border border-slate-200/80 text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span>{stories.length} Sesli Hikâye</span>
              </span>
            </div>
          </div>

          {/* Large icon/badge graphic on right */}
          <div className={`hidden sm:flex w-24 h-24 rounded-3xl ${themeConfig.circleColor} items-center justify-center text-5xl shadow-inner shrink-0 border border-white/60`}>
            {meta.icon}
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Content Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tümü ({sets.length + tests.length + stories.length})
          </button>
          <button
            onClick={() => setActiveTab('sets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sets'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kelime Setleri ({sets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Testler ({tests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stories'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Sesli Hikâyeler ({stories.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İçerik ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Sub-Folders Filter (if module has more than 1 folder) */}
      {folders.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Konu:
          </span>
          <button
            onClick={() => setActiveFolderId('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeFolderId === 'all'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tüm Konular
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFolderId(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeFolderId === f.id
                  ? 'bg-brand-100 text-brand-700 border border-brand-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Content Grid */}
      {totalItemCount === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="text-4xl">🌟</div>
          <h3 className="text-base font-bold text-slate-800">Bu modülde henüz içerik yok</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bu modüle admin panelinden kolayca yeni kelime setleri, testler veya sesli hikâyeler ekleyebilirsiniz.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
          >
            Yönetim Paneline Git
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Kelime Setleri Section */}
          {(activeTab === 'all' || activeTab === 'sets') && filteredSets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <span>Kelime Setleri</span>
                  <span className="text-xs font-normal text-slate-400">({filteredSets.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSets.map((set) => {
                  const decoded = decodeSetDescription(set.description);
                  const cardCount = set.set_cards?.length || 0;
                  return (
                    <Link
                      key={set.id}
                      href={`/set/${set.slug}`}
                      className="group bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {decoded.coverImageUrl ? (
                          <img
                            src={decoded.coverImageUrl}
                            alt={set.title}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl shrink-0 font-bold border border-brand-100">
                            {meta.icon}
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                            {set.folders?.name || 'Kelime Seti'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                            {set.title}
                          </h4>
                          {decoded.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{decoded.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{cardCount} Kart</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-brand-600 group-hover:translate-x-0.5 transition-transform">
                          <span>Çalış</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Testler Section */}
          {(activeTab === 'all' || activeTab === 'tests') && filteredTests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>İnteraktif Testler</span>
                  <span className="text-xs font-normal text-slate-400">({filteredTests.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTests.map((test) => {
                  const qCount = test.test_questions?.length || 0;
                  return (
                    <Link
                      key={test.id}
                      href={`/test/${test.slug}`}
                      className="group bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                          <CheckSquare className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {test.folders?.name || 'Test'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {test.title}
                          </h4>
                          {test.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{test.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{qCount} Soru</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                          <span>Teste Başla</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Hikâyeler Section */}
          {(activeTab === 'all' || activeTab === 'stories') && filteredStories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Sesli Hikâyeler (Jenny Neural)</span>
                  <span className="text-xs font-normal text-slate-400">({filteredStories.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStories.map((story) => {
                  const pageCount = story.story_pages?.length || 0;
                  return (
                    <Link
                      key={story.id}
                      href={`/story/${story.slug}`}
                      className="group bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {story.cover_image_url ? (
                          <img
                            src={story.cover_image_url}
                            alt={story.title}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                            <BookOpen className="w-6 h-6" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                            <Volume2 className="w-3 h-3" />
                            <span>Sesli Okuma</span>
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                            {story.title}
                          </h4>
                          {story.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{story.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{pageCount} Sayfa</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-600 group-hover:translate-x-0.5 transition-transform">
                          <span>Dinle & Oku</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
