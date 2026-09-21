'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface Question {
  id: string;
  test_id: string;
  question_text: string;
  image_url?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string | null;
  order_index: number;
}

export default function StudentTestPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [testInfo, setTestInfo] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Test Runner State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<
    { questionIndex: number; selected: string; isCorrect: boolean }[]
  >([]);

  useEffect(() => {
    async function loadTest() {
      if (!slug) return;
      try {
        setLoading(true);
        const { data: testItem, error: testErr } = await supabase
          .from('manual_tests')
          .select('*, folders(name, classes(name)), test_questions(*)')
          .eq('slug', slug)
          .single();

        if (testErr) throw testErr;

        if (testItem) {
          setTestInfo(testItem);
          const sorted = (testItem.test_questions || []).sort(
            (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
          );
          setQuestions(sorted);
        }
      } catch (e) {
        console.error('Test yükleme hatası:', e);
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [slug]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (letter: string) => {
    if (isAnswerChecked || !currentQ) return;

    setSelectedOption(letter);
    setIsAnswerChecked(true);

    const isCorrect = letter.toUpperCase() === currentQ.correct_option.toUpperCase();
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setUserAnswers((prev) => [
      ...prev,
      { questionIndex: currentIndex, selected: letter, isCorrect },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const handleResetTest = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setScore(0);
    setIsFinished(false);
    setUserAnswers([]);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="inline-block w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Test yükleniyor...</p>
      </div>
    );
  }

  if (!testInfo || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-4 shadow-sm">
        <p className="text-slate-600 font-normal">Bu teste ait soru bulunamadı.</p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
        >
          Derslere Dön
        </Link>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentIndex + 1) / questions.length) * 100);
  const correctOptionLetter = currentQ?.correct_option?.toUpperCase();

  const optionsList = currentQ
    ? [
        { letter: 'A', text: currentQ.option_a },
        { letter: 'B', text: currentQ.option_b },
        { letter: 'C', text: currentQ.option_c },
        { letter: 'D', text: currentQ.option_d },
      ]
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none">
      {/* Header Info & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider">
            <Link
              href="/"
              className="hover:underline flex items-center gap-1 text-slate-500 hover:text-brand-600"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dersler</span>
            </Link>
            <span>/</span>
            <span>{testInfo.folders?.classes?.name || 'Genel'}</span>
            <span>/</span>
            <span>{testInfo.folders?.name || 'Test'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {testInfo.title}
          </h1>
          {testInfo.description && (
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              {testInfo.description}
            </p>
          )}
        </div>
      </div>

      {!isFinished ? (
        /* ========================================================= */
        /* QUESTION RUNNER                                           */
        /* ========================================================= */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-sm space-y-6">
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                <span>Soru {currentIndex + 1} / {questions.length}</span>
              </span>
              <span className="text-brand-600 font-bold">
                Doğru: {score}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Question Image (Optional) */}
          {currentQ.image_url && (
            <div className="w-full max-h-64 sm:max-h-80 rounded-2xl overflow-hidden shadow-xs border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={currentQ.image_url}
                alt={`Soru ${currentIndex + 1} görseli`}
                className="max-h-60 sm:max-h-76 w-auto object-contain rounded-xl"
              />
            </div>
          )}

          {/* Question Text */}
          <div className="py-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-relaxed">
              {currentQ.question_text}
            </h2>
          </div>

          {/* 4 Choices */}
          <div className="grid grid-cols-1 gap-3">
            {optionsList.map(({ letter, text }) => {
              const isSelected = selectedOption === letter;
              const isCorrect = letter === correctOptionLetter;

              let btnStyle =
                'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/90 text-slate-800';
              let badgeStyle =
                'bg-white text-slate-700 border-slate-200';

              if (isAnswerChecked) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-400';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-500 text-white border-rose-600';
                  badgeStyle = 'bg-rose-600 text-white border-rose-400';
                } else {
                  btnStyle = 'bg-slate-50 text-slate-400 border-slate-100 opacity-60';
                  badgeStyle = 'bg-slate-100 text-slate-400 border-slate-200';
                }
              }

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={isAnswerChecked}
                  onClick={() => handleSelectOption(letter)}
                  className={`p-4 rounded-2xl border-2 text-left font-medium text-sm sm:text-base transition-all duration-150 flex items-center justify-between gap-3 active:scale-[0.99] cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-xs ${badgeStyle}`}
                    >
                      {letter}
                    </span>
                    <span className="font-semibold break-words">{text}</span>
                  </div>

                  {isAnswerChecked && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-in zoom-in-50 duration-200" />
                  )}
                  {isAnswerChecked && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-white shrink-0 animate-in zoom-in-50 duration-200" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation if exists and answered */}
          {isAnswerChecked && currentQ.explanation && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-normal">
              <span className="font-semibold">Açıklama:</span> {currentQ.explanation}
            </div>
          )}

          {/* Next Question Navigation */}
          {isAnswerChecked && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all active:scale-95 animate-in slide-in-from-right-3 duration-200"
              >
                <span>
                  {currentIndex + 1 === questions.length
                    ? 'Sonuçları Gör'
                    : 'Sonraki Soru'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* RESULTS SCREEN                                            */
        /* ========================================================= */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tebrikler! Testi Tamamladınız!
            </h2>
            <p className="text-slate-600 text-base font-normal">
              {questions.length} sorudan{' '}
              <span className="font-bold text-emerald-600 text-lg">
                {score}
              </span>{' '}
              tanesini doğru bildiniz.
            </p>
          </div>

          {/* Score Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Başarı Oranı
            </span>
            <span className="text-xl font-bold text-brand-700">
              %{Math.round((score / questions.length) * 100)}
            </span>
          </div>

          {/* Motivational Feedback */}
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {score / questions.length >= 0.8
              ? '🎉 Harika bir performans! Konuyu çok iyi kavramışsınız.'
              : score / questions.length >= 0.5
              ? '👍 İyi çalışma! Birkaç pratik ile tüm soruları doğru yapabilirsiniz.'
              : '💪 Biraz daha pratik yaparak çok daha iyi sonuçlar elde edebilirsiniz. Tekrar çözmek ister misiniz?'}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleResetTest}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Testi Tekrar Çöz</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
            >
              Derslere Dön
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
