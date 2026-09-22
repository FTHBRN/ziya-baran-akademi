'use client';

import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export default function OfflineState() {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Initial check
    const checkInitialStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOffline(!status.connected);
      } catch {
        if (typeof navigator !== 'undefined') {
          setIsOffline(!navigator.onLine);
        }
      }
    };

    checkInitialStatus();

    // Capacitor Network listener
    let networkListenerHandle: { remove: () => void } | null = null;
    try {
      Network.addListener('networkStatusChange', (status) => {
        setIsOffline((prev) => {
          if (prev && status.connected) {
            // Just came back online
            triggerHaptic('success');
            setShowRestored(true);
            setTimeout(() => setShowRestored(false), 3000);
          } else if (!status.connected) {
            triggerHaptic('warning');
          }
          return !status.connected;
        });
      }).then((handle) => {
        networkListenerHandle = handle;
      });
    } catch {
      // Fallback to window events
    }

    // Web window events fallback
    const handleOnline = () => {
      setIsOffline(false);
      triggerHaptic('success');
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      triggerHaptic('warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (networkListenerHandle) {
        networkListenerHandle.remove();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    triggerHaptic('light');
    setIsChecking(true);
    try {
      const status = await Network.getStatus();
      if (status.connected) {
        setIsOffline(false);
        triggerHaptic('success');
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
        window.location.reload();
      } else {
        triggerHaptic('error');
      }
    } catch {
      if (navigator.onLine) {
        setIsOffline(false);
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 3000);
        window.location.reload();
      } else {
        triggerHaptic('error');
      }
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  return (
    <>
      {/* Restored Connection Toast */}
      {showRestored && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[90%] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-semibold tracking-wide">
            İnternet bağlantısı yeniden kuruldu!
          </div>
        </div>
      )}

      {/* Full Offline Screen */}
      {isOffline && (
        <div className="fixed inset-0 z-[9998] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
              <WifiOff className="w-10 h-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                İnternet Bağlantısı Yok
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Lütfen Wi-Fi veya hücresel veri bağlantınızı kontrol edin. Bağlantı sağlandığında kaldığınız yerden devam edebilirsiniz.
              </p>
            </div>

            <button
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-brand-600/25 active:scale-98 transition disabled:opacity-75 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Kontrol Ediliyor...' : 'Tekrar Dene'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
