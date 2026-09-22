'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import OfflineState from '@/components/common/OfflineState';
import StudentAuthGate from '@/components/auth/StudentAuthGate';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    async function hideSplash() {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 400 });
      } catch (e) {
        // Silently ignore in browser environments
      }
    }
    hideSplash();
  }, []);

  // Active study mode: When student is inside an interactive set, test, or story
  const isStudyMode =
    pathname?.startsWith('/set/') ||
    pathname?.startsWith('/test/') ||
    pathname?.startsWith('/story/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Offline Status Monitor */}
      <OfflineState />

      {/* 1. Global Navigation Bar:
          - Hidden in study mode
          - Stays at the top of the page
          - Compact on mobile (h-13 / 52px) with safe area inset for notch/Dynamic Island */}
      {!isStudyMode && (
        <header className="relative bg-white border-b border-slate-200/80 pt-safe">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 sm:h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <img
                src="/logo-icon.png"
                alt="Ziya Baran Akademi Logosu"
                className="h-8 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-xs"
              />
              <span className="font-extrabold text-base sm:text-xl text-slate-900 tracking-tight block leading-tight">
                Ziya Baran Akademi
              </span>
            </Link>
          </div>
        </header>
      )}

      {/* 2. Main Content
          - Compact vertical padding to avoid excessive empty space at the top */}
      <main
        className={`flex-1 w-full mx-auto ${
          isStudyMode
            ? 'max-w-6xl xl:max-w-7xl px-2 sm:px-4 pt-safe-tight pb-safe pb-4 sm:pb-6'
            : 'max-w-6xl px-4 sm:px-6 pt-2 sm:pt-6 pb-safe pb-6 sm:pb-8'
        }`}
      >
        <StudentAuthGate>{children}</StudentAuthGate>
      </main>

      {/* 3. Global Footer */}
      {!isStudyMode && (
        <footer className="border-t border-slate-200/80 bg-white py-6 px-4 text-center text-xs text-slate-500 space-y-2 pb-safe">
          <div className="flex items-center justify-center gap-4">
            <Link href="/gizlilik" className="hover:text-brand-600 transition font-medium">
              Gizlilik Politikası (Privacy Policy)
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Ziya Baran Akademi. Tüm hakları saklıdır.</p>
        </footer>
      )}
    </div>
  );
}
