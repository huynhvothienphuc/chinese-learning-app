import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Link2, ListChecks, Loader2, Shuffle, TextCursorInput } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { normalizeVocabularyItems, shuffleArray } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useSections } from '@/hooks/useVocabData';
import LoginPrompt from '@/components/LoginPrompt';
import SectionSelector from '@/components/SectionSelector';
import SentenceOrderQuiz from '@/components/SentenceOrderQuiz';
import FillBlankQuiz from '@/components/FillBlankQuiz';
import MatchingQuiz from '@/components/MatchingQuiz';

const MODE_CONFIG = {
  'sentence-order': { icon: Shuffle, rpc: 'get_lesson_sentence_exercises', needsPool: false },
  'fill-blank': { icon: TextCursorInput, rpc: 'get_lesson_fill_blank_exercises', needsPool: true },
  'matching': { icon: Link2, rpc: 'get_lesson_grammar_qa', needsPool: false },
};

export default function ExercisePage() {
  const { mode } = useParams();
  const { books, selectedLanguage: language = 'vi', t } = useOutletContext();
  const { user, role, authReady } = useAuthStore();
  const navigate = useNavigate();
  const isGuest = !user;
  const isSuperadmin = role === 'superadmin';
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const [activeBookId, setActiveBookId] = useState(books[0]?.id ?? '');
  const activeBook = books.find((b) => b.id === activeBookId);
  const sectionsQuery = useSections(activeBookId || null, activeBook?.source);
  const sections = sectionsQuery.data ?? [];
  const loadingSections = sectionsQuery.isLoading;

  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [rows, setRows] = useState(null);
  const [pool, setPool] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Results are keyed by question index so a retry can overwrite a prior
  // wrong result instead of appending a second scored attempt. `retryingIndex`
  // temporarily hides the current result (re-enabling the quiz component's
  // input) without touching the stored result until the retry is submitted.
  const [results, setResults] = useState({});
  const [retryingIndex, setRetryingIndex] = useState(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const isQuizActive = quizQuestions !== null;

  const score = {
    correct: Object.values(results).filter((r) => r.isCorrect).length,
    total: Object.keys(results).length,
  };
  const wrongAnswers = Object.values(results).filter((r) => !r.isCorrect);
  const answeredQuestion = retryingIndex === currentIndex ? null : (results[currentIndex]
    ? { isCorrect: results[currentIndex].isCorrect, selectedAnswer: results[currentIndex].selectedAnswer }
    : null);

  useEffect(() => {
    if (!activeBookId && books.length > 0) setActiveBookId(books[0].id);
  }, [books, activeBookId]);

  useEffect(() => {
    setSelectedLessonId(null);
  }, [activeBookId]);

  useEffect(() => {
    setSelectedLessonId(null);
    setQuizQuestions(null);
  }, [mode]);

  useEffect(() => {
    if (!selectedLessonId || !MODE_CONFIG[mode]) return;
    const { rpc, needsPool } = MODE_CONFIG[mode];
    setLoadingExercises(true);
    setRows(null);
    Promise.all([
      supabase.rpc(rpc, { p_lesson_id: selectedLessonId }),
      needsPool
        ? queryClient.ensureQueryData({
            queryKey: ['vocab', activeBookId, selectedLessonId, userId],
            queryFn: async () => {
              const { data } = await supabase.rpc('get_lesson_words', { p_lesson_id: selectedLessonId });
              return normalizeVocabularyItems(data ?? []);
            },
            staleTime: 1000 * 60 * 5,
          })
        : Promise.resolve([]),
    ]).then(([res, vocab]) => {
      setRows(res.data ?? []);
      if (needsPool) setPool(vocab ?? []);
    }).finally(() => setLoadingExercises(false));
  }, [selectedLessonId, mode, activeBookId, userId, queryClient]);

  if (!MODE_CONFIG[mode]) return <Navigate to="/exercise" replace />;

  // ── adapt DB rows into the shapes the quiz components already expect ──────
  const sentenceEntries = mode === 'sentence-order' ? (rows ?? []).map((r) => ({
    sample: { sentence: r.sentence, pinyin: r.pinyin, segments: r.segments },
  })) : [];
  const fillBlankEntries = mode === 'fill-blank' ? (rows ?? []).map((r) => ({
    word: { id: r.id, chinese: r.target_chinese, pinyin: r.target_pinyin, vi: r.target_meaning, en: r.target_meaning, occurrence: r.target_occurrence ?? 1 },
    sample: { sentence: r.sentence, pinyin: r.pinyin },
  })) : [];
  const matchingPairs = mode === 'matching' ? (rows ?? []).map((r) => ({
    question: { chinese: r.question_chinese, pinyin: r.question_pinyin },
    answer: { chinese: r.answer_chinese, pinyin: r.answer_pinyin },
  })) : [];

  const modeCount = rows?.length ?? 0;
  const tooFew = mode === 'matching' ? modeCount < 2 : modeCount < 1;
  const modeTitle = mode === 'sentence-order' ? t.exercisesSentenceOrderTitle : mode === 'fill-blank' ? t.exercisesFillBlankTitle : t.exercisesMatchingTitle;
  const ModeIcon = MODE_CONFIG[mode].icon;

  // ── quiz runtime ──────────────────────────────────────────────────────────

  function resetQuizState() {
    setCurrentIndex(0);
    setResults({});
    setRetryingIndex(null);
    setQuizComplete(false);
  }

  function handleStart() {
    resetQuizState();
    if (mode === 'matching') {
      setQuizQuestions(shuffleArray(matchingPairs));
      return;
    }
    const source = mode === 'sentence-order' ? sentenceEntries : fillBlankEntries;
    setQuizQuestions(shuffleArray(source).map((entry) => ({ entry })));
  }

  function handleSentenceOrderAnswer(isCorrect, entry) {
    if (!quizQuestions) return;
    setResults((prev) => ({ ...prev, [currentIndex]: { isCorrect, entry } }));
    setRetryingIndex(null);
  }

  function handleFillBlankAnswer(choice, entry) {
    if (!quizQuestions) return;
    const correct = choice.id === entry.word.id;
    setResults((prev) => ({ ...prev, [currentIndex]: { isCorrect: correct, entry, selectedAnswer: choice.chinese } }));
    setRetryingIndex(null);
  }

  function handleRetryQuestion() {
    setRetryingIndex(currentIndex);
  }

  function handleNextQuestion() {
    if (currentIndex >= quizQuestions.length - 1) {
      setQuizComplete(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }

  function handleRestart() {
    resetQuizState();
    setQuizQuestions(null);
  }

  function handleRetryWrong() {
    const source = wrongAnswers.map((w) => ({ entry: w.entry }));
    resetQuizState();
    setQuizQuestions(source);
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (authReady && isGuest) return <LoginPrompt icon={ListChecks} />;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">

      {!isQuizActive && (
        <button
          type="button"
          onClick={() => navigate('/exercise')}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t.exercisesBackToHub}
        </button>
      )}

      {isQuizActive && (
        <Card className="border-theme-border bg-theme-surface shadow-soft">
          <CardContent className="flex items-center justify-between gap-4 p-3 sm:p-4">
            <Badge variant="badge-01">{modeTitle}</Badge>
            <button
              type="button"
              onClick={handleRestart}
              className="shrink-0 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-slate-300 hover:text-foreground dark:border-slate-600 dark:bg-slate-700 dark:text-muted-foreground dark:hover:text-slate-200"
            >
              New
            </button>
          </CardContent>
        </Card>
      )}

      {!isQuizActive && (
        <Card className="border-theme-border bg-theme-surface shadow-soft">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-theme-border pb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ModeIcon className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-black text-foreground">{modeTitle}</h1>
            </div>

            <div className="space-y-3">
              <div className="min-w-0 space-y-1">
                <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.bookLabel}</label>
                <Select className="min-w-0 w-full" value={activeBookId} onChange={(e) => setActiveBookId(e.target.value)}>
                  {books.filter((b) => b.enabled !== false || isSuperadmin).map((book) => (
                    <option key={book.id} value={book.id}>{book.title}</option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.lessonLabel}</label>
                <SectionSelector
                  sections={sections}
                  sectionsLoading={loadingSections}
                  selectedSection={selectedLessonId ?? ''}
                  onChange={setSelectedLessonId}
                  noSectionsLabel={t.myQuizNoLessons}
                  comingSoonLabel={t.comingSoon}
                  lessonLabel={t.lessonLabel}
                />
              </div>
            </div>

            {selectedLessonId && (
              <div className="flex flex-col gap-2 border-t border-theme-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                {loadingExercises ? (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t.myQuizLoadingSections}
                  </span>
                ) : tooFew ? (
                  <span className="text-sm text-muted-foreground">{t.exercisesNoDataYet}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t.exercisesReadyCount.replace('{count}', modeCount)}
                  </span>
                )}
                <Button type="button" disabled={tooFew || loadingExercises} className="w-full gap-2 sm:w-auto" onClick={handleStart}>
                  {t.myQuizStart}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isQuizActive && (
        mode === 'sentence-order' ? (
          <SentenceOrderQuiz
            entries={quizQuestions.map((q) => q.entry)}
            currentIndex={currentIndex}
            answeredQuestion={answeredQuestion}
            onAnswer={handleSentenceOrderAnswer}
            onRetryQuestion={handleRetryQuestion}
            onNext={handleNextQuestion}
            score={score}
            isComplete={quizComplete}
            wrongAnswers={wrongAnswers}
            onRestart={handleRestart}
            onRetryWrong={handleRetryWrong}
            t={t}
          />
        ) : mode === 'fill-blank' ? (
          <FillBlankQuiz
            entries={quizQuestions.map((q) => q.entry)}
            pool={pool}
            currentIndex={currentIndex}
            answeredQuestion={answeredQuestion}
            onAnswer={handleFillBlankAnswer}
            onRetryQuestion={handleRetryQuestion}
            onNext={handleNextQuestion}
            score={score}
            isComplete={quizComplete}
            wrongAnswers={wrongAnswers}
            onRestart={handleRestart}
            onRetryWrong={handleRetryWrong}
            t={t}
          />
        ) : (
          <MatchingQuiz pairs={quizQuestions} onRestart={handleRestart} t={t} />
        )
      )}
    </div>
  );
}
