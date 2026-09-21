'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Active study mode: When student is inside an interactive set, test, or story
  const isStudyMode =
    pathname?.startsWith('/set/') ||
    pathname?.startsWith('/test/') ||
    pathname?.startsWith('/story/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 1. Global Navigation Bar: Hidden in study mode to save vertical screen space */}
      {!isStudyMode && (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/logo-icon.png"
                alt="Ziya Baran Akademi Logosu"
                className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-xs"
              />
              <span className="font-extrabold text-base sm:text-xl text-slate-900 tracking-tight block leading-tight">
                Ziya Baran Akademi
              </span>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 transition-colors"
              >
                Dersler
              </Link>
            </nav>
          </div>
        </header>
      )}

      {/* 2. Main Content: In study mode, padding is minimal so flashcards/tests don't overflow on mobile */}
      <main
        className={`flex-1 w-full mx-auto ${
          isStudyMode
            ? 'max-w-4xl px-2 sm:px-4 py-2 sm:py-4'
            : 'max-w-6xl px-4 sm:px-6 py-6 sm:py-8'
        }`}
      >
        {children}
      </main>

      {/* 3. Footer: Hidden in study mode so there's no bottom clutter or unwanted scrolling */}
      {!isStudyMode && (
        <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-normal text-slate-500">
              © {new Date().getFullYear()} Ziya Baran Akademi. Tüm hakları saklıdır.
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>İnteraktif İngilizce Platformu</span>
              </div>
              <span className="text-slate-300">•</span>
              <Link
                href="/admin"
                className="text-slate-400 hover:text-slate-700 transition-colors font-medium text-xs"
                title="Yönetici Girişi"
              >
                Yönetici Girişi
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
