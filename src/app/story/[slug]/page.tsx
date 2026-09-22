'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { decodePageTexts } from '@/lib/story-utils';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '@/lib/haptics';
import { useCachedStory } from '@/lib/api-cache';
import { StorySkeleton } from '@/components/common/Skeletons';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Sparkles,
  Share2,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Headphones,
  Sliders,
  Sun,
  Moon,
  Coffee,
  Play,
  Pause,
  ExternalLink,
  Home,
} from 'lucide-react';

interface StoryPageData {
  id?: string;
  page_number: number;
  english_text: string;
  turkish_text: string;
  pronunciation?: string;
  image_url?: string | null;
  audio_url?: string | null;
}

export default function StoryReaderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { data: cached, isLoading } = useCachedStory(slug);

  const [story, setStory] = useState<any>(null);
  const [pages, setPages] = useState<StoryPageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Sibling stories for sequential folder navigation
  const [prevStory, setPrevStory] = useState<{ title: string; slug: string } | null>(null);
  const [nextStory, setNextStory] = useState<{ title: string; slug: string } | null>(null);

  // Student Preferences & Interactivity
  const [theme, setTheme] = useState<'paper' | 'white' | 'dark'>('paper');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('lg');
  const [showTurkish, setShowTurkish] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(0.9);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom MP3 Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const edgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const loading = isLoading && !cached?.storyData;

  useEffect(() => {
    if (cached?.storyData) {
      setStory(cached.storyData);
      const rawPages = cached.storyData.story_pages || [];
      const sorted = [...rawPages].sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0));

      const formattedPages: StoryPageData[] = sorted.map((p: any) => {
        const decoded = decodePageTexts(p.turkish_text);
        return {
          id: p.id,
          page_number: p.page_number,
          english_text: p.english_text || '',
          turkish_text: decoded.turkish,
          pronunciation: decoded.pronunciation || p.pronunciation || '',
          image_url: p.image_url,
          audio_url: p.audio_url,
        };
      });

      setPages(formattedPages);
      setPrevStory(cached.prevStory || null);
      setNextStory(cached.nextStory || null);
    }
  }, [cached]);

  // Cancel TTS and pause audio when page changes
  useEffect(() => {
    stopSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  }, [currentPageIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleSpeech();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, pages, isSpeaking]);

  const stopSpeech = () => {
    if (edgeAudioRef.current) {
      edgeAudioRef.current.pause();
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const fallbackStorySpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = ttsSpeed;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    const currentPage = pages[currentPageIndex];
    if (!currentPage || !currentPage.english_text) return;

    if (audioRef.current && isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }

    const cleanText = currentPage.english_text.trim();

    try {
      if (typeof window === 'undefined') return;
      if (!edgeAudioRef.current) {
        edgeAudioRef.current = new Audio();
      }
      const audio = edgeAudioRef.current;
      audio.pause();

      const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}`;
      audio.src = ttsUrl;
      audio.playbackRate = ttsSpeed;

      setIsSpeaking(true);

      audio.onended = () => {
        setIsSpeaking(false);
      };

      audio.onerror = () => {
        console.warn('Edge TTS failed in story, falling back to Web Speech');
        fallbackStorySpeak(cleanText);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Edge TTS play error, fallback:', err);
          fallbackStorySpeak(cleanText);
        });
      }
    } catch (e) {
      fallbackStorySpeak(cleanText);
    }
  };

  const toggleCustomAudio = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      stopSpeech();
      audioRef.current.play();
      setIsAudioPlaying(true);
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      triggerHaptic('light');
      setCurrentPageIndex((prev) => prev + 1);
    } else if (currentPageIndex === pages.length - 1 && !isFinished) {
      setIsFinished(true);
      triggerHaptic('success');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      triggerHaptic('light');
      setCurrentPageIndex((prev) => prev - 1);
      setIsFinished(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (typeof window !== 'undefined' && story) {
      const text = encodeURIComponent(
        `Ziya Baran Akademi'de "${story.title}" İngilizce hikâyesini okuyorum! Birlikte okuyalım:\n${window.location.href}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  if (loading) {
    return <StorySkeleton />;
  }

  if (!story || pages.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Hikâye Bulunamadı</h2>
        <p className="text-sm text-slate-500">Bu hikâyeye ait sayfa bulunmuyor veya silinmiş olabilir.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Derslere Geri Dön</span>
        </Link>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];
  const progressPercent = Math.round(((currentPageIndex + 1) / pages.length) * 100);

  // Theme styling definitions
  const themeClasses = {
    paper: 'bg-[#faf6ee] text-[#2c2416] border-[#ebdcc4] shadow-amber-900/5',
    white: 'bg-white text-slate-900 border-slate-200 shadow-slate-900/5',
    dark: 'bg-[#181a1d] text-[#e3e6eb] border-slate-800 shadow-black/30',
  };

  const themeInnerBox = {
    paper: 'bg-[#f4eedd]/70 border-[#e3d3ba]',
    white: 'bg-slate-50 border-slate-200',
    dark: 'bg-slate-900/80 border-slate-800',
  };

  const fontSizes = {
    sm: 'text-base sm:text-lg leading-relaxed',
    base: 'text-lg sm:text-xl leading-relaxed',
    lg: 'text-xl sm:text-2xl sm:leading-loose leading-relaxed',
    xl: 'text-2xl sm:text-3xl sm:leading-loose leading-relaxed',
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3 sm:space-y-5 pb-8 select-none">
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

        {/* Center: Story Name */}
        <div className="text-center min-w-0 flex-1 px-2">
          <h1 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">
            {story.title}
          </h1>
        </div>

        {/* Reader Customization Controls */}
        <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
          {/* Theme toggles */}
          <button
            onClick={() => setTheme('paper')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              theme === 'paper' ? 'bg-[#f4eedd] text-amber-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Kitap Sayfası Modu (Sepia)"
          >
            <Coffee className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('white')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              theme === 'white' ? 'bg-slate-100 text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Aydınlık Beyaz Mod"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              theme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Gece / Koyu Mod"
          >
            <Moon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* Font size toggles */}
          <button
            onClick={() => {
              const sizes: ('sm' | 'base' | 'lg' | 'xl')[] = ['sm', 'base', 'lg', 'xl'];
              const nextIdx = (sizes.indexOf(fontSize) + 1) % sizes.length;
              setFontSize(sizes[nextIdx]);
            }}
            className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
            title="Yazı Boyutunu Değiştir"
          >
            <span>A</span>
            <span className="text-[10px] text-brand-600 font-semibold uppercase">{fontSize}</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

          {/* Page Counter Badge */}
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg shrink-0">
            {currentPageIndex + 1} / {pages.length}
          </span>
        </div>
      </div>

      {/* Slimline 2px Progress Line (Takes virtually no vertical space) */}
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div
          className="bg-purple-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Sequential Navigation Bar (Top) */}
      {(prevStory || nextStory) && (
        <div className="flex items-center justify-between gap-2 p-1.5 px-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-700">
          {prevStory ? (
            <Link
              href={`/story/${prevStory.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200/80 transition"
              title="Önceki Hikâyeye Geç"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-purple-600" />
              <span className="truncate max-w-[110px] sm:max-w-xs">{prevStory.title}</span>
            </Link>
          ) : (
            <div />
          )}

          <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
            {story?.folders?.name || 'Hikâye Akışı'}
          </span>

          {nextStory ? (
            <Link
              href={`/story/${nextStory.slug}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition"
              title="Sonraki Hikâyeye Geç"
            >
              <span className="truncate max-w-[110px] sm:max-w-xs">{nextStory.title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Celebration Finished Screen */}
      {isFinished ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider">
              {story.title}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tebrikler! Hikâyeyi Tamamladın! 🎉
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto">
              "{story.title}" hikâyesinin tüm sayfalarını başarıyla okudun. Düzenli okuma yaparak İngilizce kelime dağarcığını ve telaffuzunu daha da geliştirebilirsin.
            </p>
          </div>

          {/* Sequential Next Story Button if available */}
          {nextStory && (
            <div className="pt-2">
              <Link
                href={`/story/${nextStory.slug}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all active:scale-95"
              >
                <span>Sıradaki Hikâye: {nextStory.title}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setCurrentPageIndex(0);
                setIsFinished(false);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Baştan Tekrar Oku</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
            >
              <span>Diğer Alıştırmalara Dön</span>
            </Link>
          </div>
        </div>
      ) : (
        /* The Illustrated E-Book Page Container */
        <div
          className={`rounded-3xl border transition-colors duration-300 p-6 sm:p-10 shadow-sm space-y-6 ${themeClasses[theme]}`}
        >
          {/* Page Illustration (if provided) */}
          {(currentPage.image_url || story.cover_image_url) && (
            <div className="w-full overflow-hidden rounded-2xl border border-black/5 bg-black/5 flex items-center justify-center max-h-72 sm:max-h-80 shadow-sm">
              <img
                src={currentPage.image_url || story.cover_image_url}
                alt={`Sayfa ${currentPage.page_number} Görseli`}
                className="w-full h-full object-contain max-h-72 sm:max-h-80 rounded-2xl"
                loading="eager"
              />
            </div>
          )}

          {/* Main English Text */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-wider uppercase opacity-60">
                PAGE {currentPage.page_number}
              </span>

              {/* Audio Controls */}
              <div className="flex items-center gap-2">
                {/* Custom Teacher MP3 audio if available */}
                {currentPage.audio_url && (
                  <div className="flex items-center gap-1.5">
                    <audio ref={audioRef} src={currentPage.audio_url} onEnded={() => setIsAudioPlaying(false)} />
                    <button
                      onClick={toggleCustomAudio}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isAudioPlaying
                          ? 'bg-emerald-600 text-white shadow-sm animate-pulse'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isAudioPlaying ? 'Durdur' : 'Öğretmen Sesi'}</span>
                    </button>
                  </div>
                )}

                {/* Built-in Text-to-Speech (TTS) */}
                <button
                  onClick={toggleSpeech}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isSpeaking
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30 animate-pulse'
                      : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200/80'
                  }`}
                  title="İngilizce Telaffuzu Dinle (TTS)"
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isSpeaking ? 'Durdur' : 'Sesli Dinle'}</span>
                </button>

                {/* TTS Speed button */}
                <button
                  onClick={() => setTtsSpeed((prev) => (prev === 0.9 ? 0.75 : prev === 0.75 ? 1.0 : 0.9))}
                  className="px-2 py-1.5 rounded-xl text-[11px] font-semibold bg-black/5 hover:bg-black/10 opacity-80"
                  title="Okuma Hızı"
                >
                  {ttsSpeed}x
                </button>
              </div>
            </div>

            {/* The English Paragraph */}
            <p
              className={`font-semibold tracking-tight transition-all duration-150 ${fontSizes[fontSize]} ${
                isSpeaking ? 'text-brand-600 dark:text-brand-400' : ''
              }`}
            >
              {currentPage.english_text}
            </p>
          </div>

          {/* Interactive Learning Helpers: Turkish Translation & Pronunciation Guide */}
          <div className="pt-4 border-t border-black/10 space-y-3">
            {/* Action Buttons: Show Turkish & Show Pronunciation */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowTurkish(!showTurkish)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  showTurkish
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-black/5 hover:bg-black/10 opacity-90'
                }`}
              >
                {showTurkish ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showTurkish ? 'Türkçe Çeviriyi Gizle' : 'Türkçe Çeviriyi Göster'}</span>
              </button>

              {currentPage.pronunciation && (
                <button
                  onClick={() => setShowPronunciation(!showPronunciation)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    showPronunciation
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-black/5 hover:bg-black/10 opacity-90'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{showPronunciation ? 'Okunuşu Gizle' : 'Türkçe Okunuş Rehberi'}</span>
                </button>
              )}
            </div>

            {/* Revealed Turkish Translation Box */}
            {showTurkish && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border text-sm sm:text-base leading-relaxed animate-in fade-in duration-200 shadow-xs ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-indigo-500/40'
                    : 'bg-indigo-50/90 border-indigo-200'
                }`}
              >
                <div
                  className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-indigo-300' : 'text-indigo-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Türkçe Çevirisi (Anlamı)</span>
                </div>
                <p
                  style={{ color: theme === 'dark' ? '#f1f5f9' : '#0f172a' }}
                  className="font-bold text-base sm:text-lg leading-relaxed"
                >
                  {currentPage.turkish_text || 'Bu sayfa için henüz Türkçe çeviri eklenmemiş.'}
                </p>
              </div>
            )}

            {/* Revealed Turkish Pronunciation Box (Guaranteed high-contrast text) */}
            {showPronunciation && currentPage.pronunciation && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border text-sm sm:text-base leading-relaxed animate-in fade-in duration-200 shadow-xs ${
                  theme === 'dark'
                    ? 'bg-amber-950/60 border-amber-500/50'
                    : 'bg-amber-100/90 border-amber-300'
                }`}
              >
                <div
                  className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
                    theme === 'dark' ? 'text-amber-300' : 'text-amber-900'
                  }`}
                >
                  <Headphones className="w-4 h-4" />
                  <span>Nasıl Okunur? (Türkçe Harflerle Telaffuz)</span>
                </div>
                <p
                  style={{ color: theme === 'dark' ? '#ffffff' : '#0f172a' }}
                  className="font-bold text-base sm:text-lg tracking-wide not-italic leading-relaxed"
                >
                  {currentPage.pronunciation}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-6 border-t border-black/10 flex items-center justify-between gap-3">
            <button
              onClick={goToPrevPage}
              disabled={currentPageIndex === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                currentPageIndex === 0
                  ? 'opacity-30 cursor-not-allowed bg-black/5'
                  : 'bg-black/5 hover:bg-black/10 active:scale-95'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Önceki Sayfa</span>
            </button>

            {/* Page Dots indicator */}
            <div className="hidden sm:flex items-center gap-1.5">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentPageIndex
                      ? 'bg-brand-600 w-6'
                      : 'bg-black/20 hover:bg-black/40'
                  }`}
                  title={`Sayfa ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={goToNextPage}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-500/25 active:scale-95 transition"
            >
              <span>{currentPageIndex === pages.length - 1 ? 'Hikâyeyi Tamamla' : 'Sonraki Sayfa'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sequential Navigation Cards */}
      {(prevStory || nextStory) && (
        <div className="pt-6 border-t border-slate-200/80 flex items-stretch justify-between gap-3">
          {prevStory ? (
            <Link
              href={`/story/${prevStory.slug}`}
              className="flex-1 max-w-xs p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs space-y-1 transition text-left group"
            >
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 group-hover:text-purple-600 transition">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Önceki Hikâye</span>
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{prevStory.title}</p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {nextStory ? (
            <Link
              href={`/story/${nextStory.slug}`}
              className="flex-1 max-w-xs p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs space-y-1 transition text-right group ml-auto"
            >
              <span className="text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1 group-hover:text-purple-600 transition">
                <span>Sonraki Hikâye</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{nextStory.title}</p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
