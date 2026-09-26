'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sun, Moon, Mic, Send, ArrowRight, RotateCcw, Volume2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface PracticeItem {
  id: string;
  order_index: number;
  turkish_sentence: string;
  target_hint?: string;
  image_url?: string;
}

interface PracticeTest {
  id: string;
  title: string;
  slug: string;
  description?: string;
  items: PracticeItem[];
}

interface EvaluationResult {
  is_correct: boolean;
  feedback_tr: string;
  alternative_en?: string | null;
  grammar_tip?: string | null;
  reveal_answer?: boolean;
  correct_sentence?: string | null;
}

export default function AiPracticePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [test, setTest] = useState<PracticeTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme state: Default is LIGHT MODE as requested
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Current progress
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentInput, setStudentInput] = useState('');
  const [attempts, setAttempts] = useState(1);
  const [voiceAttemptsLeft, setVoiceAttemptsLeft] = useState(5);

  // Evaluation State
  const [evaluating, setEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch test
  useEffect(() => {
    async function loadTest() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/ai-tests?slug=${slug}`);
        if (!res.ok) {
          throw new Error('Test yüklenemedi veya bulunamadı.');
        }
        const data = await res.json();
        if (data.test) {
          setTest(data.test);
        } else {
          throw new Error('Test içeriği bulunamadı.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadTest();
  }, [slug]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentItem = test?.items?.[currentIndex];
  const totalItems = test?.items?.length || 0;
  const progressPercent = totalItems > 0 ? Math.round(((currentIndex) / totalItems) * 100) : 0;

  // Reset sentence state when moving to next
  const goToNextSentence = () => {
    if (currentIndex + 1 < totalItems) {
      setCurrentIndex((prev) => prev + 1);
      setStudentInput('');
      setAttempts(1);
      setVoiceAttemptsLeft(5);
      setLastEvaluation(null);
    } else {
      setIsCompleted(true);
    }
  };

  // Start voice recording (25s limit)
  const startRecording = async () => {
    if (voiceAttemptsLeft <= 0) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // 25 seconds countdown limit
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingSeconds(seconds);
        if (seconds >= 25) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      alert('Mikrofon erişimi sağlanamadı. Lütfen tarayıcınızdan mikrofon izni verin.');
      console.error(err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setVoiceAttemptsLeft((prev) => Math.max(0, prev - 1));
    }
  };

  // Upload audio to /api/ai-speech (Groq Whisper)
  const handleAudioUpload = async (blob: Blob) => {
    try {
      setTranscribing(true);
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const res = await fetch('/api/ai-speech', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.text) {
        setStudentInput(data.text);
      } else if (data.error) {
        alert(`Ses algılanamadı: ${data.error}`);
      }
    } catch (err: any) {
      alert('Ses işlenirken bir sorun oluştu.');
      console.error(err);
    } finally {
      setTranscribing(false);
    }
  };

  // Send answer to Niko for evaluation
  const handleSubmitAnswer = async () => {
    if (!studentInput.trim() || !currentItem) return;

    try {
      setEvaluating(true);
      const res = await fetch('/api/ai-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turkish_sentence: currentItem.turkish_sentence,
          student_answer: studentInput.trim(),
          attempt_number: attempts,
          target_hint: currentItem.target_hint,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setLastEvaluation(data.evaluation);
        if (!data.evaluation.is_correct) {
          setAttempts((prev) => prev + 1);
        }
      } else {
        alert(data.error || 'Değerlendirme alınamadı.');
      }
    } catch (err: any) {
      alert('Niko şu an cevap veremiyor. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  // Toggle Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-lg">Niko Atölyesi Yükleniyor...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-4 text-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Test Bulunamadı</h1>
        <p className={`max-w-md mb-6 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {error || 'Bu bağlantıya ait bir çalışma bulunamadı.'}
        </p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  // Completion Screen
  if (isCompleted) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 ${
        isDark
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white'
          : 'bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/50 text-slate-900'
      }`}>
        <div className={`rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border ${
          isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-200 shadow-indigo-100/50'
        }`}>
          <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-emerald-400 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-emerald-500/20 animate-bounce">
            🎉
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight">Tebrikler!</h1>
          <p className="text-emerald-600 font-extrabold text-lg mb-6">Tüm cümleleri başarıyla tamamladın!</p>

          <div className={`rounded-2xl p-6 border mb-8 text-left space-y-3 ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Tamamlanan Test:</span>
              <span className="font-bold text-indigo-600">{test.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Toplam Cümle:</span>
              <span className="font-bold">{totalItems} Cümle</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Yol Göstericin:</span>
              <span className="font-bold text-indigo-600 flex items-center gap-1.5">
                <span className="text-base">🤖</span> Niko AI
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setIsCompleted(false);
              setStudentInput('');
              setAttempts(1);
              setVoiceAttemptsLeft(5);
              setLastEvaluation(null);
            }}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-600/25 transition active:scale-98 cursor-pointer"
          >
            Tekrar Çalış 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      isDark
        ? 'bg-slate-950 text-slate-100'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900'
    }`}>
      {/* Top Header */}
      <header className={`border-b sticky top-0 z-20 px-4 py-3 backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? 'bg-slate-900/80 border-slate-800'
          : 'bg-white/80 border-slate-200/90 shadow-2xs'
      }`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-2xl shadow-md shadow-indigo-600/20 text-white shrink-0">
              🤖
            </div>
            <div className="overflow-hidden">
              <h1 className={`font-black text-sm sm:text-base truncate max-w-[180px] sm:max-w-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {test.title}
              </h1>
              <p className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                <span>Niko AI Çeviri & Konuşma Atölyesi</span>
              </p>
            </div>
          </div>

          {/* Right Header: Progress + Theme Toggle Button */}
          <div className="flex items-center gap-2.5">
            {/* Progress Pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              <span>{currentIndex + 1} / {totalItems}</span>
            </div>

            {/* Dark / Light Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={isDark ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`w-full h-2 mt-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div
            className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
        {/* Optional Image Card */}
        {currentItem?.image_url && (
          <div className={`w-full h-48 sm:h-64 rounded-3xl overflow-hidden border shadow-sm flex items-center justify-center ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentItem.image_url}
              alt="Cümle Görseli"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Turkish Sentence Card */}
        <div className={`rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden border transition-all ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 shadow-slate-950/50'
            : 'bg-white border-slate-200 shadow-md shadow-slate-100'
        }`}>
          <div className="absolute top-0 left-0 w-3 h-full bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
              🇹🇷 Türkçe Cümle
            </span>

            {currentItem?.target_hint && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                💡 İpucu: {currentItem.target_hint}
              </span>
            )}
          </div>

          <p className={`text-2xl sm:text-3xl font-black leading-relaxed tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {currentItem?.turkish_sentence}
          </p>
        </div>

        {/* Student Answer Box */}
        <div className={`rounded-3xl p-5 sm:p-7 shadow-sm border transition-all flex flex-col gap-4 ${
          isDark
            ? 'bg-slate-900/70 border-slate-800'
            : 'bg-white border-slate-200 shadow-md shadow-slate-100'
        }`}>
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              🇬🇧 İngilizce Çevirinizi Yazın veya Sesli Söyleyin:
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              voiceAttemptsLeft > 0
                ? isDark
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-200 text-slate-500 border-slate-300'
            }`}>
              🎙️ Ses Hakkı: {voiceAttemptsLeft}/5
            </span>
          </div>

          <div className="relative">
            <textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="İngilizce cümlenizi buraya yazın veya alttaki büyük mikrofona basarak konuşun..."
              rows={3}
              disabled={evaluating || isRecording || transcribing}
              className={`w-full rounded-2xl p-4 sm:p-5 text-base sm:text-lg font-medium resize-none outline-none transition border disabled:opacity-50 min-h-[110px] ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
              }`}
            />

            {/* Transcribing Indicator */}
            {transcribing && (
              <div className={`absolute inset-0 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm backdrop-blur-xs ${
                isDark ? 'bg-slate-950/90 text-indigo-400' : 'bg-white/90 text-indigo-700'
              }`}>
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Sesiniz metne dökülüyor (Groq Whisper)...</span>
              </div>
            )}
          </div>

          {/* Controls: Big Microphone + Big Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            {/* Big Microphone Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={voiceAttemptsLeft <= 0 || evaluating || transcribing}
                className={`py-4 px-6 rounded-2xl border font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'border-indigo-700/60 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300'
                    : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 shadow-xs'
                }`}
              >
                <Mic className="w-5 h-5 text-indigo-600 stroke-[2.5]" />
                <span>Mikrofonla Söyle (25s)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 transition animate-pulse shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
                <span>Dinliyorum ({recordingSeconds}s / 25s) — Durdur</span>
              </button>
            )}

            {/* Big Submit Button */}
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!studentInput.trim() || evaluating || isRecording || transcribing}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-base sm:text-lg shadow-lg shadow-indigo-600/25 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {evaluating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Niko İnceliyor...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Niko&apos;ya Gönder</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Niko Feedback Bubble */}
        {lastEvaluation && (
          <div
            className={`rounded-3xl p-6 sm:p-7 border transition-all duration-300 shadow-md ${
              lastEvaluation.is_correct
                ? isDark
                  ? 'bg-emerald-950/40 border-emerald-600/50'
                  : 'bg-emerald-50/80 border-emerald-200'
                : isDark
                ? 'bg-amber-950/40 border-amber-600/50'
                : 'bg-amber-50/80 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl shadow-md shrink-0 text-white">
                🤖
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={`font-black text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Niko</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      Deneme {attempts}
                    </span>
                  </h3>

                  {lastEvaluation.is_correct && (
                    <span className="text-xs bg-emerald-600 text-white font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tam Olarak Doğru!</span>
                    </span>
                  )}
                </div>

                <p className={`text-base sm:text-lg leading-relaxed whitespace-pre-line font-medium ${
                  isDark ? 'text-slate-100' : 'text-slate-800'
                }`}>
                  {lastEvaluation.feedback_tr}
                </p>

                {/* Alternative Expression */}
                {lastEvaluation.alternative_en && (
                  <div className={`p-4 rounded-2xl border text-sm sm:text-base ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-700 text-indigo-300'
                      : 'bg-white border-indigo-200 text-indigo-900 shadow-2xs'
                  }`}>
                    <span className="font-extrabold text-indigo-600">💡 Alternatif İfade: </span>
                    <span className="font-semibold">{lastEvaluation.alternative_en}</span>
                  </div>
                )}

                {/* Answer Revealed on 5 attempts */}
                {lastEvaluation.reveal_answer && lastEvaluation.correct_sentence && (
                  <div className={`p-4 rounded-2xl border text-sm sm:text-base ${
                    isDark
                      ? 'bg-indigo-950/80 border-indigo-700 text-white'
                      : 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs'
                  }`}>
                    <span className="font-black text-amber-600">📌 Örnek Doğru Cümle: </span>
                    <span className="font-bold underline decoration-indigo-400 underline-offset-4">
                      {lastEvaluation.correct_sentence}
                    </span>
                  </div>
                )}

                {/* Big Next Sentence Button */}
                {(lastEvaluation.is_correct || lastEvaluation.reveal_answer) && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={goToNextSentence}
                      className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Sonraki Cümleye Geç</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
