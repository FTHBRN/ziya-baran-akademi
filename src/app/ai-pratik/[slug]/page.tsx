'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

  // Current progress
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentInput, setStudentInput] = useState('');
  const [attempts, setAttempts] = useState(1);
  const [voiceAttemptsLeft, setVoiceAttemptsLeft] = useState(4);

  // State
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
      setVoiceAttemptsLeft(4);
      setLastEvaluation(null);
    } else {
      setIsCompleted(true);
    }
  };

  // Start voice recording
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
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // 15 seconds countdown limit
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingSeconds(seconds);
        if (seconds >= 15) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-lg">Niko Atölyesi Yükleniyor...</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Test Bulunamadı</h1>
        <p className="text-slate-400 max-w-md mb-6">{error || 'Bu bağlantıya ait bir çalışma bulunamadı.'}</p>
        <Link href="/" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  // Completion Screen
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white px-4 py-12">
        <div className="bg-slate-800/80 border border-slate-700/80 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-emerald-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-emerald-500/20 animate-bounce">
            🎉
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Tebrikler!</h1>
          <p className="text-emerald-400 font-medium text-lg mb-6">Tüm cümleleri başarıyla tamamladın!</p>

          <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-700/50 mb-8 text-left space-y-3">
            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Tamamlanan Test:</span>
              <span className="font-semibold text-white">{test.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Toplam Cümle:</span>
              <span className="font-semibold text-white">{totalItems} Cümle</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Yol Göstericin:</span>
              <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <span className="text-base">🤖</span> Niko AI
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsCompleted(false);
              setStudentInput('');
              setAttempts(1);
              setVoiceAttemptsLeft(4);
              setLastEvaluation(null);
            }}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            Tekrar Çalış 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-xl shadow-md shadow-indigo-500/20">
              🤖
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs">
                {test.title}
              </h1>
              <p className="text-xs text-indigo-400 font-medium">Niko ile Akıllı Çeviri</p>
            </div>
          </div>

          {/* Progress Pill */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300">
            <span>Cümle {currentIndex + 1} / {totalItems}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
        {/* Optional Image Card */}
        {currentItem?.image_url && (
          <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl bg-slate-900/60 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentItem.image_url}
              alt="Cümle Görseli"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Turkish Sentence Card */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-blue-600" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>🇹🇷 Türkçe Cümle</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
            {currentItem?.turkish_sentence}
          </p>
        </div>

        {/* Student Answer Box */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>🇬🇧 İngilizce Çevirinizi Yazın veya Söyleyin:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              voiceAttemptsLeft > 0 ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' : 'bg-slate-800 text-slate-500'
            }`}>
              🎙️ Ses Hakkı: {voiceAttemptsLeft}/4
            </span>
          </div>

          <div className="relative">
            <textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder="İngilizce cümlenizi buraya yazın veya mikrofon butonuna basın..."
              rows={3}
              disabled={evaluating || isRecording || transcribing}
              className="w-full bg-slate-900/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-xl p-4 text-base sm:text-lg resize-none outline-none transition disabled:opacity-50"
            />

            {/* Transcribing Indicator */}
            {transcribing && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 text-indigo-400 font-medium">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Sesiniz metne dökülüyor (Groq Whisper)...</span>
              </div>
            )}
          </div>

          {/* Controls: Microphone + Submit */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Microphone Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={voiceAttemptsLeft <= 0 || evaluating || transcribing}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-indigo-600/40 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-lg">🎙️</span>
                <span>Mikrofonla Söyle</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition animate-pulse shadow-lg shadow-red-600/30"
              >
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <span>Dinliyorum ({recordingSeconds}s / 15s) — Durdur</span>
              </button>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!studentInput.trim() || evaluating || isRecording || transcribing}
              className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-base shadow-lg shadow-indigo-600/25 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {evaluating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Niko İnceliyor...</span>
                </>
              ) : (
                <>
                  <span>Niko&apos;ya Gönder</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Niko Feedback Bubble */}
        {lastEvaluation && (
          <div
            className={`rounded-2xl p-5 sm:p-6 border transition-all duration-300 ${
              lastEvaluation.is_correct
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                : 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-500/5'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-md shrink-0">
                🤖
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>Niko</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                      Deneme {attempts}
                    </span>
                  </h3>
                  {lastEvaluation.is_correct && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-1 rounded-full">
                      ✓ Doğru
                    </span>
                  )}
                </div>

                <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {lastEvaluation.feedback_tr}
                </p>

                {/* Alternative Expression */}
                {lastEvaluation.alternative_en && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs sm:text-sm text-indigo-300">
                    <span className="font-semibold text-white">💡 Alternatif İfade: </span>
                    {lastEvaluation.alternative_en}
                  </div>
                )}

                {/* Answer Revealed on 5 attempts */}
                {lastEvaluation.reveal_answer && lastEvaluation.correct_sentence && (
                  <div className="mt-3 p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-xs sm:text-sm text-white">
                    <span className="font-bold text-amber-300">📌 Örnek Doğru Cümle: </span>
                    <span className="font-medium underline decoration-indigo-400 underline-offset-4">{lastEvaluation.correct_sentence}</span>
                  </div>
                )}

                {/* Continue to Next Button */}
                {(lastEvaluation.is_correct || lastEvaluation.reveal_answer) && (
                  <div className="pt-3">
                    <button
                      onClick={goToNextSentence}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                    >
                      <span>Sonraki Cümleye Geç</span>
                      <span>➔</span>
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
