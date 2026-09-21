'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { decodeModuleMetadata, MODULE_THEMES } from '@/lib/module-utils';
import { decodeSetDescription } from '@/lib/set-utils';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Filter,
  Layers,
  CheckSquare,
  BookOpen
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

  // Unified items list: No tabs or separation, all contents together
  const allItems = useMemo(() => {
    const list: any[] = [];

    (sets || []).forEach((s) => {
      const decoded = decodeSetDescription(s.description);
      const isStory = decoded.storyMeta?.isStory;
      list.push({
        id: `set-${s.id}`,
        rawId: s.id,
        type: isStory ? 'story-set' : 'set',
        typeLabel: isStory ? 'Story (10 Cümle)' : 'Kelime Seti',
        title: s.title,
        description: isStory && decoded.storyMeta?.subtitle ? decoded.storyMeta.subtitle : (decoded.description || ''),
        imageUrl: decoded.coverImageUrl || '',
        icon: isStory ? '🌟' : '🗂️',
        badgeColor: isStory ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        metaInfo: `${s.set_cards?.length || 0} ${isStory ? 'Cümle' : 'Kart'}`,
        actionLabel: isStory ? 'Hikayeye Başla' : 'Çalış',
        href: `/set/${s.slug}`,
        orderIndex: s.order_index ?? 0,
        createdAt: s.created_at || '',
        folderId: s.folder_id,
        folderName: s.folders?.name || '',
      });
    });

    (tests || []).forEach((t) => {
      list.push({
        id: `test-${t.id}`,
        rawId: t.id,
        type: 'test',
        typeLabel: 'Test',
        title: t.title,
        description: t.description || '',
        imageUrl: '',
        icon: '📝',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        metaInfo: `${t.test_questions?.length || 0} Soru`,
        actionLabel: 'Teste Başla',
        href: `/test/${t.slug}`,
        orderIndex: t.order_index ?? 0,
        createdAt: t.created_at || '',
        folderId: t.folder_id,
        folderName: t.folders?.name || '',
      });
    });

    (stories || []).forEach((st) => {
      list.push({
        id: `story-${st.id}`,
        rawId: st.id,
        type: 'story',
        typeLabel: 'Sesli Hikâye',
        title: st.title,
        description: st.description || '',
        imageUrl: st.cover_image_url || '',
        icon: '📖',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        metaInfo: `${st.story_pages?.length || 0} Sayfa`,
        actionLabel: 'Dinle & Oku',
        href: `/story/${st.slug}`,
        orderIndex: st.order_index ?? 0,
        createdAt: st.created_at || '',
        folderId: st.folder_id,
        folderName: st.folders?.name || '',
      });
    });

    // Sort by order_index ascending
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }, [sets, tests, stories]);

  // Filter items by search query and optional folder
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchFolder = activeFolderId === 'all' || item.folderId === activeFolderId;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      return matchFolder && matchQuery;
    });
  }, [allItems, activeFolderId, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Modül yükleniyor...</p>
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
    <div className="space-y-6 select-none pb-16">
      {/* =================================================================== */}
      {/* COMPACT & SLEEK HEADER (Replaced bulky banner completely)          */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Back Button + Icon + Title + Description */}
          <div className="flex items-center gap-3.5 min-w-0">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all shrink-0 active:scale-95"
              title="Tüm Modüllere Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl sm:text-3xl shrink-0">{meta.icon}</span>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {moduleData.name}
                </h1>
                {meta.description && (
                  <p className="text-xs text-slate-500 font-medium truncate max-w-lg">
                    {meta.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Search Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İçerik ara..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 transition-colors shadow-2xs"
            />
          </div>
        </div>

        {/* Optional Folder/Topic Filter (if module has multiple folders) */}
        {folders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-3 mt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Konu:
            </span>
            <button
              onClick={() => setActiveFolderId('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeFolderId === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({allItems.length})
            </button>
            {folders.map((f) => {
              const countInFolder = allItems.filter((i) => i.folderId === f.id).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFolderId(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activeFolderId === f.id
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.name} ({countInFolder})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* UNIFIED CONTENT GRID (No tabs, no separated buckets)               */}
      {/* =================================================================== */}
      {filteredItems.length === 0 ? (
        /* Empty State: Student-friendly without any admin redirection */
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-4 shadow-2xs">
          <div className="text-4xl">✨</div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Bu modülde henüz içerik yok</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Öğretmeniniz bu modül için alıştırmalar ve ders içerikleri hazırlıyor. Çok yakında yeni içerikler eklenecektir!
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Diğer Modülleri Keşfet</span>
          </Link>
        </div>
      ) : (
        /* Single, unified grid showing all items */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group bg-white rounded-2xl border border-slate-200/90 p-4 hover:border-brand-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0">
                    {item.icon}
                  </div>
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                      {item.typeLabel}
                    </span>
                    {item.folderName && (
                      <span className="text-[10px] font-medium text-slate-400 truncate">
                        {item.folderName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{item.metaInfo}</span>
                <span className="inline-flex items-center gap-1 font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform">
                  <span>{item.actionLabel}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
