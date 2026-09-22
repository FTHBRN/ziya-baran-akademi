'use client';

import { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export default function AdminSettingsManager() {
  // Student passcode state
  const [currentStudentPasscode, setCurrentStudentPasscode] = useState('');
  const [newStudentPasscode, setNewStudentPasscode] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentMessage, setStudentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin password change state
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system-settings');
      if (res.ok) {
        const data = await res.json();
        setCurrentStudentPasscode(data.studentPasscode || 'ZB2025');
        setNewStudentPasscode(data.studentPasscode || 'ZB2025');
      }
    } catch (err: any) {
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle student passcode save
  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudentPasscode.trim()) {
      setStudentMessage({ type: 'error', text: 'Lütfen geçerli bir şifre girin.' });
      return;
    }

    setSavingStudent(true);
    setStudentMessage(null);

    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentPasscode: newStudentPasscode.trim() }),
      });

      if (res.ok) {
        triggerHaptic('success');
        const data = await res.json();
        setCurrentStudentPasscode(data.studentPasscode);
        setStudentMessage({
          type: 'success',
          text: `Öğrenci şifresi başarıyla "${data.studentPasscode}" olarak güncellendi!`,
        });
      } else {
        triggerHaptic('error');
        const err = await res.json();
        setStudentMessage({ type: 'error', text: err.error || 'Şifre güncellenemedi.' });
      }
    } catch {
      triggerHaptic('error');
      setStudentMessage({ type: 'error', text: 'Bir bağlantı hatası oluştu.' });
    } finally {
      setSavingStudent(false);
    }
  }

  // Handle admin password change
  async function handleSaveAdmin(e: React.FormEvent) {
    e.preventDefault();
    setAdminMessage(null);

    if (!currentAdminPass.trim()) {
      setAdminMessage({ type: 'error', text: 'Lütfen mevcut yönetici şifrenizi girin.' });
      return;
    }

    if (!newAdminPass.trim() || newAdminPass.trim().length < 4) {
      setAdminMessage({ type: 'error', text: 'Yeni şifre en az 4 karakter olmalıdır.' });
      return;
    }

    if (newAdminPass.trim() !== confirmAdminPass.trim()) {
      setAdminMessage({ type: 'error', text: 'Yeni şifreler birbiriyle eşleşmiyor.' });
      return;
    }

    setSavingAdmin(true);

    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_admin_password',
          currentPassword: currentAdminPass.trim(),
          newPassword: newAdminPass.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        triggerHaptic('success');
        // Update current device token so we don't get logged out!
        if (data.newToken) {
          localStorage.setItem('zb_admin_token', data.newToken);
        }
        setCurrentAdminPass('');
        setNewAdminPass('');
        setConfirmAdminPass('');
        setAdminMessage({
          type: 'success',
          text: 'Yönetici şifreniz başarıyla değiştirildi! Bu cihazınızın oturumu güncellendi.',
        });
      } else {
        triggerHaptic('error');
        setAdminMessage({ type: 'error', text: data.error || 'Şifre değiştirilemedi.' });
      }
    } catch {
      triggerHaptic('error');
      setAdminMessage({ type: 'error', text: 'Bağlantı hatası oluştu.' });
    } finally {
      setSavingAdmin(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Şifre & Güvenlik Yönetimi</h2>
            <p className="text-indigo-200 text-xs sm:text-sm mt-0.5">
              Öğrenci giriş kodunu ve yönetici (admin) ana şifrenizi buradan yönetin.
            </p>
          </div>
        </div>
      </div>

      {/* CARD 1: STUDENT PASSCODE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Öğrenci / Veli Giriş Şifresi</h3>
            <p className="text-xs text-slate-500">Tüm öğrencilerin tek bir şifreyle derslere girmesini sağlar.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Yükleniyor...</span>
          </div>
        ) : (
          <form onSubmit={handleSaveStudent} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Aktif Öğrenci Şifresi
              </label>
              <div className="relative max-w-md">
                <input
                  type={showStudentPassword ? 'text' : 'password'}
                  value={newStudentPasscode}
                  onChange={(e) => setNewStudentPasscode(e.target.value)}
                  placeholder="Örn: ZB2025"
                  className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition"
                  title={showStudentPassword ? 'Gizle' : 'Göster'}
                >
                  {showStudentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {studentMessage && (
              <div
                className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in duration-200 ${
                  studentMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {studentMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <span>{studentMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingStudent || newStudentPasscode.trim() === currentStudentPasscode}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {savingStudent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Öğrenci Şifresini Kaydet</span>
            </button>
          </form>
        )}
      </div>

      {/* CARD 2: ADMIN PASSWORD CHANGE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Yönetici (Admin) Şifresini Değiştir</h3>
            <p className="text-xs text-slate-500">
              Bu panelin giriş kapısını koruyan ana şifrenizi buradan güncelleyebilirsiniz.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAdmin} className="space-y-4 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Mevcut Yönetici Şifreniz
            </label>
            <input
              type={showAdminPass ? 'text' : 'password'}
              value={currentAdminPass}
              onChange={(e) => setCurrentAdminPass(e.target.value)}
              placeholder="Mevcut şifrenizi girin"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Yeni Yönetici Şifresi
            </label>
            <div className="relative">
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                placeholder="Yeni şifre (en az 4 karakter)"
                className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowAdminPass(!showAdminPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition"
              >
                {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Yeni Şifre (Tekrar)
            </label>
            <input
              type={showAdminPass ? 'text' : 'password'}
              value={confirmAdminPass}
              onChange={(e) => setConfirmAdminPass(e.target.value)}
              placeholder="Yeni şifrenizi tekrar yazın"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
            />
          </div>

          {adminMessage && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in duration-200 ${
                adminMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {adminMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span>{adminMessage.text}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingAdmin || !currentAdminPass || !newAdminPass || !confirmAdminPass}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {savingAdmin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Yönetici Şifresini Güncelle</span>
            </button>
          </div>
        </form>
      </div>

      {/* Info Notice */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Güvenlik Notu</span>
        </div>
        <p>
          Yönetici şifrenizi değiştirdiğinizde, o an çalıştığınız cihazınız otomatik olarak yeni şifreyle yetkilendirilir. Diğer cihazlarınızda veya başka tarayıcılarda açık olan eski oturumlar ise ilk yenilemede kapanır ve yeni şifreyi ister.
        </p>
      </div>
    </div>
  );
}
