'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Zap,
  Timer,
  Heart,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Flame,
  Sparkles,
  ChevronRight,
  Award,
  Crown,
  Play,
  CheckCircle,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import {
  playTapSound,
  playMatchSound,
  playGoldenMatchSound,
  playComboSound,
  playFeverModeSound,
  playErrorSound,
  playGameOverSound,
  getSoundMuted,
  setSoundMuted,
} from '@/lib/sound-effects';
import { WordPair, DEFAULT_KELIME_PATLAT_WORDS } from '@/lib/kelime-patlat-words';

export type GameMode = '30s' | '60s' | 'survival';

interface ActiveCard {
  instanceId: string;
  pairId: string;
  text: string;
  lang: 'en' | 'tr';
  isGolden: boolean;
  status: 'idle' | 'selected' | 'matched' | 'wrong';
}

export default function KelimePatlatPage() {
  const router = useRouter();

  // Word pool
  const [wordPool, setWordPool] = useState<WordPair[]>(DEFAULT_KELIME_PATLAT_WORDS);
  const [loadingPool, setLoadingPool] = useState(true);

  // Sound state
  const [muted, setMuted] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [mode, setMode] = useState<GameMode>('30s');

  // Stats
  const [score, setScore] = useState(100);
  const [streak, setStreak] = useState(3);
  const [maxStreak, setMaxStreak] = useState(3);
  const [correctMatches, setCorrectMatches] = useState(0);
  const [wrongMatches, setWrongMatches] = useState(0);
  const [feverMode, setFeverMode] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [prevHighScore, setPrevHighScore] = useState(0);

  // Timer & Lives
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalTime, setTotalTime] = useState(30);
  const [lives, setLives] = useState(3);

  // Board Cards
  const [enCards, setEnCards] = useState<ActiveCard[]>([]);
  const [trCards, setTrCards] = useState<ActiveCard[]>([]);
  const [selectedEn, setSelectedEn] = useState<ActiveCard | null>(null);
  const [selectedTr, setSelectedTr] = useState<ActiveCard | null>(null);

  // Energy bridge animation between matching cards
  const [matchedPairHighlight, setMatchedPairHighlight] = useState<string | null>(null);

  // High scores per mode
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({
    '30s': 0,
    '60s': 0,
    survival: 0,
  });

  // Floating notification message
  const [floatingBonus, setFloatingBonus] = useState<{ id: number; text: string; color: string } | null>(null);

  // Unused words queue during game session
  const unusedPairsRef = useRef<WordPair[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize sound and fetch word pool
  useEffect(() => {
    setMuted(getSoundMuted());

    if (typeof window !== 'undefined') {
      const hs30 = parseInt(localStorage.getItem('zb_kp_hs_30s') || '0', 10);
      const hs60 = parseInt(localStorage.getItem('zb_kp_hs_60s') || '0', 10);
      const hsSurv = parseInt(localStorage.getItem('zb_kp_hs_survival') || '0', 10);
      setHighScores({
        '30s': hs30,
        '60s': hs60,
        survival: hsSurv,
      });
    }

    fetch('/api/kelime-patlat')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.words) && data.words.length >= 10) {
          setWordPool(data.words);
        }
      })
      .catch((err) => console.warn('Word pool fetch error:', err))
      .finally(() => setLoadingPool(false));
  }, []);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  // 2. Timer management
  useEffect(() => {
    if (gameState !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (mode === 'survival') {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, mode]);

  useEffect(() => {
    return () => {
      if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    };
  }, []);

  const triggerFloatingBonus = (text: string, color: string = 'text-amber-300') => {
    const id = Date.now();
    setFloatingBonus({ id, text, color });
    setTimeout(() => {
      setFloatingBonus((cur) => (cur?.id === id ? null : cur));
    }, 1200);
  };

  // 3. Start Game
  const startGame = (selectedMode: GameMode) => {
    playTapSound();
    triggerHaptic('medium');

    const duration = selectedMode === '30s' ? 30 : selectedMode === '60s' ? 60 : 0;
    setMode(selectedMode);
    setTimeLeft(duration);
    setTotalTime(duration);
    setLives(3);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectMatches(0);
    setWrongMatches(0);
    setFeverMode(false);
    setIsNewRecord(false);
    setSelectedEn(null);
    setSelectedTr(null);
    setMatchedPairHighlight(null);

    const oldRecord = highScores[selectedMode] || 0;
    setPrevHighScore(oldRecord);

    const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
    const initialPairs = shuffled.slice(0, 5);
    unusedPairsRef.current = shuffled.slice(5);

    const initialEnCards: ActiveCard[] = initialPairs.map((p, idx) => ({
      instanceId: `en-${p.id}-${Math.random()}`,
      pairId: p.id,
      text: p.en,
      lang: 'en',
      isGolden: idx === 2 || Math.random() < 0.15, // guaranteed 1 golden for fun preview
      status: 'idle',
    }));

    const initialTrCards: ActiveCard[] = initialPairs
      .map((p) => {
        const matchingEn = initialEnCards.find((c) => c.pairId === p.id);
        return {
          instanceId: `tr-${p.id}-${Math.random()}`,
          pairId: p.id,
          text: p.tr,
          lang: 'tr' as const,
          isGolden: matchingEn ? matchingEn.isGolden : false,
          status: 'idle' as const,
        };
      })
      .sort(() => Math.random() - 0.5);

    setEnCards(initialEnCards);
    setTrCards(initialTrCards);
    setGameState('playing');
  };

  // 4. End Game
  const endGame = useCallback(() => {
    setGameState('gameover');
    if (timerRef.current) clearInterval(timerRef.current);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);

    setScore((finalScore) => {
      const currentBest = highScores[mode] || 0;
      const isRecord = finalScore > currentBest && finalScore > 0;
      setIsNewRecord(isRecord);

      if (isRecord) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`zb_kp_hs_${mode}`, finalScore.toString());
        }
        setHighScores((prev) => ({ ...prev, [mode]: finalScore }));

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      playGameOverSound(isRecord);
      triggerHaptic(isRecord ? 'success' : 'medium');
      return finalScore;
    });
  }, [highScores, mode]);

  // 5. Card click handlers
  const handleCardClick = (card: ActiveCard) => {
    if (gameState !== 'playing' || card.status === 'matched') return;

    playTapSound();
    triggerHaptic('light');

    if (card.lang === 'en') {
      if (selectedEn?.instanceId === card.instanceId) {
        setSelectedEn(null);
        setEnCards((prev) =>
          prev.map((c) => (c.instanceId === card.instanceId ? { ...c, status: 'idle' } : c))
        );
      } else {
        setSelectedEn(card);
        setEnCards((prev) =>
          prev.map((c) =>
            c.instanceId === card.instanceId
              ? { ...c, status: 'selected' }
              : c.status === 'selected'
              ? { ...c, status: 'idle' }
              : c
          )
        );

        if (selectedTr) {
          evaluateMatch(card, selectedTr);
        }
      }
    } else {
      if (selectedTr?.instanceId === card.instanceId) {
        setSelectedTr(null);
        setTrCards((prev) =>
          prev.map((c) => (c.instanceId === card.instanceId ? { ...c, status: 'idle' } : c))
        );
      } else {
        setSelectedTr(card);
        setTrCards((prev) =>
          prev.map((c) =>
            c.instanceId === card.instanceId
              ? { ...c, status: 'selected' }
              : c.status === 'selected'
              ? { ...c, status: 'idle' }
              : c
          )
        );

        if (selectedEn) {
          evaluateMatch(selectedEn, card);
        }
      }
    }
  };

  // 6. Match Evaluation
  const evaluateMatch = (enCard: ActiveCard, trCard: ActiveCard) => {
    const isCorrect = enCard.pairId === trCard.pairId;

    if (isCorrect) {
      setCorrectMatches((prev) => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((prev) => Math.max(prev, nextStreak));

      const isGolden = enCard.isGolden || trCard.isGolden;

      let multiplier = 1;
      if (nextStreak >= 10 || feverMode) {
        multiplier = 5;
      } else if (nextStreak >= 6) {
        multiplier = 3;
      } else if (nextStreak >= 3) {
        multiplier = 2;
      }

      const basePoints = 100;
      const goldenBonus = isGolden ? 150 : 0;
      const pointsWon = (basePoints + goldenBonus) * multiplier;

      setScore((prev) => prev + pointsWon);
      setMatchedPairHighlight(enCard.pairId);

      if (isGolden) {
        playGoldenMatchSound();
        triggerHaptic('heavy');
        triggerFloatingBonus(`+${pointsWon} ⭐ Altın Kelime!`, 'text-yellow-300 font-black');
        confetti({
          particleCount: 35,
          spread: 70,
          colors: ['#FFD700', '#FFA500', '#FFFFFF', '#65A30D', '#84CC16'],
        });
      } else {
        playMatchSound();
        triggerHaptic('medium');
        if (multiplier > 1) {
          triggerFloatingBonus(`+${pointsWon} (${multiplier}x Seri) 🔥`, 'text-orange-400 font-black');
        } else {
          triggerFloatingBonus(`+${pointsWon} Harika!`, 'text-emerald-300 font-black');
        }
        confetti({
          particleCount: 15,
          spread: 45,
          colors: ['#84CC16', '#22C55E', '#38BDF8', '#FACC15'],
        });
      }

      if (nextStreak === 3) {
        playComboSound(2);
        triggerFloatingBonus('2x Seri! 🔥', 'text-amber-300 font-black');
      } else if (nextStreak === 6) {
        playComboSound(3);
        triggerFloatingBonus('3x Seri Uçuyor! ⚡', 'text-orange-400 font-black');
      } else if (nextStreak === 10 && !feverMode) {
        setFeverMode(true);
        playFeverModeSound();
        triggerFloatingBonus('💥 COŞKU MODU! (5x) 💥', 'text-pink-400 font-black');
        confetti({
          particleCount: 70,
          spread: 90,
          colors: ['#FF3366', '#FF9900', '#38BDF8', '#84CC16', '#FACC15'],
        });
      }

      setEnCards((prev) =>
        prev.map((c) => (c.instanceId === enCard.instanceId ? { ...c, status: 'matched' } : c))
      );
      setTrCards((prev) =>
        prev.map((c) => (c.instanceId === trCard.instanceId ? { ...c, status: 'matched' } : c))
      );

      setSelectedEn(null);
      setSelectedTr(null);

      setTimeout(() => {
        setMatchedPairHighlight(null);
        replaceMatchedCards(enCard.pairId);
      }, 300);
    } else {
      setWrongMatches((prev) => prev + 1);
      setStreak(0);
      setFeverMode(false);
      playErrorSound();
      triggerHaptic('error');

      setEnCards((prev) =>
        prev.map((c) => (c.instanceId === enCard.instanceId ? { ...c, status: 'wrong' } : c))
      );
      setTrCards((prev) =>
        prev.map((c) => (c.instanceId === trCard.instanceId ? { ...c, status: 'wrong' } : c))
      );

      if (mode === 'survival') {
        setLives((prev) => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setTimeout(() => endGame(), 350);
          }
          return newLives;
        });
      }

      setTimeout(() => {
        setEnCards((prev) =>
          prev.map((c) => (c.instanceId === enCard.instanceId ? { ...c, status: 'idle' } : c))
        );
        setTrCards((prev) =>
          prev.map((c) => (c.instanceId === trCard.instanceId ? { ...c, status: 'idle' } : c))
        );
        setSelectedEn(null);
        setSelectedTr(null);
      }, 250);
    }
  };

  // 7. Refill cards fluidly
  const replaceMatchedCards = (matchedPairId: string) => {
    if (unusedPairsRef.current.length === 0) {
      unusedPairsRef.current = [...wordPool].sort(() => Math.random() - 0.5);
    }

    const nextPair = unusedPairsRef.current.shift()!;
    const isNewGolden = Math.random() < 0.15;

    const newEnCard: ActiveCard = {
      instanceId: `en-${nextPair.id}-${Math.random()}`,
      pairId: nextPair.id,
      text: nextPair.en,
      lang: 'en',
      isGolden: isNewGolden,
      status: 'idle',
    };

    const newTrCard: ActiveCard = {
      instanceId: `tr-${nextPair.id}-${Math.random()}`,
      pairId: nextPair.id,
      text: nextPair.tr,
      lang: 'tr',
      isGolden: isNewGolden,
      status: 'idle',
    };

    setEnCards((prev) => prev.map((c) => (c.pairId === matchedPairId ? newEnCard : c)));
    setTrCards((prev) => prev.map((c) => (c.pairId === matchedPairId ? newTrCard : c)));
  };

  const totalAttempts = correctMatches + wrongMatches;
  const accuracyPercent =
    totalAttempts > 0 ? Math.round((correctMatches / totalAttempts) * 100) : 100;

  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-b from-[#0A57CB] via-[#0E70E6] to-[#0A48A3] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Dynamic Background Atmosphere: Soft Clouds & Floating Stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft cartoon clouds at top */}
        <div className="absolute -top-10 -left-10 w-60 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute top-4 -right-10 w-72 h-36 bg-white/15 rounded-full blur-xl" />
        <div className="absolute top-1/4 left-5 w-4 h-4 text-amber-300/40 animate-pulse">★</div>
        <div className="absolute top-1/3 right-8 w-6 h-6 text-yellow-200/50 animate-bounce">★</div>
        <div className="absolute top-12 left-1/4 w-3 h-3 text-pink-300/50">✦</div>
        <div className="absolute top-20 right-1/4 w-4 h-4 text-cyan-200/50">✦</div>

        {/* Fever mode fiery glow */}
        {feverMode && (
          <div className="absolute inset-0 bg-radial from-amber-500/25 via-rose-600/20 to-transparent animate-kp-fever" />
        )}
      </div>

      {/* Floating bonus message banner */}
      {floatingBonus && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="px-5 py-2 rounded-full bg-slate-950/90 border-2 border-yellow-400 shadow-2xl backdrop-blur-md">
            <span className={`text-base sm:text-lg font-black tracking-wide drop-shadow-md ${floatingBonus.color}`}>
              {floatingBonus.text}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================
          1. LOBBY SCREEN (Renkli, Oyunsu Menü)
      ======================================================== */}
      {gameState === 'lobby' && (
        <div className="relative z-10 flex-1 max-w-md mx-auto w-full px-4 py-5 flex flex-col justify-between">
          {/* Top Header Buttons */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="px-3.5 py-2.5 rounded-2xl bg-[#1351B4] hover:bg-[#1862DC] text-white border-2 border-[#38BDF8]/60 border-b-4 border-b-[#0B377E] shadow-md font-bold text-xs flex items-center gap-1.5 active:translate-y-1 active:border-b-2 transition"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>Akademi</span>
            </Link>

            <button
              onClick={toggleSound}
              className="p-2.5 rounded-2xl bg-[#059669] hover:bg-[#10B981] text-white border-2 border-[#34D399] border-b-4 border-b-[#047857] shadow-md active:translate-y-1 active:border-b-2 transition cursor-pointer"
            >
              {muted ? <VolumeX className="w-5 h-5 stroke-[2.5]" /> : <Volume2 className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </div>

          {/* 3D Illustrated Game Title */}
          <div className="text-center my-auto py-4 relative">
            {/* Rocket Illustration */}
            <div className="absolute -top-4 right-2 sm:right-6 w-16 h-16 pointer-events-none animate-pulse">
              <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-lg transform rotate-12">
                <path d="M48 6C48 6 30 16 24 32C20 42 22 46 22 46C22 46 26 48 36 44C52 38 62 20 62 20C62 20 60 10 48 6Z" fill="#F8FAFC" />
                <path d="M48 6C56 10 62 20 62 20C62 20 54 18 42 22C38 12 48 6 48 6Z" fill="#E11D48" />
                <circle cx="42" cy="22" r="5" fill="#38BDF8" stroke="#0284C7" strokeWidth="2" />
                <path d="M22 46L14 54L18 42L22 46Z" fill="#F97316" />
                <path d="M14 54L6 62L12 50L14 54Z" fill="#FACC15" />
                <path d="M30 46L24 58L22 46L30 46Z" fill="#FB7185" />
              </svg>
            </div>

            {/* Bubble 3D Title */}
            <div className="inline-block relative">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none text-center drop-shadow-[0_6px_0px_rgba(11,55,126,0.9)]">
                <span className="block text-[#FFCC00] drop-shadow-[0_4px_0px_#B45309]">
                  Kelime
                </span>
                <span className="block text-[#FF4D80] drop-shadow-[0_4px_0px_#9F1239] -mt-1">
                  Patlat
                </span>
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-cyan-100 font-extrabold mt-3 max-w-xs mx-auto drop-shadow-sm">
              Kelimeleri hızla eşleştir, seriyi yakala, Coşku Modu'nda rekor kır! 🚀
            </p>
          </div>

          {/* Mode Selection Cards (3D Chunky Buttons) */}
          <div className="space-y-3 mb-4">
            {/* 30 Saniye */}
            <button
              onClick={() => startGame('30s')}
              className="w-full group p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-[#FFFDF9] to-[#FFF6EA] text-slate-800 border-2 border-[#FED7AA] border-b-[6px] border-b-[#EA580C] shadow-lg hover:brightness-105 active:translate-y-1 active:border-b-2 transition flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 border-b-2 border-orange-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <Zap className="w-7 h-7 fill-white stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">30 Saniye</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      YILDIRIM
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">Süper hızlı refleks turu!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase text-amber-700">Rekor</div>
                <div className="font-black text-orange-600 text-base font-mono">{highScores['30s']}</div>
              </div>
            </button>

            {/* 60 Saniye */}
            <button
              onClick={() => startGame('60s')}
              className="w-full group p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] text-slate-800 border-2 border-[#BBF7D0] border-b-[6px] border-b-[#16A34A] shadow-lg hover:brightness-105 active:translate-y-1 active:border-b-2 transition flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-emerald-400 to-green-600 border-b-2 border-green-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <Timer className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">60 Saniye</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      KLASİK
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">Tempolu ve dengeli yarış!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase text-emerald-700">Rekor</div>
                <div className="font-black text-emerald-600 text-base font-mono">{highScores['60s']}</div>
              </div>
            </button>

            {/* Dayanabildiğin Kadar */}
            <button
              onClick={() => startGame('survival')}
              className="w-full group p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-[#FFF1F2] to-[#FFE4E6] text-slate-800 border-2 border-[#FECDD3] border-b-[6px] border-b-[#E11D48] shadow-lg hover:brightness-105 active:translate-y-1 active:border-b-2 transition flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-rose-400 to-pink-600 border-b-2 border-pink-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <Heart className="w-7 h-7 fill-white stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base sm:text-lg">Dayanabildiğin Kadar</h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                      3 CAN
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">Süre yok! 3 yanlışta biter.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase text-rose-700">Rekor</div>
                <div className="font-black text-rose-600 text-base font-mono">{highScores['survival']}</div>
              </div>
            </button>
          </div>

          {/* Cute Bottom Illustration (Books + Friendly Mascot Scene) */}
          <div className="pt-2 flex items-end justify-between px-2">
            {/* Stacked 3D Books */}
            <div className="flex flex-col items-start scale-90 sm:scale-100 origin-bottom-left">
              {/* English Book (Orange) */}
              <div className="h-6 w-24 bg-gradient-to-r from-[#FF7A00] to-[#FF9E40] rounded-sm border border-[#C25E00] border-b-2 border-b-[#8F4400] text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                ENGLISH
              </div>
              {/* Türkçe Book (Cyan) */}
              <div className="h-6 w-28 bg-gradient-to-r from-[#0284C7] to-[#38BDF8] rounded-sm border border-[#0369A1] border-b-2 border-b-[#075985] text-white font-black text-[10px] flex items-center justify-center shadow-xs -mt-1">
                TÜRKÇE
              </div>
              {/* Kelime Book (Pink) */}
              <div className="h-7 w-32 bg-gradient-to-r from-[#E11D48] to-[#FB7185] rounded-sm border border-[#BE123C] border-b-2 border-b-[#9F1239] text-white font-black text-[11px] flex items-center justify-center shadow-sm -mt-1">
                KELİME
              </div>
            </div>

            {/* School in the center distance */}
            <div className="text-center opacity-85 scale-90 sm:scale-100">
              <svg width="60" height="45" viewBox="0 0 60 45" fill="none">
                <rect x="15" y="18" width="30" height="25" rx="3" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
                <polygon points="30,4 10,18 50,18" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
                <circle cx="30" cy="25" r="4" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
                <rect x="26" y="33" width="8" height="10" rx="1" fill="#D97706" />
                <line x1="30" y1="4" x2="30" y2="0" stroke="#EF4444" strokeWidth="2" />
                <polygon points="30,0 36,2 30,4" fill="#EF4444" />
              </svg>
            </div>

            {/* Cheerful Smiling Backpack Mascot */}
            <div className="scale-90 sm:scale-100 origin-bottom-right">
              <svg width="55" height="60" viewBox="0 0 55 60" fill="none">
                <rect x="8" y="10" width="38" height="46" rx="14" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
                {/* Backpack pocket */}
                <rect x="12" y="34" width="30" height="18" rx="6" fill="#8B5CF6" stroke="#6D28D9" strokeWidth="2" />
                {/* Cute Eyes */}
                <circle cx="21" cy="24" r="3" fill="#1E293B" />
                <circle cx="33" cy="24" r="3" fill="#1E293B" />
                <circle cx="22" cy="23" r="1" fill="#FFFFFF" />
                <circle cx="34" cy="23" r="1" fill="#FFFFFF" />
                {/* Blushing cheeks */}
                <ellipse cx="17" cy="27" rx="2.5" ry="1.5" fill="#FDA4AF" />
                <ellipse cx="37" cy="27" rx="2.5" ry="1.5" fill="#FDA4AF" />
                {/* Happy Mouth */}
                <path d="M23 28 Q27 34 31 28" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="#DC2626" />
                {/* Straps */}
                <path d="M14 10 Q14 3 20 3 L34 3 Q40 3 40 10" stroke="#7C3AED" strokeWidth="3" fill="none" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. IN-GAME SCREEN (Canlı, Birebir Oyun Tahtası)
      ======================================================== */}
      {gameState === 'playing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-between max-w-lg mx-auto w-full px-3 sm:px-4 py-2 sm:py-3">
          {/* Top Control Bar (Referans Görseldeki Gibi Şık Hap Butonlar) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Back button */}
              <button
                onClick={() => {
                  if (confirm('Oyundan çıkmak istediğinize emin misiniz?')) {
                    setGameState('lobby');
                    if (timerRef.current) clearInterval(timerRef.current);
                  }
                }}
                className="p-2 sm:p-2.5 rounded-2xl bg-[#1351B4] hover:bg-[#1862DC] text-white border-2 border-[#38BDF8]/70 border-b-4 border-b-[#0B377E] shadow-md active:translate-y-1 active:border-b-2 transition cursor-pointer"
                title="Çıkış"
              >
                <ArrowLeft className="w-5 h-5 stroke-[3]" />
              </button>

              {/* Center: Lives Pill Capsule */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0A337A]/85 border-2 border-[#1E52A8] shadow-inner backdrop-blur-xs">
                {[1, 2, 3].map((heartIndex) => (
                  <Heart
                    key={heartIndex}
                    className={`w-5 h-5 transition-transform duration-200 ${
                      heartIndex <= lives
                        ? 'text-[#FF3366] fill-[#FF3366] drop-shadow-sm scale-100'
                        : 'text-slate-600 scale-90 opacity-40'
                    }`}
                  />
                ))}
              </div>

              {/* Right: Trophy Score Pill Capsule */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0A337A]/85 border-2 border-[#1E52A8] shadow-inner backdrop-blur-xs">
                <Trophy className="w-5 h-5 text-[#FFD215] fill-[#FFD215] drop-shadow-xs" />
                <span className="font-mono text-base font-black text-[#FFD215] tracking-tight">
                  {score.toLocaleString('tr-TR')}
                </span>
              </div>

              {/* Far Right: Audio Mute Button */}
              <button
                onClick={toggleSound}
                className="p-2 sm:p-2.5 rounded-2xl bg-[#059669] hover:bg-[#10B981] text-white border-2 border-[#34D399] border-b-4 border-b-[#047857] shadow-md active:translate-y-1 active:border-b-2 transition cursor-pointer"
                title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
              >
                {muted ? <VolumeX className="w-5 h-5 stroke-[2.5]" /> : <Volume2 className="w-5 h-5 stroke-[2.5]" />}
              </button>
            </div>

            {/* Sub Banner: Cartoon Game Logo Title */}
            <div className="text-center py-1 relative">
              <div className="inline-block relative">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-center drop-shadow-[0_4px_0px_rgba(11,55,126,0.9)]">
                  <span className="text-[#FFCC00] drop-shadow-[0_3px_0px_#B45309]">
                    Kelime{' '}
                  </span>
                  <span className="text-[#FF4D80] drop-shadow-[0_3px_0px_#9F1239]">
                    Patlat
                  </span>
                </h2>
              </div>
              {/* Rocket icon popping on the right */}
              <span className="absolute -top-1 right-8 sm:right-16 text-2xl animate-pulse">
                🚀
              </span>
            </div>

            {/* Streak & Timer / Mode Banner */}
            <div className="flex items-center justify-between px-3.5 py-1.5 rounded-2xl bg-[#09357E]/90 border-2 border-[#1D54AE] shadow-inner">
              {/* Flame + Streak Segments */}
              <div className="flex items-center gap-2">
                <Flame
                  className={`w-5 h-5 transition-colors ${
                    feverMode
                      ? 'text-rose-400 fill-rose-400 animate-bounce'
                      : streak >= 6
                      ? 'text-orange-400 fill-orange-400'
                      : streak >= 3
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-amber-400 fill-amber-400'
                  }`}
                />
                <span className="text-xs font-black text-white">
                  Seri: <strong className="text-amber-300 font-mono text-sm">{streak}</strong>
                </span>

                {/* 5 Segmented Golden Capsules */}
                <div className="flex items-center gap-1 ml-1 bg-slate-900/60 p-1 rounded-full border border-slate-700/60">
                  {[1, 2, 3, 4, 5].map((seg) => {
                    const isFilled = (streak % 5 || (streak >= 5 ? 5 : 0)) >= seg && streak > 0;
                    return (
                      <div
                        key={seg}
                        className={`w-3.5 h-2 rounded-full transition-all duration-300 ${
                          isFilled
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-sm shadow-amber-400/50 scale-105'
                            : 'bg-slate-700/60'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Mode Timer / Tag */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-black">
                <Timer className="w-3.5 h-3.5 text-cyan-300" />
                <span>
                  {mode === 'survival'
                    ? `${lives} Can`
                    : `${timeLeft} Saniye`}
                </span>
              </div>
            </div>
          </div>

          {/* GAME BOARD: 2 COLUMNS (İNGİLİZCE & TÜRKÇE) */}
          <div className="my-auto py-1">
            {/* Column Headers with Sparks (İNGİLİZCE & TÜRKÇE) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-2.5">
              {/* İNGİLİZCE Header */}
              <div className="relative text-center">
                <span className="absolute -left-1 -top-1 text-yellow-300 text-xs animate-spin">
                  ✦
                </span>
                <div className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-b from-[#2FD5F6] to-[#0298DE] text-white font-black text-sm sm:text-base tracking-wider uppercase border-2 border-[#6EE7F7] border-b-4 border-b-[#0369A1] shadow-md drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
                  İNGİLİZCE
                </div>
              </div>

              {/* TÜRKÇE Header */}
              <div className="relative text-center">
                <span className="absolute -right-1 -top-1 text-yellow-300 text-xs animate-spin">
                  ✦
                </span>
                <div className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-b from-[#FF5B7E] to-[#E11D48] text-white font-black text-sm sm:text-base tracking-wider uppercase border-2 border-[#FDA4AF] border-b-4 border-b-[#9F1239] shadow-md drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
                  TÜRKÇE
                </div>
              </div>
            </div>

            {/* 5 Rows of Cards - Generously Sized for Easy Touch */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Left Column: English Cards */}
              <div className="space-y-2.5 sm:space-y-3">
                {enCards.map((card) => {
                  const isSelected = selectedEn?.instanceId === card.instanceId;
                  const isMatched = card.status === 'matched';
                  const isWrong = card.status === 'wrong';
                  const isPairHighlighted = matchedPairHighlight === card.pairId;

                  return (
                    <button
                      key={card.instanceId}
                      onClick={() => handleCardClick(card)}
                      disabled={isMatched}
                      className={`relative w-full min-h-[64px] sm:min-h-[72px] px-3.5 sm:px-4 py-3 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg text-center transition-all flex items-center justify-center cursor-pointer select-none active:translate-y-1 ${
                        isMatched || isPairHighlighted
                          ? 'bg-gradient-to-b from-[#B4F04C] to-[#8EE035] border-2 border-[#A3E635] border-b-[6px] border-b-[#4D7C0F] text-[#14532D] shadow-xl scale-105 animate-pulse'
                          : isWrong
                          ? 'animate-kp-shake bg-[#FFE4E6] border-2 border-[#FB7185] border-b-[6px] border-b-[#E11D48] text-[#9F1239]'
                          : isSelected
                          ? 'bg-[#E0F2FE] border-2 border-[#38BDF8] border-b-[6px] border-b-[#0284C7] text-[#0369A1] shadow-lg scale-[1.03] ring-2 ring-[#38BDF8]/60'
                          : card.isGolden
                          ? 'bg-gradient-to-b from-[#FEF08A] to-[#FDE047] border-2 border-[#FACC15] border-b-[6px] border-b-[#CA8A04] text-[#713F12] hover:brightness-105 active:border-b-2 shadow-md'
                          : 'bg-[#FFF9F2] hover:bg-white text-slate-800 border-2 border-[#E7D6C1] border-b-[6px] border-b-[#C9B195] shadow-md hover:scale-[1.01] active:border-b-2'
                      }`}
                    >
                      <span className="truncate max-w-[85%] leading-snug">{card.text}</span>

                      {/* Golden Star Indicator */}
                      {(card.isGolden || isPairHighlighted) && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 text-base sm:text-lg filter drop-shadow-xs">
                          ⭐
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Turkish Cards */}
              <div className="space-y-2.5 sm:space-y-3">
                {trCards.map((card) => {
                  const isSelected = selectedTr?.instanceId === card.instanceId;
                  const isMatched = card.status === 'matched';
                  const isWrong = card.status === 'wrong';
                  const isPairHighlighted = matchedPairHighlight === card.pairId;

                  return (
                    <button
                      key={card.instanceId}
                      onClick={() => handleCardClick(card)}
                      disabled={isMatched}
                      className={`relative w-full min-h-[64px] sm:min-h-[72px] px-3.5 sm:px-4 py-3 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg text-center transition-all flex items-center justify-center cursor-pointer select-none active:translate-y-1 ${
                        isMatched || isPairHighlighted
                          ? 'bg-gradient-to-b from-[#B4F04C] to-[#8EE035] border-2 border-[#A3E635] border-b-[6px] border-b-[#4D7C0F] text-[#14532D] shadow-xl scale-105 animate-pulse'
                          : isWrong
                          ? 'animate-kp-shake bg-[#FFE4E6] border-2 border-[#FB7185] border-b-[6px] border-b-[#E11D48] text-[#9F1239]'
                          : isSelected
                          ? 'bg-[#E0F2FE] border-2 border-[#38BDF8] border-b-[6px] border-b-[#0284C7] text-[#0369A1] shadow-lg scale-[1.03] ring-2 ring-[#38BDF8]/60'
                          : card.isGolden
                          ? 'bg-gradient-to-b from-[#FEF08A] to-[#FDE047] border-2 border-[#FACC15] border-b-[6px] border-b-[#CA8A04] text-[#713F12] hover:brightness-105 active:border-b-2 shadow-md'
                          : 'bg-[#FFF9F2] hover:bg-white text-slate-800 border-2 border-[#E7D6C1] border-b-[6px] border-b-[#C9B195] shadow-md hover:scale-[1.01] active:border-b-2'
                      }`}
                    >
                      <span className="truncate max-w-[85%] leading-snug">{card.text}</span>

                      {/* Golden Star Indicator */}
                      {(card.isGolden || isPairHighlighted) && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 text-base sm:text-lg filter drop-shadow-xs">
                          ⭐
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cute Bottom Illustration (Books + Friendly Mascot Scene) */}
          <div className="pt-2 flex items-end justify-between px-2">
            {/* Stacked 3D Books */}
            <div className="flex flex-col items-start scale-90 sm:scale-100 origin-bottom-left">
              <div className="h-5 sm:h-6 w-22 sm:w-26 bg-gradient-to-r from-[#FF7A00] to-[#FF9E40] rounded-sm border border-[#C25E00] border-b-2 border-b-[#8F4400] text-white font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-xs">
                ENGLISH
              </div>
              <div className="h-5 sm:h-6 w-26 sm:w-30 bg-gradient-to-r from-[#0284C7] to-[#38BDF8] rounded-sm border border-[#0369A1] border-b-2 border-b-[#075985] text-white font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-xs -mt-1">
                TÜRKÇE
              </div>
              <div className="h-6 sm:h-7 w-30 sm:w-34 bg-gradient-to-r from-[#E11D48] to-[#FB7185] rounded-sm border border-[#BE123C] border-b-2 border-b-[#9F1239] text-white font-black text-[10px] sm:text-[11px] flex items-center justify-center shadow-sm -mt-1">
                KELİME
              </div>
            </div>

            {/* School in the center distance */}
            <div className="text-center opacity-85 scale-80 sm:scale-95">
              <svg width="55" height="40" viewBox="0 0 60 45" fill="none">
                <rect x="15" y="18" width="30" height="25" rx="3" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
                <polygon points="30,4 10,18 50,18" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
                <circle cx="30" cy="25" r="4" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
                <rect x="26" y="33" width="8" height="10" rx="1" fill="#D97706" />
                <line x1="30" y1="4" x2="30" y2="0" stroke="#EF4444" strokeWidth="2" />
                <polygon points="30,0 36,2 30,4" fill="#EF4444" />
              </svg>
            </div>

            {/* Cheerful Backpack Mascot */}
            <div className="scale-90 sm:scale-100 origin-bottom-right">
              <svg width="50" height="55" viewBox="0 0 55 60" fill="none">
                <rect x="8" y="10" width="38" height="46" rx="14" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
                <rect x="12" y="34" width="30" height="18" rx="6" fill="#8B5CF6" stroke="#6D28D9" strokeWidth="2" />
                <circle cx="21" cy="24" r="3" fill="#1E293B" />
                <circle cx="33" cy="24" r="3" fill="#1E293B" />
                <circle cx="22" cy="23" r="1" fill="#FFFFFF" />
                <circle cx="34" cy="23" r="1" fill="#FFFFFF" />
                <ellipse cx="17" cy="27" rx="2.5" ry="1.5" fill="#FDA4AF" />
                <ellipse cx="37" cy="27" rx="2.5" ry="1.5" fill="#FDA4AF" />
                <path d="M23 28 Q27 34 31 28" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" fill="#DC2626" />
                <path d="M14 10 Q14 3 20 3 L34 3 Q40 3 40 10" stroke="#7C3AED" strokeWidth="3" fill="none" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. GAME OVER MODAL (Zafer & İstatistik Kartı)
      ======================================================== */}
      {gameState === 'gameover' && (
        <div className="relative z-20 flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col justify-between animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-3 pt-2">
            {isNewRecord ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/30 animate-pulse border-2 border-yellow-200">
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>YENİ REKOR!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0A337A] border-2 border-[#1E52A8] text-amber-300 text-xs font-black shadow-md">
                <Trophy className="w-4 h-4 fill-amber-300" />
                <span>Oyun Tamamlandı</span>
              </div>
            )}

            <h2 className="text-4xl font-black text-white drop-shadow-[0_3px_0px_rgba(0,0,0,0.4)]">
              {isNewRecord ? 'Harika Bir Performans!' : 'Tebrikler! 🎉'}
            </h2>

            {/* Chunky Score Display */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#FFFDF9] to-[#FFF5E6] text-slate-800 border-2 border-[#FDBA74] border-b-6 border-b-[#EA580C] shadow-2xl space-y-1 my-3">
              <span className="text-xs uppercase font-black tracking-wider text-orange-600">
                Toplam Puan
              </span>
              <div className="text-5xl font-black text-orange-600 font-mono tracking-tight">
                {score.toLocaleString('tr-TR')}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <div className="p-3.5 rounded-2xl bg-[#09357E]/90 border-2 border-[#1D54AE] shadow-inner space-y-1">
                <div className="text-[11px] font-bold text-cyan-200 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Doğru Eşleşme</span>
                </div>
                <div className="text-xl font-black text-white">{correctMatches}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09357E]/90 border-2 border-[#1D54AE] shadow-inner space-y-1">
                <div className="text-[11px] font-bold text-cyan-200 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Doğruluk</span>
                </div>
                <div className="text-xl font-black text-white">%{accuracyPercent}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09357E]/90 border-2 border-[#1D54AE] shadow-inner space-y-1">
                <div className="text-[11px] font-bold text-cyan-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>En Uzun Seri</span>
                </div>
                <div className="text-xl font-black text-white">{maxStreak}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09357E]/90 border-2 border-[#1D54AE] shadow-inner space-y-1">
                <div className="text-[11px] font-bold text-cyan-200 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>En Yüksek Skor</span>
                </div>
                <div className="text-xl font-black text-amber-300 font-mono">
                  {highScores[mode].toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4">
            <button
              onClick={() => startGame(mode)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-base border-2 border-yellow-200 border-b-4 border-b-amber-600 shadow-xl active:translate-y-1 active:border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 stroke-[3]" />
              <span>Tekrar Oyna</span>
            </button>

            <button
              onClick={() => setGameState('lobby')}
              className="w-full py-3 px-6 rounded-2xl bg-[#1351B4] hover:bg-[#1862DC] text-white font-black text-sm border-2 border-[#38BDF8]/60 border-b-4 border-b-[#0B377E] shadow-md active:translate-y-1 active:border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Mod Değiştir</span>
            </button>

            <Link
              href="/"
              className="w-full py-2.5 px-6 text-center text-xs font-bold text-cyan-200 hover:text-white transition block"
            >
              Akademiye Dön
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
