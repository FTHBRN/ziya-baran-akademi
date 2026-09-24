'use client';

import Link from 'next/link';
import { ShieldCheck, Lock, EyeOff, Sparkles, ArrowLeft, HeartHandshake, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 space-y-8">
      {/* Back Button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-600 transition group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Ana Sayfaya Dön</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
          <ShieldCheck className="w-4 h-4" />
          <span>Resmi Gizlilik ve Güvenlik Beyanı</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
          Gizlilik Politikası (Privacy Policy)
        </h1>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed max-w-2xl">
          Ziya Baran Akademi olarak, öğrencilerimizin ve velilerimizin güvenliğini ve dijital gizliliğini en üst düzeyde korumayı ilke ediniyoruz.
        </p>
        <p className="text-xs text-white/70">
          Son Güncelleme: 22 Eylül 2026
        </p>
      </div>

      {/* Content Cards */}
      <div className="space-y-6">
        {/* Section 1: Toplanan Veriler */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-extrabold text-lg sm:text-xl">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2>1. Kişisel Veri Toplanmaması İlkesi</h2>
          </div>
          <div className="text-slate-600 text-sm sm:text-base leading-relaxed space-y-3">
            <p>
              Ziya Baran Akademi mobil uygulaması ve web platformu, öğrencilerimizden veya velilerimizden <strong>ad, soyad, e-posta adresi, telefon numarası, ev adresi veya konum</strong> gibi hiçbir kişisel kimlik bilgisini (PII) <strong>toplamaz ve talep etmez</strong>.
            </p>
            <p>
              Uygulamaya erişim, akademi tarafından sağlanan ortak bir erişim koduyla gerçekleştirilir; herhangi bir e-posta ile üye olma zorunluluğu yoktur.
            </p>
          </div>
        </div>

        {/* Section 2: Yerel Cihaz Hafızası (Local Storage) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-extrabold text-lg sm:text-xl">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2>2. Cihaz Hafızası ve Çerezler</h2>
          </div>
          <div className="text-slate-600 text-sm sm:text-base leading-relaxed space-y-3">
            <p>
              Uygulamamız yalnızca kullanıcının konforunu sağlamak amacıyla cihazın yerel hafızasını (Local Storage) kullanır:
            </p>
            <ul className="space-y-2 list-none pl-0">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><strong>Erişim Kodu Hatırlama:</strong> Şifrenin her girişte tekrar tekrar sorulmaması için şifre bilginiz sadece kendi cihazınızda güvenle tutulur.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span><strong>Çalışma İlerlemesi:</strong> Çözülen kartlar ve yıldızlar cihazınızın yerel hafızasında saklanır; üçüncü şahıslara veya sunuculara aktarılmaz.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Section 3: Çocukların Gizliliği (COPPA & KVKK) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-extrabold text-lg sm:text-xl">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2>3. Çocuk Güvenliği ve Gizliliği (COPPA / KVKK)</h2>
          </div>
          <div className="text-slate-600 text-sm sm:text-base leading-relaxed space-y-3">
            <p>
              Platformumuz 13 yaş altı çocukların kullanımına uygun olarak tasarlanmıştır. Bu kapsamda:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Çocuklardan herhangi bir ses, görüntü, kamera veya mikrofon kaydı alınmaz.</li>
              <li>Uygulama içinde kullanıcıların birbirleriyle mesajlaşabileceği veya iletişim kurabileceği açık bir sohbet alanı bulunmaz.</li>
              <li>Çocukların güvenli ve odaklanmış bir ortamda ders çalışması hedeflenir.</li>
            </ul>
          </div>
        </div>

        {/* Section 4: Reklam ve Üçüncü Taraflar */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-extrabold text-lg sm:text-xl">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2>4. Reklamsız Eğitim Politikası</h2>
          </div>
          <div className="text-slate-600 text-sm sm:text-base leading-relaxed space-y-2">
            <p>
              Uygulamamızda <strong>hiçbir üçüncü taraf reklamı (Google Ads, Facebook Pixel vb.) veya veri takipçisi (tracker) bulunmaz.</strong>
            </p>
            <p>
              Öğrencilerimiz uygulama boyunca hiçbir ticari reklama veya yönlendirmeye maruz kalmaz.
            </p>
          </div>
        </div>

        {/* Section 5: İletişim */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3 text-slate-900 font-extrabold text-lg sm:text-xl">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h2>5. İletişim ve Destek</h2>
          </div>
          <div className="text-slate-600 text-sm sm:text-base leading-relaxed space-y-2">
            <p>
              Gizlilik politikamız veya eğitim platformumuz hakkında her türlü soru ve geri bildiriminiz için bizimle iletişime geçebilirsiniz:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-sm text-slate-800 space-y-1 font-medium">
              <p><strong>Kurum:</strong> Ziya Baran Akademi</p>
              <p><strong>E-posta:</strong> ziyabaranakademitr@gmail.com</p>
              <p><strong>Web:</strong> https://ziya-baran-akademi.vercel.app</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
