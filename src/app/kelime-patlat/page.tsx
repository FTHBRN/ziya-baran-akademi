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
  HelpCircle,
  SlidersHorizontal,
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
  const [mode, setMode] = useState<GameMode>('60s');

  // Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctMatches, setCorrectMatches] = useState(0);
  const [wrongMatches, setWrongMatches] = useState(0);
  const [feverMode, setFeverMode] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [prevHighScore, setPrevHighScore] = useState(0);

  // Timer & Lives
  const [timeLeft, setTimeLeft] = useState(60);
  const [totalTime, setTotalTime] = useState(60);
  const [lives, setLives] = useState(3);

  // Board Cards
  const [enCards, setEnCards] = useState<ActiveCard[]>([]);
  const [trCards, setTrCards] = useState<ActiveCard[]>([]);
  const [selectedEn, setSelectedEn] = useState<ActiveCard | null>(null);
  const [selectedTr, setSelectedTr] = useState<ActiveCard | null>(null);

  // High scores per mode
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({
    '30s': 0,
    '60s': 0,
    survival: 0,
  });

  // Floating notification message (e.g. "+300 2x Seri!", "+150 Altın Kelime!")
  const [floatingBonus, setFloatingBonus] = useState<{ id: number; text: string; color: string } | null>(null);

  // Unused words queue during game session
  const unusedPairsRef = useRef<WordPair[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize sound and fetch word pool
  useEffect(() => {
    setMuted(getSoundMuted());

    // Load High Scores
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

    // Fetch from API
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
      return; // Survival has no countdown
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

  // Clean fever timer
  useEffect(() => {
    return () => {
      if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    };
  }, []);

  // Show floating bonus alert briefly
  const triggerFloatingBonus = (text: string, color: string = 'text-amber-500') => {
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

    const oldRecord = highScores[selectedMode] || 0;
    setPrevHighScore(oldRecord);

    // Shuffle word pool
    const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
    const initialPairs = shuffled.slice(0, 5);
    unusedPairsRef.current = shuffled.slice(5);

    // Build 5 EN cards and 5 TR cards
    const initialEnCards: ActiveCard[] = initialPairs.map((p) => ({
      instanceId: `en-${p.id}-${Math.random()}`,
      pairId: p.id,
      text: p.en,
      lang: 'en',
      isGolden: Math.random() < 0.15, // 15% golden chance
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
      .sort(() => Math.random() - 0.5); // Shuffle TR column positions

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

        // Celebration confetti
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
        // Deselect
        setSelectedEn(null);
        setEnCards((prev) =>
          prev.map((c) => (c.instanceId === card.instanceId ? { ...c, status: 'idle' } : c))
        );
      } else {
        // Select this EN card
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

        // Check if TR was already selected
        if (selectedTr) {
          evaluateMatch(card, selectedTr);
        }
      }
    } else {
      // TR card clicked
      if (selectedTr?.instanceId === card.instanceId) {
        // Deselect
        setSelectedTr(null);
        setTrCards((prev) =>
          prev.map((c) => (c.instanceId === card.instanceId ? { ...c, status: 'idle' } : c))
        );
      } else {
        // Select this TR card
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

        // Check if EN was already selected
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
      // --- CORRECT MATCH ---
      setCorrectMatches((prev) => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setMaxStreak((prev) => Math.max(prev, nextStreak));

      // Golden Word Check
      const isGolden = enCard.isGolden || trCard.isGolden;

      // Multiplier Calculation
      let multiplier = 1;
      if (nextStreak >= 10 || feverMode) {
        multiplier = 5; // Coşku Modu
      } else if (nextStreak >= 6) {
        multiplier = 3; // 3x Seri
      } else if (nextStreak >= 3) {
        multiplier = 2; // 2x Seri
      }

      // Points calculation: Base 100 + Golden Bonus 150
      const basePoints = 100;
      const goldenBonus = isGolden ? 150 : 0;
      const pointsWon = (basePoints + goldenBonus) * multiplier;

      setScore((prev) => prev + pointsWon);

      // Trigger gamification audio & effects
      if (isGolden) {
        playGoldenMatchSound();
        triggerHaptic('heavy');
        triggerFloatingBonus(`+${pointsWon} Altın Kelime! ⭐`, 'text-amber-500 font-extrabold');
        confetti({
          particleCount: 25,
          spread: 60,
          colors: ['#FFD700', '#FFA500', '#FFFFFF', '#F59E0B'],
        });
      } else {
        playMatchSound();
        triggerHaptic('medium');
        if (multiplier > 1) {
          triggerFloatingBonus(`+${pointsWon} (${multiplier}x Seri) 🔥`, 'text-orange-500 font-black');
        } else {
          triggerFloatingBonus(`+${pointsWon}`, 'text-emerald-500 font-bold');
        }
      }

      // Streak milestones
      if (nextStreak === 3) {
        playComboSound(2);
        triggerFloatingBonus('2x Seri Başladı! 🔥', 'text-amber-500 font-black');
      } else if (nextStreak === 6) {
        playComboSound(3);
        triggerFloatingBonus('3x Seri Uçuyor! ⚡', 'text-orange-600 font-black');
      } else if (nextStreak === 10 && !feverMode) {
        setFeverMode(true);
        playFeverModeSound();
        triggerFloatingBonus('💥 COŞKU MODU! (5x PUAN) 💥', 'text-rose-500 font-black');
        confetti({
          particleCount: 60,
          spread: 90,
          colors: ['#FF3366', '#FF9900', '#33CCFF', '#00FF66'],
        });
      }

      // Mark matched on screen (pop out animation)
      setEnCards((prev) =>
        prev.map((c) => (c.instanceId === enCard.instanceId ? { ...c, status: 'matched' } : c))
      );
      setTrCards((prev) =>
        prev.map((c) => (c.instanceId === trCard.instanceId ? { ...c, status: 'matched' } : c))
      );

      // Reset selection
      setSelectedEn(null);
      setSelectedTr(null);

      // Replace matched cards after 200ms
      setTimeout(() => {
        replaceMatchedCards(enCard.pairId);
      }, 200);
    } else {
      // --- WRONG MATCH ---
      setWrongMatches((prev) => prev + 1);
      setStreak(0);
      setFeverMode(false);
      playErrorSound();
      triggerHaptic('error');

      // Shake & red effect
      setEnCards((prev) =>
        prev.map((c) => (c.instanceId === enCard.instanceId ? { ...c, status: 'wrong' } : c))
      );
      setTrCards((prev) =>
        prev.map((c) => (c.instanceId === trCard.instanceId ? { ...c, status: 'wrong' } : c))
      );

      // Survival lives deduction
      if (mode === 'survival') {
        setLives((prev) => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setTimeout(() => endGame(), 350);
          }
          return newLives;
        });
      }

      // Revert cards back to idle after 250ms
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

  // 7. Refill cards fluidly (screen is never empty)
  const replaceMatchedCards = (matchedPairId: string) => {
    // If unused queue is low, refill from word pool
    if (unusedPairsRef.current.length === 0) {
      unusedPairsRef.current = [...wordPool].sort(() => Math.random() - 0.5);
    }

    // Pick next pair
    const nextPair = unusedPairsRef.current.shift()!;
    const isNewGolden = Math.random() < 0.15; // 15% chance

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

    setEnCards((prev) =>
      prev.map((c) => (c.pairId === matchedPairId ? newEnCard : c))
    );

    setTrCards((prev) => {
      // Find position of matched TR card
      const updated = prev.map((c) => (c.pairId === matchedPairId ? newTrCard : c));
      // Shuffle positions slightly or preserve
      return updated;
    });
  };

  // Accuracy calculation
  const totalAttempts = correctMatches + wrongMatches;
  const accuracyPercent =
    totalAttempts > 0 ? Math.round((correctMatches / totalAttempts) * 100) : 100;

  // Multiplier label
  const currentMultiplier = feverMode ? 5 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1;

  return (
    <div className="relative min-h-[100dvh] bg-slate-900 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Background Glow / Fever Atmosphere */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          feverMode
            ? 'opacity-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/30 via-rose-900/30 to-slate-950 animate-kp-fever'
            : 'opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900/20 to-slate-950'
        }`}
      />

      {/* Floating bonus message banner */}
      {floatingBonus && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="px-4 py-1.5 rounded-full bg-slate-950/90 border border-slate-700 shadow-2xl backdrop-blur-md">
            <span className={`text-sm sm:text-base ${floatingBonus.color}`}>
              {floatingBonus.text}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================
          1. LOBBY SCREEN (Mod Seçimi & Giriş)
      ======================================================== */}
      {gameState === 'lobby' && (
        <div className="relative z-10 flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Akademiye Dön</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer"
                title={muted ? 'Sesi Aç' : 'Sesi Kapat'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Title & Banner */}
          <div className="text-center my-auto py-6 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>Hızlı Eşleştirme Oyunu</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 drop-shadow-sm">
              Kelime Patlat
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
              İngilizce ve Türkçe kelimeleri hızla eşleştir, seriyi koru, Coşku Modu'na geç ve rekor kır!
            </p>
          </div>

          {/* Game Modes */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Oyun Modunu Seç
            </p>

            {/* 30 Saniye */}
            <button
              onClick={() => startGame('30s')}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-slate-800/90 to-slate-850 border border-slate-700/80 hover:border-amber-500/60 transition shadow-lg hover:shadow-amber-500/10 flex items-center justify-between text-left cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">30 Saniye</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Yıldırım
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Hızlı refleksler, seri eşleştirmeler.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Rekor</div>
                <div className="font-extrabold text-amber-400 text-sm">{highScores['30s']}</div>
              </div>
            </button>

            {/* 60 Saniye */}
            <button
              onClick={() => startGame('60s')}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-slate-800/90 to-slate-850 border border-slate-700/80 hover:border-indigo-500/60 transition shadow-lg hover:shadow-indigo-500/10 flex items-center justify-between text-left cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Timer className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">60 Saniye</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Klasik
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Dengeli tempo, yüksek puan fırsatı.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Rekor</div>
                <div className="font-extrabold text-indigo-400 text-sm">{highScores['60s']}</div>
              </div>
            </button>

            {/* Dayanabildiğin Kadar */}
            <button
              onClick={() => startGame('survival')}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-slate-800/90 to-slate-850 border border-slate-700/80 hover:border-rose-500/60 transition shadow-lg hover:shadow-rose-500/10 flex items-center justify-between text-left cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <Heart className="w-6 h-6 fill-rose-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">Dayanabildiğin Kadar</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Can Modu
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Süre sınırı yok! 3 yanlışta oyun biter.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Rekor</div>
                <div className="font-extrabold text-rose-400 text-sm">{highScores['survival']}</div>
              </div>
            </button>
          </div>

          {/* Quick Rules / Gamification tips */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Oyun Kuralları & İpuçları</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>🔥 3 Seri: <span className="text-amber-300 font-bold">2x Puan</span></div>
              <div>⚡ 6 Seri: <span className="text-orange-400 font-bold">3x Puan</span></div>
              <div>💥 10 Seri: <span className="text-rose-400 font-bold">Coşku Modu (5x)</span></div>
              <div>⭐ Altın Kelime: <span className="text-yellow-400 font-bold">+150 Ekstra</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. IN-GAME SCREEN (Oyun Tahtası)
      ======================================================== */}
      {gameState === 'playing' && (
        <div className="relative z-10 flex-1 flex flex-col justify-between max-w-xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4">
          {/* Top Control Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              {/* Exit button */}
              <button
                onClick={() => {
                  if (confirm('Oyundan çıkmak istediğinize emin misiniz?')) {
                    setGameState('lobby');
                    if (timerRef.current) clearInterval(timerRef.current);
                  }
                }}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Çıkış"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Mode Counter: Timer OR Lives */}
              {mode === 'survival' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-rose-500/40 shadow-inner">
                  {[1, 2, 3].map((heartIndex) => (
                    <Heart
                      key={heartIndex}
                      className={`w-5 h-5 transition-all ${
                        heartIndex <= lives
                          ? 'text-rose-500 fill-rose-500 scale-100'
                          : 'text-slate-600 scale-90 opacity-40'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 shadow-inner">
                  <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-500 animate-spin' : 'text-indigo-400'}`} />
                  <span
                    className={`font-mono text-base font-black ${
                      timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'
                    }`}
                  >
                    {timeLeft}s
                  </span>
                </div>
              )}

              {/* Score Display */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-base font-black text-amber-400">
                  {score.toLocaleString('tr-TR')}
                </span>
              </div>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            {/* Streak & Fever Banner */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-850/90 border border-slate-750">
              <div className="flex items-center gap-2">
                <Flame
                  className={`w-4 h-4 transition-colors ${
                    feverMode
                      ? 'text-rose-500 fill-rose-500 animate-bounce'
                      : streak >= 6
                      ? 'text-orange-500 fill-orange-500'
                      : streak >= 3
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-300">
                  Seri: <strong className="text-white">{streak}</strong>
                </span>
              </div>

              {/* Multiplier Badge */}
              {feverMode ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider animate-pulse shadow-md shadow-rose-500/20">
                  <Sparkles className="w-3 h-3" />
                  <span>Coşku Modu (5x)</span>
                </div>
              ) : currentMultiplier > 1 ? (
                <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black">
                  {currentMultiplier}x Seri
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">1x Standart</span>
              )}
            </div>

            {/* Countdown Progress Bar (Time modes) */}
            {mode !== 'survival' && (
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${
                    timeLeft <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-amber-400'
                  }`}
                  style={{ width: `${(timeLeft / totalTime) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* GAME BOARD: 2 COLUMNS (5 EN & 5 TR) */}
          <div className="my-auto py-2 grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
            {/* English Column */}
            <div className="space-y-2 sm:space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center pb-0.5">
                İngilizce
              </div>
              {enCards.map((card) => {
                const isSelected = selectedEn?.instanceId === card.instanceId;
                const isMatched = card.status === 'matched';
                const isWrong = card.status === 'wrong';

                return (
                  <button
                    key={card.instanceId}
                    onClick={() => handleCardClick(card)}
                    disabled={isMatched}
                    className={`relative w-full min-h-[58px] sm:min-h-[66px] px-3 py-2 rounded-2xl font-bold text-sm sm:text-base text-center transition-all flex items-center justify-center border cursor-pointer ${
                      isMatched
                        ? 'animate-kp-pop-out pointer-events-none opacity-0'
                        : isWrong
                        ? 'animate-kp-shake bg-rose-500/20 border-rose-500 text-rose-300'
                        : isSelected
                        ? 'bg-brand-600/30 border-brand-400 text-white ring-2 ring-brand-400/60 shadow-lg scale-[1.02]'
                        : card.isGolden
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border-amber-400/80 text-amber-200 hover:border-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-650 hover:bg-slate-800 text-slate-100'
                    }`}
                  >
                    {/* Golden Star indicator */}
                    {card.isGolden && !isMatched && (
                      <span className="absolute top-1.5 right-2 text-amber-400 text-xs">
                        ⭐
                      </span>
                    )}
                    <span className="truncate max-w-[90%] leading-tight">{card.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Turkish Column */}
            <div className="space-y-2 sm:space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center pb-0.5">
                Türkçe
              </div>
              {trCards.map((card) => {
                const isSelected = selectedTr?.instanceId === card.instanceId;
                const isMatched = card.status === 'matched';
                const isWrong = card.status === 'wrong';

                return (
                  <button
                    key={card.instanceId}
                    onClick={() => handleCardClick(card)}
                    disabled={isMatched}
                    className={`relative w-full min-h-[58px] sm:min-h-[66px] px-3 py-2 rounded-2xl font-bold text-sm sm:text-base text-center transition-all flex items-center justify-center border cursor-pointer ${
                      isMatched
                        ? 'animate-kp-pop-out pointer-events-none opacity-0'
                        : isWrong
                        ? 'animate-kp-shake bg-rose-500/20 border-rose-500 text-rose-300'
                        : isSelected
                        ? 'bg-indigo-600/30 border-indigo-400 text-white ring-2 ring-indigo-400/60 shadow-lg scale-[1.02]'
                        : card.isGolden
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border-amber-400/80 text-amber-200 hover:border-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-800/90 border-slate-700/80 hover:border-slate-650 hover:bg-slate-800 text-slate-100'
                    }`}
                  >
                    {/* Golden Star indicator */}
                    {card.isGolden && !isMatched && (
                      <span className="absolute top-1.5 right-2 text-amber-400 text-xs">
                        ⭐
                      </span>
                    )}
                    <span className="truncate max-w-[90%] leading-tight">{card.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom status hint */}
          <div className="text-center text-[11px] text-slate-400 pt-1">
            Doğru eşleşen kelimeler anında patlar ve yenileri gelir!
          </div>
        </div>
      )}

      {/* ========================================================
          3. GAME OVER MODAL (Sonuç & İstatistik Ekranı)
      ======================================================== */}
      {gameState === 'gameover' && (
        <div className="relative z-20 flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col justify-between animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-3 pt-2">
            {/* Crown / Record Badge */}
            {isNewRecord ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 animate-pulse">
                <Crown className="w-4 h-4 fill-slate-950" />
                <span>YENİ REKOR!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Oyun Tamamlandı</span>
              </div>
            )}

            <h2 className="text-3xl font-black text-white">
              {isNewRecord ? 'Harika Bir Performans!' : 'Tebrikler!'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === '30s'
                ? '30 Saniye Yıldırım Modu Özeti'
                : mode === '60s'
                ? '60 Saniye Klasik Mod Özeti'
                : 'Dayanabildiğin Kadar Mod Özeti'}
            </p>

            {/* Big Score Box */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-800/90 to-slate-850 border border-slate-700/80 shadow-xl space-y-1 my-3">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Toplam Puan
              </span>
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200 font-mono">
                {score.toLocaleString('tr-TR')}
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              {/* Correct Matches */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Doğru Eşleşme</span>
                </div>
                <div className="text-lg font-black text-white">{correctMatches}</div>
              </div>

              {/* Accuracy */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Doğruluk Oranı</span>
                </div>
                <div className="text-lg font-black text-white">%{accuracyPercent}</div>
              </div>

              {/* Max Streak */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>En Uzun Seri</span>
                </div>
                <div className="text-lg font-black text-white">{maxStreak}</div>
              </div>

              {/* High Score */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>En Yüksek Puan</span>
                </div>
                <div className="text-lg font-black text-amber-400 font-mono">
                  {highScores[mode].toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4">
            <button
              onClick={() => startGame(mode)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base shadow-lg shadow-amber-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Tekrar Oyna</span>
            </button>

            <button
              onClick={() => setGameState('lobby')}
              className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-sm border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Mod Değiştir</span>
            </button>

            <Link
              href="/"
              className="w-full py-2.5 px-6 text-center text-xs text-slate-400 hover:text-white transition block"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
