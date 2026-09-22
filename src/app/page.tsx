'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { decodeModuleMetadata, MODULE_THEMES } from '@/lib/module-utils';
import { useCachedHomeModules, preloadModule } from '@/lib/api-cache';
import {
  Search,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  X
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { data: cachedModules, isLoading } = useCachedHomeModules();
  const modules = cachedModules || [];
  const loading = isLoading && !cachedModules;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter modules for search
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase().trim();
    return modules.filter((m) => {
      const meta = decodeModuleMetadata(m.description, m.order_index || 0, m.name);
      return (
        m.name.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q)
      );
    });
  }, [modules, searchQuery]);

  return (
    <div className="select-none pb-8 sm:pb-12">
      {/* Search Modal Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-600" />
                <span>Modüllerde Ara</span>
              </h3>
              <button
                onClick={() => {
                  setSearchOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Modül adı, kelime veya konu..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-sm font-medium"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredModules.map((m) => {
                const meta = decodeModuleMetadata(m.description, m.order_index || 0, m.name);
                return (
                  <Link
                    key={m.id}
                    href={`/module/${m.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{m.name}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{meta.description}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* ================================================================= */}
        {/* DESKTOP LEFT SIDEBAR: "Merhaba!" Welcoming Card (Matches Image 1)  */}
        {/* ================================================================= */}
        <aside className="hidden lg:flex flex-col w-[310px] shrink-0 sticky top-24 space-y-6">
          <div className="bg-[#EBF5FF] rounded-3xl border border-[#D5E9FF] p-6 shadow-xs space-y-5 relative overflow-hidden">
            {/* Top Waving Hand & Greeting */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Merhaba!</span>
                <span className="animate-wiggle inline-block origin-bottom-right">👋</span>
              </h2>
              <p className="text-sm font-medium text-slate-600 leading-snug">
                İngilizce öğrenme yolculuğunda bugün harika bir gün!
              </p>
            </div>

            {/* Quote Box */}
            <div className="pt-3 border-t border-[#D5E9FF]/80 space-y-1">
              <p className="text-sm font-bold text-slate-800 italic leading-snug">
                “Küçük adımlar, büyük hikayelere götürür.”
              </p>
              <p className="text-xs font-semibold text-brand-600">
                Ziya Baran Akademi
              </p>
            </div>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* RIGHT / MAIN CONTENT AREA                                         */}
        {/* ================================================================= */}
        <div className="flex-1 w-full space-y-6">
          {/* Header Section (Desktop & Mobile Adaptive) */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-100">
            {/* Desktop Tagline & Title */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-slate-400 uppercase">
                <span>KEŞFET</span>
                <span>•</span>
                <span>ÖĞREN</span>
                <span>•</span>
                <span>GELİŞ</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {/* Mobile: "Bugün ne çalışmak istersin?" / Desktop: "İngilizceyi Keşfet" */}
                <span className="block sm:hidden text-xl text-purple-950">
                  Bugün ne çalışmak istersin?
                </span>
                <span className="hidden sm:inline">
                  İngilizceyi Keşfet
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                <span className="block sm:hidden text-purple-600 font-semibold">
                  Küçük adımlar, büyük ilerleme! 💜
                </span>
                <span className="hidden sm:inline">
                  Sana uygun modülü seç ve öğrenmeye başla.
                </span>
              </p>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-44 rounded-3xl bg-slate-100 border border-slate-200" />
              ))}
            </div>
          ) : (
            /* =============================================================== */
            /* MODULES GRID / LIST: Exactly like the screenshots               */
            /* =============================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredModules.map((m, idx) => {
                const meta = decodeModuleMetadata(m.description, m.order_index || idx, m.name);
                const theme = (meta?.theme && MODULE_THEMES[meta.theme]) ? MODULE_THEMES[meta.theme] : MODULE_THEMES.amber;

                // Total content count in this module
                let totalItems = 0;
                (m.folders || []).forEach((f: any) => {
                  if (f) {
                    totalItems += (f.sets?.length || 0) + (f.manual_tests?.length || 0) + (f.stories?.length || 0);
                  }
                });

                return (
                  <Link
                    key={m.id}
                    href={`/module/${m.slug}`}
                    onMouseEnter={() => preloadModule(m.slug)}
                    onTouchStart={() => preloadModule(m.slug)}
                    className={`group relative rounded-3xl border ${theme.border} ${theme.cardBg} p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between overflow-hidden`}
                  >
                      {/* Main Title & Description */}
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                          <span className="text-2xl sm:text-3xl shrink-0 group-hover:scale-110 transition-transform">
                            {meta.icon}
                          </span>
                          <span>{m.name}</span>
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">
                          {meta.description}
                        </p>
                      </div>

                    {/* Bottom Row: Pill "Başla ->" Button & Floating 3D Graphic */}
                    <div className="pt-6 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all ${theme.buttonBg} group-hover:gap-2.5`}
                      >
                        <span>Başla</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>

                      {/* Circular chevron on mobile / Tag badge on desktop */}
                      <div className="flex items-center gap-2">
                        {totalItems > 0 && (
                          <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/60 shadow-2xs">
                            {totalItems} İçerik
                          </span>
                        )}
                        <span className="w-8 h-8 rounded-full bg-white/90 shadow-2xs flex items-center justify-center text-slate-600 group-hover:translate-x-1 transition-transform border border-slate-100">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
