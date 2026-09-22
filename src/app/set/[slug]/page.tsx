'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import {
  Volume2,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trophy,
  Repeat,
  BookOpen,
  Home,
  Play,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { decodeSetDescription } from '@/lib/set-utils';
import { decodeCardTurkish } from '@/lib/card-utils';
import { triggerHaptic } from '@/lib/haptics';

const BADGE_COLORS = [
  'bg-rose-500 text-white',
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-purple-500 text-white',
  'bg-cyan-500 text-white',
  'bg-pink-500 text-white',
  'bg-indigo-500 text-white',
  'bg-teal-500 text-white',
  'bg-orange-500 text-white',
];

export default function SetStudyPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [setInfo, setSetInfo] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active study mode: 'story' | 'flashcards' | 'quiz' | 'writing'
  const [mode, setMode] = useState<'story' | 'flashcards' | 'quiz' | 'writing'>('flashcards');
  const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null);

  // Study Notes Modal
  const [showNotesModal, setShowNotesModal] = useState(false);

  // 1. Flashcard State
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // 2. Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizDirection, setQuizDirection] = useState<'en_to_tr' | 'tr_to_en'>('en_to_tr');

  // 3. Writing State
  const [writingIndex, setWritingIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [writingStatus, setWritingStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    async function loadSet() {
      if (!slug) return;
      try {
        setLoading(true);
        const { data: setItem, error: setErr } = await supabase
          .from('sets')
          .select('*, folders(name, classes(name)), set_cards(*)')
          .eq('slug', slug)
          .single();

        if (setErr) throw setErr;

        if (setItem) {
          setSetInfo(setItem);
          const decodedDesc = decodeSetDescription(setItem.description);
          if (decodedDesc.storyMeta?.isStory) {
            setMode('story');
          }
          const sortedCards = (setItem.set_cards || [])
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((c: any) => {
              const decoded = decodeCardTurkish(c.turkish_text);
              return {
                ...c,
                turkish_text: decoded.turkish,
                hint: decoded.hint,
              };
            });
          setCards(sortedCards);
        }
      } catch (e) {
        console.error('Set yükleme hatası:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSet();
  }, [slug]);

  // High-performance audio player with Microsoft Edge Jenny Neural + local fallback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fallbackSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const speak = (text: string) => {
    if (!text?.trim()) return;
    const cleanText = text.trim();

    try {
      if (typeof window === 'undefined') return;
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.pause();

      const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
      audio.src = ttsUrl;
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Edge TTS playback failed, falling back to Web Speech:', err);
          fallbackSpeak(cleanText);
        });
      }
    } catch (e) {
      fallbackSpeak(cleanText);
    }
  };

  const speakSentence = (text: string, idx?: number) => {
    if (idx !== undefined) setPlayingSentenceIdx(idx);
    speak(text);
    setTimeout(() => {
      setPlayingSentenceIdx(null);
    }, 3000);
  };

  // Animation state for card sliding (Quizlet-style slide & swipe)
  type SlideStatus = 'idle' | 'exit-left' | 'exit-right' | 'enter-left' | 'enter-right';
  const [slideStatus, setSlideStatus] = useState<SlideStatus>('idle');
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const triggerNext = () => {
    if (slideStatus !== 'idle') return;
    triggerHaptic('light');
    setSlideStatus('exit-left');
    setTimeout(() => {
      setIsFlipped(false);
      setCardIndex((prev) => (prev + 1) % cards.length);
      setSlideStatus('enter-right');
      setTimeout(() => {
        setSlideStatus('idle');
        setDragOffset(0);
      }, 40);
    }, 200);
  };

  const triggerPrev = () => {
    if (slideStatus !== 'idle') return;
    triggerHaptic('light');
    setSlideStatus('exit-right');
    setTimeout(() => {
      setIsFlipped(false);
      setCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
      setSlideStatus('enter-left');
      setTimeout(() => {
        setSlideStatus('idle');
        setDragOffset(0);
      }, 40);
    }, 200);
  };

  // Keyboard navigation for flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'flashcards') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        triggerNext();
      } else if (e.code === 'ArrowLeft') {
        triggerPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, cardIndex, cards.length, slideStatus]);

  const getSlideStyle = (): React.CSSProperties => {
    if (slideStatus === 'exit-left') {
      return {
        transform: 'translateX(-115%) rotate(-8deg)',
        opacity: 0,
        transition: 'transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s ease-in',
      };
    }
    if (slideStatus === 'exit-right') {
      return {
        transform: 'translateX(115%) rotate(8deg)',
        opacity: 0,
        transition: 'transform 0.22s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s ease-in',
      };
    }
    if (slideStatus === 'enter-right') {
      return {
        transform: 'translateX(70px)',
        opacity: 0,
        transition: 'none',
      };
    }
    if (slideStatus === 'enter-left') {
      return {
        transform: 'translateX(-70px)',
        opacity: 0,
        transition: 'none',
      };
    }
    if (isDragging) {
      return {
        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.04}deg)`,
        transition: 'none',
      };
    }
    return {
      transform: 'translateX(0px) rotate(0deg)',
      opacity: 1,
      transition: 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out',
    };
  };

  // Mobile Touch Swipe Navigation (Quizlet-style with finger tracking)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (slideStatus !== 'idle') return;
    // If the touch started on a button (like the sound button), ignore card touch
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchMovedRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (slideStatus !== 'idle' || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = e.touches[0].clientY - touchStartYRef.current;

    if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
      touchMovedRef.current = true;
    }

    // Follow user's finger horizontally
    if (Math.abs(diffX) > Math.abs(diffY)) {
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      touchMovedRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const swipeThreshold = 50; // minimum horizontal distance in px to slide

    lastTouchTimeRef.current = Date.now();
    setIsDragging(false);

    if (diffX < -swipeThreshold) {
      // Swiped Left -> Next Card with animation
      triggerNext();
    } else if (diffX > swipeThreshold) {
      // Swiped Right -> Previous Card with animation
      triggerPrev();
    } else if (!touchMovedRef.current) {
      // Tap without swipe -> Flip Card
      triggerHaptic('light');
      setIsFlipped((prev) => !prev);
      setDragOffset(0);
    } else {
      // Dragged below threshold -> snap back smoothly
      setDragOffset(0);
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchMovedRef.current = false;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (slideStatus !== 'idle') return;
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // If triggered by a touch event recently, ignore the click to avoid double-toggling
    if (Date.now() - lastTouchTimeRef.current < 450) {
      return;
    }
    triggerHaptic('light');
    setIsFlipped((prev) => !prev);
  };

  const currentQuizCard = cards[quizIndex];
  const quizOptions = useMemo(() => {
    if (!currentQuizCard || cards.length < 2) return [];

    const isEnToTr = quizDirection === 'en_to_tr';
    const correctAnswer = isEnToTr
      ? currentQuizCard.turkish_text
      : currentQuizCard.english_text;

    const pool = cards
      .filter((c) => c.id !== currentQuizCard.id)
      .map((c) => (isEnToTr ? c.turkish_text : c.english_text));

    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const distractors = shuffledPool.slice(0, 3);

    return [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  }, [currentQuizCard, cards, quizDirection]);

  const handleSelectQuizOption = (opt: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(opt);
    setIsAnswerChecked(true);

    const isEnToTr = quizDirection === 'en_to_tr';
    const correctAnswer = isEnToTr
      ? currentQuizCard.turkish_text
      : currentQuizCard.english_text;

    if (opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      setQuizScore((prev) => prev + 1);
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
    }
  };

  const handleNextQuizQuestion = () => {
    if (quizIndex + 1 < cards.length) {
      setQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setQuizFinished(true);
      triggerHaptic('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setQuizFinished(false);
  };

  const handleCheckWriting = (e: React.FormEvent) => {
    e.preventDefault();
    const currentCard = cards[writingIndex];
    if (!currentCard || !userInput.trim()) return;

    const cleanUser = userInput
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanTarget = currentCard.english_text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanUser === cleanTarget) {
      setWritingStatus('correct');
      triggerHaptic('success');
      speak(currentCard.english_text);
    } else {
      setWritingStatus('wrong');
      triggerHaptic('error');
    }
  };

  const nextWritingCard = () => {
    setWritingStatus('idle');
    setUserInput('');
    setShowAnswer(false);
    setWritingIndex((prev) => (prev + 1) % cards.length);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Çalışma seti yükleniyor...</p>
      </div>
    );
  }

  if (!setInfo || cards.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
        <p className="text-slate-600 font-normal">Bu sette henüz kart bulunamadı.</p>
        <Link href="/" className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold">
          Derslere Dön
        </Link>
      </div>
    );
  }

  const currentCard = cards[cardIndex];
  const { description: cleanDesc, coverImageUrl, studyNotes, storyMeta } = decodeSetDescription(setInfo.description);

  return (
    <div className={`mx-auto space-y-3 sm:space-y-5 ${mode === 'story' ? 'max-w-7xl' : 'max-w-3xl'}`}>
      {/* Compact Study Navigation Bar */}
      <div className="flex items-center justify-between gap-2 px-1 py-1 sm:pb-2 border-b border-slate-200/80">
        {/* Left: Geri (Back) + Ana Sayfa (Home) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Geri Dön"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Geri</span>
          </button>

          <Link
            href="/"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Ana Sayfa"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Ana Sayfa</span>
          </Link>
        </div>

        {/* Center: Set Name */}
        <div className="text-center min-w-0 flex-1 px-2">
          <h1 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">
            {setInfo.title}
          </h1>
          {storyMeta?.subtitle && (
            <p className="text-xs text-brand-600 font-bold truncate">
              {storyMeta.subtitle}
            </p>
          )}
        </div>

        {/* Right: Card Counter */}
        <div className="flex items-center shrink-0">
          <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs">
            {storyMeta?.isStory ? `${cards.length} Cümle` : `${cardIndex + 1} / ${cards.length}`}
          </span>
        </div>
      </div>

      {/* Slimline 2px Progress Line (Takes virtually no vertical space) */}
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div
          className="bg-brand-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.round(((cardIndex + 1) / cards.length) * 100)}%` }}
        />
      </div>

      {/* Centered Konu Anlatımı Button (Prominent & Balanced) */}
      {studyNotes && (
        <div className="flex justify-center pt-0.5">
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200 shadow-2xs hover:shadow-xs transition-all active:scale-95 group"
          >
            <BookOpen className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>Konu Anlatımı & Notlar</span>
          </button>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className={`grid ${storyMeta?.isStory ? 'grid-cols-4' : 'grid-cols-3'} gap-1 bg-slate-200/70 p-1 rounded-2xl`}>
        {storyMeta?.isStory && (
          <button
            onClick={() => setMode('story')}
            className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              mode === 'story'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            📖 Hikaye
          </button>
        )}
        <button
          onClick={() => {
            setMode('flashcards');
            setIsFlipped(false);
          }}
          className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            mode === 'flashcards'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          Kartlar
        </button>
        <button
          onClick={() => {
            setMode('quiz');
            resetQuiz();
          }}
          className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            mode === 'quiz'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          Test
        </button>
        <button
          onClick={() => {
            setMode('writing');
            setWritingStatus('idle');
            setUserInput('');
          }}
          className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            mode === 'writing'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          Yaz
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODE 0: STORY VIEW (10-Sentence Visual Table Layout)       */}
      {/* ========================================================= */}
      {mode === 'story' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Content: Desktop 2-column, Mobile 1-column */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Column: Scene Illustration & Motivational Quote (Compact fixed sidebar) */}
            <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-3 lg:sticky lg:top-4">
              {coverImageUrl ? (
                <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-50 aspect-4/3 relative group">
                  <img
                    src={coverImageUrl}
                    alt={setInfo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="hidden lg:flex rounded-3xl p-8 border-2 border-dashed border-slate-200 bg-slate-50 text-center flex-col items-center justify-center space-y-2 aspect-4/3">
                  <BookOpen className="w-12 h-12 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-400">Görsel Eklenmemiş</span>
                </div>
              )}
            </div>

            {/* Right Column: Sentence List / Table (Expands to fill remaining space) */}
            <div className="flex-1 min-w-0 w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-3.5 sm:p-6 space-y-2">
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-[36px_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(210px,auto)] gap-4 px-3.5 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <div className="text-center">#</div>
                <div className="flex items-center gap-1.5">
                  <span>🇬🇧 İngilizce</span>
                </div>
                <div>🇹🇷 Türkçe</div>
                <div>🎧 Okunuş</div>
              </div>

              {/* Sentences Rows */}
              <div className="divide-y divide-slate-100">
                {cards.map((card, idx) => {
                  const badgeColor = BADGE_COLORS[idx % BADGE_COLORS.length];
                  const isPlaying = playingSentenceIdx === idx;

                  return (
                    <div
                      key={card.id || idx}
                      className={`py-2.5 sm:py-3 px-2 sm:px-3.5 rounded-2xl transition-all ${
                        isPlaying ? 'bg-brand-50/70 ring-1 ring-brand-200 shadow-2xs' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Desktop Grid Layout (Spacious, Single-line Pronunciation) */}
                      <div className="hidden sm:grid grid-cols-[36px_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(210px,auto)] gap-4 items-center">
                        {/* Number Badge */}
                        <div className="flex justify-center">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shadow-2xs ${badgeColor}`}
                          >
                            {idx + 1}
                          </span>
                        </div>

                        {/* English with Play Button */}
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => speakSentence(card.english_text, idx)}
                            className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform"
                            title="Sesli Dinle"
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                          <span className="text-sm font-bold text-slate-900 leading-snug">
                            {card.english_text}
                          </span>
                        </div>

                        {/* Turkish */}
                        <div className="text-sm font-medium text-slate-700 leading-snug">
                          {card.turkish_text}
                        </div>

                        {/* Pronunciation: strictly single line, never wrapping */}
                        <div className="flex items-center">
                          {card.pronunciation ? (
                            <button
                              type="button"
                              onClick={() => speakSentence(card.english_text, idx)}
                              className="text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-100/90 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap group shadow-2xs"
                              title="Tıkla ve dinle"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="whitespace-nowrap">{card.pronunciation}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </div>
                      </div>

                      {/* Mobile Card / Touch-Friendly Layout */}
                      <div className="sm:hidden space-y-1.5">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${badgeColor}`}
                          >
                            {idx + 1}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 leading-snug">
                                {card.english_text}
                              </span>
                              <button
                                type="button"
                                onClick={() => speakSentence(card.english_text, idx)}
                                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-xs"
                                title="Dinle"
                              >
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </button>
                            </div>

                            <p className="text-xs text-slate-600 font-medium mt-1">
                              {card.turkish_text}
                            </p>

                            {card.pronunciation && (
                              <button
                                type="button"
                                onClick={() => speakSentence(card.english_text, idx)}
                                className="mt-1.5 text-left text-[11px] font-semibold text-indigo-700 bg-indigo-50/90 border border-indigo-100/80 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Volume2 className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="whitespace-nowrap">{card.pronunciation}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 1: FLASHCARDS                                        */}
      {/* ========================================================= */}
      {mode === 'flashcards' && (
        <div className="space-y-3">
          {/* Subtle Swipe Hint on Mobile */}
          <div className="flex items-center justify-end text-xs text-slate-400">
            <span className="hidden sm:inline">← / → yön tuşları veya Space</span>
            <span className="sm:hidden text-[10px] text-slate-400 font-medium">
              👆 Sağa/Sola Kaydırın
            </span>
          </div>

          {/* Slide & Swipe Animation Container (Clean w-full without negative margins) */}
          <div className="overflow-hidden py-1 w-full">
            <div
              style={getSlideStyle()}
              onClick={handleCardClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full h-80 sm:h-96 perspective-1000 cursor-pointer select-none touch-pan-y"
            >
              <div
                className={`relative w-full h-full transform-style-preserve-3d flip-card-transition ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* FRONT (English) */}
                <div className="absolute inset-0 w-full h-full bg-white rounded-3xl border-2 border-slate-200/80 shadow-md p-6 flex flex-col justify-between card-face-front">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 tracking-wider">
                      ENGLISH
                    </span>
                    <button
                      type="button"
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        speak(currentCard.english_text);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(currentCard.english_text);
                      }}
                      className="p-2.5 rounded-full bg-slate-100 hover:bg-brand-100 text-slate-600 hover:text-brand-600 transition-colors active:scale-95 z-20"
                      title="Sesli Dinle"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center space-y-4 my-auto">
                    {currentCard.image_url && (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                        <img
                          src={currentCard.image_url}
                          alt="Visual"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h2 className="text-xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-relaxed px-4">
                      {currentCard.english_text}
                    </h2>
                    {currentCard.pronunciation && (
                      <p className="text-xs font-normal text-slate-400 italic">
                        /{currentCard.pronunciation}/
                      </p>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400 font-normal select-none">
                      Kartı çevirmek için dokunun ↺
                    </span>
                  </div>
                </div>

                {/* BACK (Turkish) */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-3xl shadow-md p-6 flex flex-col justify-between card-face-back">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white tracking-wider">
                      TÜRKÇE
                    </span>
                    <button
                      type="button"
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        speak(currentCard.english_text);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(currentCard.english_text);
                      }}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95 z-20"
                      title="İngilizcesini Dinle"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-center space-y-3 my-auto px-4">
                    <h2 className="text-xl sm:text-3xl font-semibold tracking-tight leading-relaxed">
                      {currentCard.turkish_text}
                    </h2>
                    {currentCard.hint && (
                      <div className="inline-block bg-white/15 border border-white/25 rounded-xl px-3.5 py-1.5 text-xs font-medium text-white/95 max-w-md mx-auto">
                        💡 {currentCard.hint}
                      </div>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <span className="text-xs text-white/70 font-normal select-none">
                      İngilizceye dönmek için dokunun ↺
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={triggerPrev}
              className="flex-1 py-3 px-3 sm:px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-sm text-slate-700 shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Önceki</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setIsFlipped(!isFlipped);
              }}
              className="py-3 px-4 sm:px-6 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-sm text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
              title="Kartı Çevir"
            >
              <RotateCcw className="w-4 h-4 text-brand-600 shrink-0" />
              <span className="inline font-semibold">Çevir</span>
            </button>

            <button
              onClick={triggerNext}
              className="flex-1 py-3 px-3 sm:px-4 rounded-xl bg-brand-600 hover:bg-brand-700 font-semibold text-sm text-white shadow-md shadow-brand-500/25 flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95"
            >
              <span>Sonraki</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: AUTO 4-CHOICE QUIZ                                */}
      {/* ========================================================= */}
      {mode === 'quiz' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          {!quizFinished ? (
            <>
              {/* Quiz Header & Direction Toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  Soru {quizIndex + 1} / {cards.length}
                </span>

                <button
                  onClick={() => {
                    setQuizDirection(
                      quizDirection === 'en_to_tr' ? 'tr_to_en' : 'en_to_tr'
                    );
                    resetQuiz();
                  }}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>
                    {quizDirection === 'en_to_tr'
                      ? 'İngilizce ➔ Türkçe'
                      : 'Türkçe ➔ İngilizce'}
                  </span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-center py-4 space-y-3">
                {currentQuizCard?.image_url && (
                  <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden shadow-sm border border-slate-100">
                    <img
                      src={currentQuizCard.image_url}
                      alt="Visual"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {quizDirection === 'en_to_tr'
                    ? currentQuizCard?.english_text
                    : currentQuizCard?.turkish_text}
                </h3>
                {quizDirection === 'en_to_tr' && (
                  <button
                    onClick={() => speak(currentQuizCard?.english_text)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Dinle</span>
                  </button>
                )}
              </div>

              {/* 4 Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizOptions.map((opt, i) => {
                  const isEnToTr = quizDirection === 'en_to_tr';
                  const correctAnswer = isEnToTr
                    ? currentQuizCard?.turkish_text
                    : currentQuizCard?.english_text;

                  const isCorrect =
                    opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
                  const isSelected = selectedOption === opt;

                  let btnStyle =
                    'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';

                  if (isAnswerChecked) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-500 text-white border-rose-600';
                    } else {
                      btnStyle = 'bg-slate-50 text-slate-400 border-slate-100 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={isAnswerChecked}
                      onClick={() => handleSelectQuizOption(opt)}
                      className={`p-4 rounded-2xl border-2 text-left font-semibold text-sm sm:text-base transition-all duration-150 flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswerChecked && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      )}
                      {isAnswerChecked && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Optional Explanation / Hint after answering */}
              {isAnswerChecked && currentQuizCard?.hint && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm font-normal animate-in fade-in duration-200">
                  <span className="font-bold">Açıklama / İpucu:</span> {currentQuizCard.hint}
                </div>
              )}

              {/* Next Question Button */}
              {isAnswerChecked && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleNextQuizQuestion}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span>
                      {quizIndex + 1 === cards.length
                        ? 'Sonuçları Gör'
                        : 'Sonraki Soru'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Quiz Results Screen */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Tebrikler! Testi Tamamladınız!
              </h3>
              <p className="text-base font-normal text-slate-600">
                {cards.length} sorudan{' '}
                <span className="font-bold text-emerald-600">
                  {quizScore}
                </span>{' '}
                tanesini doğru bildiniz.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={resetQuiz}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 shadow-md shadow-brand-500/20"
                >
                  Yeniden Çöz
                </button>
                <button
                  onClick={() => setMode('flashcards')}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200"
                >
                  Kartlara Dön
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: WRITING MODE                                      */}
      {/* ========================================================= */}
      {mode === 'writing' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">
              Cümle {writingIndex + 1} / {cards.length}
            </span>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showAnswer ? 'Cevabı Gizle' : 'Cevabı Gör'}</span>
            </button>
          </div>

          <div className="text-center py-2 space-y-2">
            {cards[writingIndex]?.image_url && (
              <div className="max-h-28 sm:max-h-36 max-w-[220px] mx-auto rounded-2xl overflow-hidden shadow-xs border border-slate-100 flex items-center justify-center bg-slate-50 mb-2">
                <img
                  src={cards[writingIndex].image_url}
                  alt="Visual"
                  className="max-h-28 sm:max-h-36 w-auto object-contain"
                />
              </div>
            )}
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              TÜRKÇE CÜMLE
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {cards[writingIndex]?.turkish_text}
            </h3>
          </div>

          {showAnswer && (
            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-900 text-center font-semibold text-sm">
              Doğru Cevap: {cards[writingIndex]?.english_text}
            </div>
          )}

          {(showAnswer || writingStatus !== 'idle') && cards[writingIndex]?.hint && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-normal text-center animate-in fade-in duration-200">
              <span className="font-semibold">İpucu / Açıklama:</span> {cards[writingIndex].hint}
            </div>
          )}

          <form onSubmit={handleCheckWriting} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                İngilizcesini Yazın:
              </label>
              <input
                type="text"
                autoFocus
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  setWritingStatus('idle');
                }}
                placeholder="İngilizce karşılığını buraya yazın..."
                className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:outline-none font-normal text-slate-900 text-base shadow-sm"
              />
            </div>

            {writingStatus === 'correct' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Harika! Doğru cevap.</span>
              </div>
            )}

            {writingStatus === 'wrong' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-sm flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Tekrar deneyin veya cevaba bakın.</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 font-semibold text-sm text-white shadow-md shadow-brand-500/20"
              >
                Kontrol Et
              </button>

              <button
                type="button"
                onClick={nextWritingCard}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-sm text-slate-700 flex items-center gap-1.5"
              >
                <span>Sonraki</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* OPTIONAL KONU ANLATIMI MODAL                              */}
      {/* ========================================================= */}
      {showNotesModal && studyNotes && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Konu Anlatımı & Notlar
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    {setInfo.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition"
                title="Kapat"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-800 leading-relaxed text-sm sm:text-base space-y-3">
              <div
                className="prose prose-slate max-w-none break-words study-notes-styled"
                dangerouslySetInnerHTML={{ __html: studyNotes }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs text-slate-400 hidden sm:inline">
                İstediğiniz an yukarıdaki "Konu Anlatımı" butonundan tekrar açabilirsiniz.
              </span>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="ml-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
              >
                Alıştırmaya Dön ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
