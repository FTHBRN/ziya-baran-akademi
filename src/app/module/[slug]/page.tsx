'use client';

import { Suspense, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { decodeModuleMetadata, MODULE_THEMES } from '@/lib/module-utils';
import { decodeSetDescription } from '@/lib/set-utils';
import { useCachedModule, preloadSet, preloadTest, preloadStory } from '@/lib/api-cache';
import { ModuleSkeleton } from '@/components/common/Skeletons';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Folder,
  FolderOpen,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';

function ModuleDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const folderParam = searchParams.get('folder');

  const { data: cached, error, isLoading } = useCachedModule(slug);

  const moduleData = cached?.moduleData || null;
  const folders = cached?.folders || [];
  const sets = cached?.sets || [];
  const tests = cached?.tests || [];
  const stories = cached?.stories || [];
  const loading = isLoading && !cached;

  const [searchQuery, setSearchQuery] = useState('');

  const meta = useMemo(() => {
    if (!moduleData) return null;
    return decodeModuleMetadata(moduleData.description, moduleData.order_index || 0, moduleData.name);
  }, [moduleData]);

  // Unified items list
  const allItems = useMemo(() => {
    const list: any[] = [];

    (sets || []).forEach((s) => {
      const decoded = decodeSetDescription(s.description);
      const isStory = decoded.storyMeta?.isStory;
      list.push({
        id: `set-${s.id}`,
        rawId: s.id,
        slug: s.slug,
        type: isStory ? 'story-set' : 'set',
        typeLabel: isStory ? 'Story' : 'Kelime Seti',
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
        slug: t.slug,
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
        slug: st.slug,
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

  // Check custom folders
  const customFolders = useMemo(() => {
    return folders.filter((f) => f.name.trim().toLowerCase() !== 'genel');
  }, [folders]);

  // Whether this module uses hierarchical folders
  const hasCustomFolders = customFolders.length > 0 || (folders.length > 1);

  // Active folder if specified in query
  const currentFolder = useMemo(() => {
    if (!folderParam) return null;
    return folders.find((f) => f.id === folderParam || f.slug === folderParam) || null;
  }, [folders, folderParam]);

  // General items (belonging to 'Genel' or unassigned)
  const generalFolder = useMemo(() => {
    return folders.find((f) => f.name.trim().toLowerCase() === 'genel');
  }, [folders]);

  const generalItems = useMemo(() => {
    if (!generalFolder) return [];
    return allItems.filter((i) => i.folderId === generalFolder.id);
  }, [allItems, generalFolder]);

  // Filtered items based on active view and search
  const displayedItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      // Global search across this module or folder
      return allItems.filter((item) => {
        const matchesQuery = item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
        if (currentFolder) {
          return matchesQuery && item.folderId === currentFolder.id;
        }
        return matchesQuery;
      });
    }

    if (currentFolder) {
      return allItems.filter((item) => item.folderId === currentFolder.id);
    }

    // If no custom folders exist, show all items
    if (!hasCustomFolders) {
      return allItems;
    }

    // In folder overview mode without search, we show folders grid
    return [];
  }, [allItems, currentFolder, hasCustomFolders, searchQuery]);

  if (loading) {
    return <ModuleSkeleton />;
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
      {/* COMPACT & SLEEK HEADER (With Folder Back / Breadcrumb Support)     */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Back Button + Icon + Title + Breadcrumbs */}
          <div className="flex items-center gap-3.5 min-w-0">
            {currentFolder ? (
              <Link
                href={`/module/${slug}`}
                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all shrink-0 active:scale-95"
                title={`${moduleData.name} Klasörlerine Dön`}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                href="/"
                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all shrink-0 active:scale-95"
                title="Tüm Modüllere Dön"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}

            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl sm:text-3xl shrink-0">
                {currentFolder ? '📁' : meta.icon}
              </span>
              <div className="min-w-0">
                {currentFolder ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-0.5 flex-wrap">
                      <Link href="/" className="hover:text-slate-600 transition-colors shrink-0">Ana Sayfa</Link>
                      <span className="shrink-0">/</span>
                      <Link href={`/module/${slug}`} className="hover:text-slate-600 transition-colors truncate max-w-[120px] sm:max-w-none">{moduleData.name}</Link>
                      <span className="shrink-0">/</span>
                      <span className="text-slate-700 truncate max-w-[140px] sm:max-w-none">{currentFolder.name}</span>
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate flex items-center gap-2">
                      <span>{currentFolder.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {displayedItems.length} Çalışma
                      </span>
                    </h1>
                  </>
                ) : (
                  <>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                      {moduleData.name}
                    </h1>
                    {meta.description && (
                      <p className="text-xs text-slate-500 font-medium truncate max-w-lg">
                        {meta.description}
                      </p>
                    )}
                  </>
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
              placeholder={currentFolder ? `"${currentFolder.name}" içinde ara...` : "İçerik veya konu ara..."}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500 transition-colors shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* CASE A: FOLDER OVERVIEW (When module has folders & none selected)   */}
      {/* =================================================================== */}
      {!currentFolder && hasCustomFolders && !searchQuery ? (
        <div className="space-y-6">
          {/* Folders Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Konu Klasörleri ({folders.length})</span>
              </h2>
              <span className="text-xs font-medium text-slate-400">
                Çalışmak istediğiniz konuyu seçin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((f) => {
                const folderCount = allItems.filter((i) => i.folderId === f.id).length;
                return (
                  <Link
                    key={f.id}
                    href={`/module/${slug}?folder=${f.id}`}
                    className="group bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:shadow-md p-5 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                        <Folder className="w-6 h-6 fill-indigo-100" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                        {folderCount} Çalışma
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {f.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {folderCount > 0 ? `${folderCount} çalışma ve test içerir` : 'Henüz içerik eklenmedi'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                      <span>Klasörü Aç</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Optional: If there are unassigned or general items, display them below */}
          {generalItems.length > 0 && !folders.some(f => f.name.toLowerCase() === 'genel') && (
            <div className="space-y-3 pt-4 border-t border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span>Diğer Çalışmalar</span>
                <span className="text-xs font-normal text-slate-400">({generalItems.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generalItems.map((item) => renderItemCard(item))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* CASE B: ITEMS GRID (Direct items, or items inside active folder)    */
        /* =================================================================== */
        displayedItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-4 shadow-2xs">
            <div className="text-4xl">✨</div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery ? 'Aramanıza uygun içerik bulunamadı' : 'Bu klasörde henüz çalışma yok'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Farklı bir arama terimi deneyebilir veya filtreyi temizleyebilirsiniz.'
                  : 'Öğretmeniniz bu konu için yeni alıştırmalar ve ders içerikleri hazırlıyor.'}
              </p>
            </div>
            {currentFolder ? (
              <Link
                href={`/module/${slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{moduleData.name} Klasörlerine Dön</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Diğer Modülleri Keşfet</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedItems.map((item) => renderItemCard(item))}
          </div>
        )
      )}
    </div>
  );

  // Helper to render individual item cards
  function renderItemCard(item: any) {
    const isStory = item.type === 'story-set';

    return (
      <Link
        key={item.id}
        href={item.href}
        onMouseEnter={() => {
          if (item.slug) {
            if (item.type === 'set' || item.type === 'story-set') preloadSet(item.slug);
            else if (item.type === 'test') preloadTest(item.slug);
            else if (item.type === 'story') preloadStory(item.slug);
          }
        }}
        onTouchStart={() => {
          if (item.slug) {
            if (item.type === 'set' || item.type === 'story-set') preloadSet(item.slug);
            else if (item.type === 'test') preloadTest(item.slug);
            else if (item.type === 'story') preloadStory(item.slug);
          }
        }}
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
            {/* Show badge ONLY if not a story-set (Per user request to remove top badge on story sets) */}
            {!isStory && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                  {item.typeLabel}
                </span>
                {item.folderName && item.folderName.toLowerCase() !== 'genel' && (
                  <span className="text-[10px] font-medium text-slate-400 truncate">
                    {item.folderName}
                  </span>
                )}
              </div>
            )}
            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
            )}
          </div>
        </div>

        {/* Bottom bar: For story sets, remove left 10 Cümle and place 'Hikayeye Başla >' on right */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs text-slate-500">
          {!isStory ? (
            <span className="font-semibold text-slate-700">{item.metaInfo}</span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform">
            <span>{item.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </Link>
    );
  }
}

export default function ModuleDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Yükleniyor...</p>
        </div>
      }
    >
      <ModuleDetailContent />
    </Suspense>
  );
}
