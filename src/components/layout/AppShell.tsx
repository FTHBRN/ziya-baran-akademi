'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import OfflineState from '@/components/common/OfflineState';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Active study mode: When student is inside an interactive set, test, or story
  const isStudyMode =
    pathname?.startsWith('/set/') ||
    pathname?.startsWith('/test/') ||
    pathname?.startsWith('/story/');

  useEffect(() => {
    // Native Mobile Integration: Status bar styling & smooth splash screen dismiss
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
      } catch {
        // ignore if not supported
      }

      // Hide the native splash screen with a smooth fade out after web app mounts
      const timer = setTimeout(() => {
        try {
          SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {});
        } catch {
          // ignore
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Offline Status Monitor */}
      <OfflineState />

      {/* 1. Global Navigation Bar:
          - Hidden in study mode
          - Stays at the top of the page (NOT sticky, does not follow when scrolling down)
          - Accounts for iOS safe-area-inset-top (notch / Dynamic Island) */}
      {!isStudyMode && (
        <header className="relative bg-white border-b border-slate-200/80 pt-safe">
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
          </div>
        </header>
      )}

      {/* 2. Main Content */}
      <main
        className={`flex-1 w-full mx-auto ${
          isStudyMode
            ? 'max-w-6xl xl:max-w-7xl px-2 sm:px-4 py-2 sm:py-4 pt-safe pb-safe'
            : 'max-w-6xl px-4 sm:px-6 py-4 sm:py-8 pb-safe'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
