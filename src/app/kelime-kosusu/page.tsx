'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Heart,
  Trophy,
  Flame,
  Zap,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  CheckCircle,
  Crown,
  Play,
  Star,
  Volume1,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import {
  playTapSound,
  playMatchSound,
  playComboSound,
  playFeverModeSound,
  playErrorSound,
  playGameOverSound,
  playCoinSound,
  getSoundMuted,
  setSoundMuted,
} from '@/lib/sound-effects';
import { WordPair, DEFAULT_KELIME_PATLAT_WORDS } from '@/lib/kelime-patlat-words';
import { RunnerEngine, QuestionData, GateOption } from '@/lib/runner/engine';

export default function KelimeKosusuPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<RunnerEngine | null>(null);

  // Sound state
  const [muted, setMuted] = useState(false);

  // Game lifecycle state
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');

  // Stats & Progress
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [feverMode, setFeverMode] = useState(false);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Current Question on screen
  const [activeQuestion, setActiveQuestion] = useState<{
    turkishWord: string;
    englishCorrect: string;
    questionNumber: number;
    totalQuestions: number;
  } | null>(null);

  // Floating feedback banner
  const [floatingBonus, setFloatingBonus] = useState<{ id: number; text: string; color: string } | null>(null);

  // Touch Swipe tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // 1. Initialize High Score & Sound
  useEffect(() => {
    setMuted(getSoundMuted());
    if (typeof window !== 'undefined') {
      const savedHs = parseInt(localStorage.getItem('zb_runner_highscore') || '0', 10);
      setHighScore(savedHs);
    }
  }, []);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const triggerFloatingBonus = (text: string, color: string = 'text-amber-300') => {
    const id = Date.now();
    setFloatingBonus({ id, text, color });
    setTimeout(() => {
      setFloatingBonus((cur) => (cur?.id === id ? null : cur));
    }, 1100);
  };

  // 2. Pronounce word using Web Speech API
  const speakWord = (word: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 3. Prepare 10-Question Course from Word Pool
  const prepareQuestions = useCallback((): QuestionData[] => {
    const shuffledPool = [...DEFAULT_KELIME_PATLAT_WORDS].sort(() => Math.random() - 0.5);
    const selected10 = shuffledPool.slice(0, 10);

    const colors = ['#E11D48', '#22C55E', '#0284C7']; // Red, Green, Blue gate colors

    return selected10.map((item) => {
      // Pick 2 distractors
      const distractors = shuffledPool
        .filter((w) => w.id !== item.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);

      // 3 lanes: -1, 0, 1 shuffled
      const lanes: (-1 | 0 | 1)[] = [-1, 0, 1].sort(() => Math.random() - 0.5) as (-1 | 0 | 1)[];
      const colorShuffled = [...colors].sort(() => Math.random() - 0.5);

      const options: GateOption[] = [
        {
          text: item.en.toUpperCase(),
          isCorrect: true,
          lane: lanes[0],
          color: colorShuffled[0],
        },
        {
          text: distractors[0].en.toUpperCase(),
          isCorrect: false,
          lane: lanes[1],
          color: colorShuffled[1],
        },
        {
          text: distractors[1].en.toUpperCase(),
          isCorrect: false,
          lane: lanes[2],
          color: colorShuffled[2],
        },
      ];

      return {
        turkishWord: item.tr.toUpperCase(),
        englishCorrect: item.en.toUpperCase(),
        options,
      };
    });
  }, []);

  // 4. Start 10-Question Runner
  const startGame = () => {
    playTapSound();
    triggerHaptic('medium');

    setGameState('playing');
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setLives(3);
    setFeverMode(false);
    setCoinsCollected(0);
    setCorrectCount(0);
    setWrongCount(0);
    setIsNewRecord(false);

    const questions = prepareQuestions();

    // Set first question on top banner (Do NOT auto-speak to prevent answer spoiler!)
    if (questions.length > 0) {
      setActiveQuestion({
        turkishWord: questions[0].turkishWord,
        englishCorrect: questions[0].englishCorrect,
        questionNumber: 1,
        totalQuestions: 10,
      });
    }

    // Initialize Canvas Engine after DOM update
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Handle retina HD canvas resolution
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const engine = new RunnerEngine(canvas, questions, {
        onCorrectGate: (qIndex, basePoints) => {
          triggerHaptic('heavy');
          playMatchSound();

          // Pronounce the correct word NOW that the player picked it!
          const answeredQ = questions[qIndex];
          if (answeredQ) {
            setTimeout(() => speakWord(answeredQ.englishCorrect), 50);
          }

          setCorrectCount((c) => c + 1);
          setStreak((prevStreak) => {
            const nextStreak = prevStreak + 1;
            setMaxStreak((max) => Math.max(max, nextStreak));

            // Multiplier
            const multiplier = nextStreak >= 5 ? 3 : nextStreak >= 3 ? 2 : 1;
            const earned = basePoints * multiplier;

            setScore((s) => s + earned);

            if (nextStreak === 3) {
              playComboSound(2);
              triggerFloatingBonus('2x Seri! 🔥', 'text-amber-300');
            } else if (nextStreak === 5) {
              setFeverMode(true);
              if (engineRef.current) engineRef.current.feverMode = true;
              playFeverModeSound();
              triggerFloatingBonus('⚡ COŞKU MODU! (3x) ⚡', 'text-yellow-300');
              confetti({ particleCount: 40, spread: 70 });
            } else {
              triggerFloatingBonus(`+${earned} Doğru Kapı!`, 'text-emerald-300');
            }

            return nextStreak;
          });

          // Update active question for next gate (do not speak next question yet!)
          if (qIndex + 1 < questions.length) {
            const nextQ = questions[qIndex + 1];
            setActiveQuestion({
              turkishWord: nextQ.turkishWord,
              englishCorrect: nextQ.englishCorrect,
              questionNumber: qIndex + 2,
              totalQuestions: 10,
            });
          }
        },

        onWrongGate: (qIndex) => {
          triggerHaptic('error');
          playErrorSound();

          setWrongCount((w) => w + 1);
          setStreak(0);
          setFeverMode(false);
          if (engineRef.current) engineRef.current.feverMode = false;
          triggerFloatingBonus('Yanlış Kapı! -1 Can', 'text-rose-400 font-black');

          setLives((prevLives) => {
            const newLives = prevLives - 1;
            if (newLives <= 0) {
              setTimeout(() => endGame(false), 300);
            }
            return newLives;
          });

          if (qIndex + 1 < questions.length) {
            const nextQ = questions[qIndex + 1];
            setActiveQuestion({
              turkishWord: nextQ.turkishWord,
              englishCorrect: nextQ.englishCorrect,
              questionNumber: qIndex + 2,
              totalQuestions: 10,
            });
          }
        },

        onCoinCollected: (points) => {
          triggerHaptic('light');
          playCoinSound();
          setCoinsCollected((c) => c + 1);
          setScore((s) => s + points);
        },

        onFinishCourse: () => {
          endGame(true);
        },
      });

      engineRef.current = engine;
      engine.start();
    }, 60);
  };

  // 5. End Game
  const endGame = useCallback(
    (finishedAll: boolean) => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      setGameState('gameover');

      setScore((finalScore) => {
        const isRecord = finalScore > highScore && finalScore > 0;
        setIsNewRecord(isRecord);

        if (isRecord && typeof window !== 'undefined') {
          localStorage.setItem('zb_runner_highscore', finalScore.toString());
          setHighScore(finalScore);
        }

        playGameOverSound(isRecord || finishedAll);
        if (finishedAll) {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
          });
        }
        return finalScore;
      });
    },
    [highScore]
  );

  // 6. Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        engineRef.current?.moveLeft();
        triggerHaptic('light');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        engineRef.current?.moveRight();
        triggerHaptic('light');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // 7. Touch Swipe Listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Minimum swipe threshold (25px)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 25) {
      if (diffX > 0) {
        engineRef.current?.moveRight();
        triggerHaptic('light');
      } else {
        engineRef.current?.moveLeft();
        triggerHaptic('light');
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Accuracy calculation
  const totalQuestionsDone = correctCount + wrongCount;
  const accuracyPercent =
    totalQuestionsDone > 0 ? Math.round((correctCount / totalQuestionsDone) * 100) : 100;

  // Star rating
  const starsEarned = correctCount >= 9 ? 3 : correctCount >= 7 ? 2 : correctCount >= 5 ? 1 : 0;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[100dvh] bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Floating bonus message banner */}
      {floatingBonus && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="px-5 py-2 rounded-full bg-slate-950/95 border-2 border-yellow-400 shadow-2xl backdrop-blur-md">
            <span className={`text-base sm:text-lg font-black tracking-wide drop-shadow-md ${floatingBonus.color}`}>
              {floatingBonus.text}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================
          1. LOBBY SCREEN (10 Kelimelik Parkur Modu)
      ======================================================== */}
      {gameState === 'lobby' && (
        <div className="relative z-10 flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col justify-between">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="px-3.5 py-2.5 rounded-2xl bg-[#1351B4] hover:bg-[#1862DC] text-white border-2 border-[#38BDF8]/60 border-b-4 border-b-[#0B377E] shadow-md font-bold text-xs flex items-center gap-1.5 active:translate-y-1 transition"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>Akademi</span>
            </Link>

            <button
              onClick={toggleSound}
              className="p-2.5 rounded-2xl bg-[#059669] hover:bg-[#10B981] text-white border-2 border-[#34D399] border-b-4 border-b-[#047857] shadow-md active:translate-y-1 transition cursor-pointer"
            >
              {muted ? <VolumeX className="w-5 h-5 stroke-[2.5]" /> : <Volume2 className="w-5 h-5 stroke-[2.5]" />}
            </button>
          </div>

          {/* 3D Game Title Banner */}
          <div className="text-center my-auto py-4 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <span>🏃‍♂️ Pseudo-3D Koşu Oyunu</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none text-center drop-shadow-[0_6px_0px_rgba(11,55,126,0.9)]">
              <span className="block text-[#FFCC00] drop-shadow-[0_4px_0px_#B45309]">
                Kelime
              </span>
              <span className="block text-[#0284C7] drop-shadow-[0_4px_0px_#075985] -mt-1">
                Koşusu
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-cyan-100 font-extrabold max-w-xs mx-auto leading-relaxed">
              3 şeritli yolda koş, sorulan kelimenin doğru İngilizce kapısından geç ve okul bahçesine ulaş! 🏫
            </p>

            {/* High score badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 shadow-md">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">En Yüksek Skor:</span>
              <strong className="text-amber-400 font-black font-mono text-sm">{highScore}</strong>
            </div>
          </div>

          {/* Mode Card: 10 Kelimelik Parkur */}
          <div className="space-y-3 mb-4">
            <div className="p-4 rounded-3xl bg-gradient-to-r from-[#FFFDF9] to-[#FFF6EA] text-slate-800 border-2 border-[#FED7AA] border-b-[6px] border-b-[#EA580C] shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 border-b-2 border-orange-700 flex items-center justify-center text-white shadow-md">
                  <Crown className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">10 Kelimelik Parkur</h3>
                  <p className="text-xs font-bold text-slate-500">10 kapıdan geç, okul bahçesine var!</p>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                <div>👉 Parmağını sağa/sola kaydır</div>
                <div>⚡ 5 seride Coşku Modu</div>
                <div>❤️ 3 can hakkı</div>
                <div>⭐ Altınları topla</div>
              </div>
            </div>

            {/* Big Start Button */}
            <button
              onClick={startGame}
              className="w-full py-4 px-6 rounded-3xl bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 font-black text-lg border-2 border-green-200 border-b-[6px] border-b-emerald-700 shadow-2xl active:translate-y-1 active:border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              <span>Koşuya Başla!</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          2. IN-GAME SCREEN (Pseudo-3D Canvas + Referans Arayüzü)
      ======================================================== */}
      {gameState === 'playing' && (
        <div className="relative w-full h-full flex flex-col justify-between">
          {/* TOP CONTROLS & STATS (Görseldeki Birebir Şık Hap Barlar) */}
          <div className="relative z-30 px-3 sm:px-4 pt-2.5 sm:pt-3 space-y-2 pointer-events-auto">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Back Button */}
              <button
                onClick={() => {
                  if (confirm('Koşudan çıkmak istediğinize emin misiniz?')) {
                    if (engineRef.current) engineRef.current.stop();
                    setGameState('lobby');
                  }
                }}
                className="p-2 sm:p-2.5 rounded-2xl bg-[#1351B4] hover:bg-[#1862DC] text-white border-2 border-[#38BDF8]/70 border-b-4 border-b-[#0B377E] shadow-md active:translate-y-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 stroke-[3]" />
              </button>

              {/* Lives Capsule */}
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

              {/* Score Capsule */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0A337A]/85 border-2 border-[#1E52A8] shadow-inner backdrop-blur-xs">
                <Trophy className="w-5 h-5 text-[#FFD215] fill-[#FFD215]" />
                <span className="font-mono text-base font-black text-[#FFD215] tracking-tight">
                  {score.toLocaleString('tr-TR')}
                </span>
              </div>

              {/* Streak xN Badge */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0A337A]/85 border-2 border-[#1E52A8] text-white font-black text-xs">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Seri x{streak}</span>
              </div>

              {/* Coşku Modu Badge (if active) */}
              {feverMode && (
                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs animate-pulse shadow-md flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Coşku</span>
                </div>
              )}

              {/* Sound Button */}
              <button
                onClick={toggleSound}
                className="p-2 sm:p-2.5 rounded-2xl bg-[#059669] hover:bg-[#10B981] text-white border-2 border-[#34D399] border-b-4 border-b-[#047857] shadow-md active:translate-y-1 transition cursor-pointer"
              >
                {muted ? <VolumeX className="w-5 h-5 stroke-[2.5]" /> : <Volume2 className="w-5 h-5 stroke-[2.5]" />}
              </button>
            </div>

            {/* QUESTION BANNER (OKUL - Doğru İngilizceyi Seç) */}
            {activeQuestion && (
              <div className="max-w-md mx-auto w-full p-2.5 sm:p-3 rounded-3xl bg-white text-slate-900 border-2 border-slate-200 border-b-4 border-b-slate-400 shadow-xl flex items-center justify-between px-5">
                {/* Voice pronounce button */}
                <button
                  onClick={() => speakWord(activeQuestion.englishCorrect)}
                  className="p-2 rounded-xl bg-sky-100 text-sky-700 hover:bg-sky-200 transition cursor-pointer"
                  title="Telaffuzu Dinle"
                >
                  <Volume1 className="w-6 h-6 stroke-[2.5]" />
                </button>

                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {activeQuestion.turkishWord}
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-500 mt-0.5">
                    Doğru İngilizce kapıdan geç! ({activeQuestion.questionNumber}/{activeQuestion.totalQuestions})
                  </div>
                </div>

                {/* Question progress pill */}
                <div className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  #{activeQuestion.questionNumber}
                </div>
              </div>
            )}
          </div>

          {/* MAIN CANVAS RENDERING AREA */}
          <div className="absolute inset-0 z-10 w-full h-full">
            <canvas ref={canvasRef} className="w-full h-full block touch-none" />
          </div>

          {/* BOTTOM ON-SCREEN TOUCH BUTTONS (For Mobile Ergonomics) */}
          <div className="relative z-30 px-4 pb-4 flex items-center justify-between pointer-events-none">
            {/* Left Lane Shift Button */}
            <button
              onClick={() => {
                engineRef.current?.moveLeft();
                triggerHaptic('light');
              }}
              className="pointer-events-auto w-14 h-14 rounded-2xl bg-white/20 hover:bg-white/35 active:bg-white/50 backdrop-blur-md border-2 border-white/40 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
              aria-label="Sola Geç"
            >
              <ChevronLeft className="w-8 h-8 stroke-[3]" />
            </button>

            {/* Touch hint */}
            <div className="text-[11px] font-bold text-white/70 bg-black/30 px-3 py-1 rounded-full backdrop-blur-xs">
              Swipe (Kaydır) veya Oklar
            </div>

            {/* Right Lane Shift Button */}
            <button
              onClick={() => {
                engineRef.current?.moveRight();
                triggerHaptic('light');
              }}
              className="pointer-events-auto w-14 h-14 rounded-2xl bg-white/20 hover:bg-white/35 active:bg-white/50 backdrop-blur-md border-2 border-white/40 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
              aria-label="Sağa Geç"
            >
              <ChevronRight className="w-8 h-8 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          3. GAME OVER / VICTORY MODAL
      ======================================================== */}
      {gameState === 'gameover' && (
        <div className="relative z-50 flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col justify-between animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-3 pt-2">
            {/* Star Rating & Crown */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-10 h-10 transition-transform ${
                    starIdx <= starsEarned
                      ? 'text-yellow-400 fill-yellow-400 scale-110 drop-shadow-md animate-bounce'
                      : 'text-slate-600 scale-90'
                  }`}
                />
              ))}
            </div>

            <h2 className="text-4xl font-black text-white drop-shadow-[0_3px_0px_rgba(0,0,0,0.4)]">
              {lives > 0 ? 'Parkur Tamamlandı! 🏆' : 'Parkur Bitti!'}
            </h2>
            <p className="text-xs text-cyan-200 font-bold">
              {lives > 0 ? 'Okul bahçesine başarıyla ulaştın!' : 'Canların tükendi, bir dahaki sefere!'}
            </p>

            {/* Big Score Box */}
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
                  <span>Doğru Kapı</span>
                </div>
                <div className="text-xl font-black text-white">
                  {correctCount} / 10
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#09357E]/90 border-2 border-[#1D54AE] shadow-inner space-y-1">
                <div className="text-[11px] font-bold text-cyan-200 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Altın Sayısı</span>
                </div>
                <div className="text-xl font-black text-white">{coinsCollected}</div>
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
                  {highScore.toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4">
            <button
              onClick={startGame}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-base border-2 border-yellow-200 border-b-4 border-b-amber-600 shadow-xl active:translate-y-1 active:border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 stroke-[3]" />
              <span>Tekrar Koş</span>
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
