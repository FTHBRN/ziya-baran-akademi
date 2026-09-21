import './globals.css';
import type { Metadata } from 'next';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Ziya Baran Akademi | İngilizce Öğrenme Platformu',
  description: 'Ziya Baran Akademi interaktif İngilizce kelime setleri, testler ve hikâyeler.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
