'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { decodeModuleMetadata, MODULE_THEMES } from '@/lib/module-utils';
import {
  Compass,
  Search,
  Heart,
  User,
  ArrowRight,
  ChevronRight,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  X
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBottomNav, setActiveBottomNav] = useState<'kesfet' | 'ara' | 'favoriler' | 'profil'>('kesfet');

  useEffect(() => {
    async function loadModules() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('classes')
          .select('*, folders(*, sets(id), manual_tests(id), stories(id))')
          .order('order_index', { ascending: true });

        if (data) {
          setModules(data);
        }
      } catch (err) {
        console.error('Modüller yüklenirken hata:', err);
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, []);

  // Filter modules for search
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase().trim();
    return modules.filter((m) => {
      const meta = decodeModuleMetadata(m.description, m.order_index || 0, m.name);
      return (
        m.name.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        meta.badge.toLowerCase().includes(q)
      );
    });
  }, [modules, searchQuery]);

  return (
    <div className="select-none pb-24 sm:pb-12">
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
                  setActiveBottomNav('kesfet');
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

            {/* Cute Illustration / Graphic Sticker */}
            <div className="pt-2 flex flex-col items-center text-center space-y-3">
              <div className="relative w-full py-4 px-3 bg-white/70 rounded-2xl border border-white/80 backdrop-blur-2xs shadow-xs space-y-2">
                <span className="inline-block text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                  Better English, A Brighter You! ✨
                </span>
                <div className="text-5xl py-2">🧑‍🎓📚</div>
                {/* 4 Learning Step Badges */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                  <span className="py-1 px-2 rounded-lg bg-blue-50 text-blue-700">Learn</span>
                  <span className="py-1 px-2 rounded-lg bg-orange-50 text-orange-700">Practice</span>
                  <span className="py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700">Grow</span>
                  <span className="py-1 px-2 rounded-lg bg-purple-50 text-purple-700">Repeat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Admin Shortcut */}
          <Link
            href="/admin"
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs flex items-center justify-between transition-all group"
          >
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Öğretmen / Admin Paneli</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
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

            {/* Playful Sticker / Badge on Top Right */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-xs font-bold text-amber-800 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Good Students, Brighter Futures ✨</span>
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
                    className={`group relative rounded-3xl border ${theme.border} ${theme.cardBg} p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between overflow-hidden`}
                  >
                    {/* Top Row: Badge & Sub-tagline */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black px-3 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText} shadow-2xs tracking-wide`}
                        >
                          {meta.badge}
                        </span>

                        {/* Top-right micro sticker text from screenshot */}
                        {meta.tagline && (
                          <span className="text-[11px] font-bold text-slate-400 italic hidden sm:inline">
                            {meta.tagline}
                          </span>
                        )}
                      </div>

                      {/* Main Title & Description */}
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {meta.icon}
                          </span>
                          <span>{m.name}</span>
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">
                          {meta.description}
                        </p>
                      </div>
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

      {/* =================================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR: Matches Image 2                      */}
      {/* =================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2 px-6 flex sm:hidden items-center justify-around shadow-lg">
        <button
          onClick={() => {
            setActiveBottomNav('kesfet');
            setSearchOpen(false);
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomNav === 'kesfet' ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Keşfet</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomNav('ara');
            setSearchOpen(true);
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomNav === 'ara' ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px]">Ara</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomNav('favoriler');
            router.push('/module/this-is-my-story');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomNav === 'favoriler' ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span className="text-[10px]">Favorilerim</span>
        </button>

        <button
          onClick={() => {
            setActiveBottomNav('profil');
            router.push('/admin');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeBottomNav === 'profil' ? 'text-purple-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Yönetim</span>
        </button>
      </nav>
    </div>
  );
}
