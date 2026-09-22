'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { KeyRound, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export default function StudentAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Paths that must never be blocked by student passcode gate
  const isExempt =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/gizlilik') ||
    pathname?.startsWith('/privacy');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isExempt) {
      setIsAuthenticated(true);
      return;
    }

    const savedCode = localStorage.getItem('zb_student_code');

    if (!savedCode) {
      setIsAuthenticated(false);
      return;
    }

    // Optimistically allow direct access if code was previously saved (zero lag/flicker)
    setIsAuthenticated(true);

    // Silently verify in background to check if admin has changed the passcode
    fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: savedCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid) {
          // Admin changed the passcode! Revoke device access
          localStorage.removeItem('zb_student_code');
          setIsAuthenticated(false);
          setErrorMsg('Akademi şifresi güncellenmiştir. Lütfen yeni şifreyi giriniz.');
        }
      })
      .catch((err) => {
        console.warn('Silent code verification skipped (offline or network issue):', err.message);
      });
  }, [pathname, isExempt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputCode.trim()) {
      setErrorMsg('Lütfen akademi şifrenizi girin.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode.trim() }),
      });

      const data = await res.json();

      if (data.valid) {
        triggerHaptic('success');
        localStorage.setItem('zb_student_code', inputCode.trim());
        setIsAuthenticated(true);
      } else {
        triggerHaptic('error');
        setErrorMsg('Hatalı şifre. Lütfen öğretmeninizden aldığınız şifreyi girin.');
      }
    } catch {
      triggerHaptic('error');
      setErrorMsg('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  // If path is exempt (/admin, /gizlilik) or authenticated, render normal app
  if (isExempt || isAuthenticated === true) {
    return <>{children}</>;
  }

  // Initial loading check state (brief microsecond before localStorage reads)
  if (isAuthenticated === null) {
    return null;
  }

  // Student Passcode Modal Gate
  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Academy Icon Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 p-0.5 shadow-xl shadow-brand-600/20">
          <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center text-brand-600">
            <KeyRound className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        {/* Title & Welcoming Text */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Ziya Baran Akademi</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Öğrenci Girişi</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            Ders içeriklerine erişmek için lütfen öğretmeninizden aldığınız akademi şifresini girin.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              autoFocus
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Akademi Şifresi (Örn: ZB2025)"
              className="w-full text-center px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-900 font-mono text-lg font-bold placeholder:text-slate-400 placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-brand-600 focus:bg-white transition"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-150">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !inputCode.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base shadow-lg shadow-brand-600/25 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span>Kontrol Ediliyor...</span>
            ) : (
              <>
                <span>Derse Başla</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400">
          Bu şifre cihazınıza kaydedilir. Şifre değiştirilmediği sürece bir daha sorulmaz.
        </p>
      </div>
    </div>
  );
}
