'use client';

import { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface AdminLoginGateProps {
  onSuccess: () => void;
}

export default function AdminLoginGate({ onSuccess }: AdminLoginGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Lütfen yönetici şifrenizi girin.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        triggerHaptic('success');
        localStorage.setItem('zb_admin_token', data.token);
        onSuccess();
      } else {
        triggerHaptic('error');
        setErrorMsg(data.error || 'Hatalı yönetici şifresi.');
      }
    } catch {
      triggerHaptic('error');
      setErrorMsg('Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative z-10 space-y-6 text-center animate-in zoom-in-95 duration-200">
        {/* Shield Icon Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-indigo-400">
            <Shield className="w-10 h-10 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Güvenli Yönetici Paneli</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Ziya Baran Akademi</h1>
          <p className="text-xs text-slate-400">
            Yönetim paneline erişmek için ana şifrenizi girin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Yönetici Şifresi"
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-base font-bold placeholder:text-slate-500 placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-200 transition"
              title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/30 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span>Giriş Yapılıyor...</span>
            ) : (
              <>
                <span>Panele Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-500">
          Bu cihaz güvenli olarak hatırlanacaktır. Çıkış yapmadığınız sürece tekrar şifre sorulmaz.
        </p>
      </div>
    </div>
  );
}
