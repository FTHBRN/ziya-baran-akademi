'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Active study mode: When student is inside an interactive set, test, or story
  const isStudyMode =
    pathname?.startsWith('/set/') ||
    pathname?.startsWith('/test/') ||
    pathname?.startsWith('/story/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* 1. Global Navigation Bar:
          - Hidden in study mode
          - Stays at the top of the page (NOT sticky, does not follow when scrolling down) */}
      {!isStudyMode && (
        <header className="relative bg-white border-b border-slate-200/80">
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

      {/* 2. Main Content */}
      <main
        className={`flex-1 w-full mx-auto ${
          isStudyMode
            ? 'max-w-6xl xl:max-w-7xl px-2 sm:px-4 py-2 sm:py-4'
            : 'max-w-6xl px-4 sm:px-6 py-4 sm:py-8'
        }`}
      >
        {children}
      </main>

      {/* Footer completely removed per user request */}
    </div>
  );
}
