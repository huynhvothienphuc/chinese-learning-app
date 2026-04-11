import { useEffect, useState } from 'react';
import { CheckSquare2, Heart, Loader2, PencilLine, ListChecks, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildQuizChoices, cn, normalizeVocabularyItems, shuffleArray } from '@/lib/utils';
import { fetchJSON } from '@/lib/fetchCache';
import Quiz from './Quiz';
import WriteMode from './WriteMode';

const USER_UPLOAD_BOOK_ID = 'user-upload';
const FAVORITES_ID = 'favorites';

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.chinese}__${item.pinyin}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const INITIAL_SCORE = { correct: 0, total: 0 };

function withSectionScopedIds(items, scope) {
  return items.map((item, index) => ({
    ...item,
    id: `${scope}:${item.id || `${item.chinese}-${item.pinyin}-${index}`}`,
  }));
}

export default function MyQuizPage({ books, uploadedLessons, favoriteVocabulary, onBack, language = 'en', t }) {
  const [selectedBook, setSelectedBook] = useState(books[0]?.id ?? '');
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [checkedSections, setCheckedSections] = useState(new Set());
  const [sectionVocab, setSectionVocab] = useState({});
  const [loadingVocab, setLoadingVocab] = useState(new Set());
  const [count, setCount] = useState('all');
  const [quizMode, setQuizMode] = useState('multiple-choice');

  // Quiz state — quizQuestions is pre-built [{item, choices}] or null when not active
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [quizComplete, setQuizComplete] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);

  const isFavoritesMode = selectedBook === FAVORITES_ID;
  const isQuizActive = quizQuestions !== null;

  useEffect(() => {
    setCheckedSections(new Set());
    setSectionVocab({});
    setLoadingVocab(new Set());

    if (isFavoritesMode || !selectedBook) return;

    if (selectedBook === USER_UPLOAD_BOOK_ID) {
      setSections(uploadedLessons.map((l) => ({ file: l.id, title: l.title, enabled: true })));
      return;
    }

    setLoadingSections(true);
    fetchJSON(`/data/books/${selectedBook}/sections.json`)
      .then((data) => setSections(data.filter((s) => s.enabled !== false)))
      .catch(() => setSections([]))
      .finally(() => setLoadingSections(false));
  }, [selectedBook, uploadedLessons, isFavoritesMode]);

  function loadSectionVocab(sectionFile) {
    if (sectionVocab[sectionFile] !== undefined || loadingVocab.has(sectionFile)) return;

    setLoadingVocab((prev) => new Set([...prev, sectionFile]));

    const request =
      selectedBook === USER_UPLOAD_BOOK_ID
        ? Promise.resolve(
            withSectionScopedIds(uploadedLessons.find((l) => l.id === sectionFile)?.items || [], `${selectedBook}:${sectionFile}`)
          )
        : fetchJSON(`/data/books/${selectedBook}/${sectionFile}`)
          .then((data) => withSectionScopedIds(normalizeVocabularyItems(data?.items || data), `${selectedBook}:${sectionFile}`));

    request
      .then((items) => setSectionVocab((prev) => ({ ...prev, [sectionFile]: items })))
      .catch(() => setSectionVocab((prev) => ({ ...prev, [sectionFile]: [] })))
      .finally(() =>
        setLoadingVocab((prev) => {
          const next = new Set(prev);
          next.delete(sectionFile);
          return next;
        }),
      );
  }

  function toggleSection(sectionFile) {
    const next = new Set(checkedSections);
    if (next.has(sectionFile)) {
      next.delete(sectionFile);
    } else {
      next.add(sectionFile);
      loadSectionVocab(sectionFile);
    }
    setCheckedSections(next);
  }

  const enabledSections = sections.filter((s) => s.enabled !== false);
  const allChecked = enabledSections.length > 0 && enabledSections.every((s) => checkedSections.has(s.file));

  function toggleAll() {
    if (allChecked) {
      setCheckedSections(new Set());
      return;
    }
    const next = new Set(enabledSections.map((s) => s.file));
    setCheckedSections(next);
    enabledSections.forEach((s) => loadSectionVocab(s.file));
  }

  const pool = isFavoritesMode
    ? favoriteVocabulary
    : dedupe([...checkedSections].flatMap((f) => sectionVocab[f] || []));

  const available = pool.length;
  const tooFew = quizMode === 'write' ? available < 1 : available < 4;

  // Reset count if current selection exceeds available words
  useEffect(() => {
    if (count !== 'all' && available < count) setCount('all');
  }, [available, count]);
  const isLoadingAny = loadingVocab.size > 0;

  const deckLabel = isFavoritesMode
    ? t.favoriteList
    : checkedSections.size === 1
      ? sections.find((s) => checkedSections.has(s.file))?.title
      : checkedSections.size > 1
        ? `${books.find((b) => b.id === selectedBook)?.title} · ${checkedSections.size} ${t.myQuizLessonsLabel}`
        : undefined;

  function resetQuizState() {
    setCurrentIndex(0);
    setAnsweredQuestion(null);
    setScore(INITIAL_SCORE);
    setQuizComplete(false);
    setWrongAnswers([]);
  }

  function buildQuestions(words, choicePool) {
    return words.map((item) => ({ item, choices: buildQuizChoices(choicePool, item) }));
  }

  function handleStart() {
    const shuffled = shuffleArray([...pool]);
    const words = count === 'all' ? shuffled : shuffled.slice(0, count);
    resetQuizState();
    setQuizQuestions(buildQuestions(words, pool));
  }

  function handleAnswer(choice) {
    if (!quizQuestions || answeredQuestion) return;
    const { item: currentItem } = quizQuestions[currentIndex];
    const correct = choice.id === currentItem.id;
    setAnsweredQuestion({ selectedAnswer: choice.chinese, isCorrect: correct });
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    if (!correct) {
      setWrongAnswers((prev) => [...prev, { item: currentItem, selectedAnswer: choice.chinese }]);
    }
  }

  function handleNextQuestion() {
    if (currentIndex >= quizQuestions.length - 1) {
      setQuizComplete(true);
      setAnsweredQuestion(null);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setAnsweredQuestion(null);
  }

  function handleRestart() {
    resetQuizState();
    setQuizQuestions(null);
  }

  function handleRetryWrong() {
    const words = wrongAnswers.map((w) => w.item);
    resetQuizState();
    setQuizQuestions(buildQuestions(words, words));
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {isQuizActive ? (
        <Card className="border-theme-border bg-theme-surface shadow-soft">
          <CardContent className="grid grid-cols-[1fr_auto] items-center gap-4 p-3 sm:p-4">
            {/* Left: book + lessons */}
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-14 shrink-0 text-xs font-semibold text-slate-400">Book:</span>
                <span className="rounded-2xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {books.find((b) => b.id === selectedBook)?.title ?? selectedBook}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-14 shrink-0 text-xs font-semibold text-slate-400">Lessons:</span>
                {sections.filter((s) => checkedSections.has(s.file)).map((s) => (
                  <span key={s.file} className="rounded-2xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {s.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: New Quiz */}
            <button
              type="button"
              onClick={handleRestart}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              New Quiz
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-theme-border bg-theme-surface shadow-soft">
        <CardContent className="p-4 sm:p-5">
          <p className="inline-block rounded-2xl bg-primary/20 px-4 py-2 text-base font-medium text-primary">{t.myQuizSubtitle}</p>

          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  disabled={isQuizActive}
                  onClick={() => setSelectedBook(book.id)}
                  className={cn(
                    'rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-default',
                    selectedBook === book.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white text-slate-700 hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                  )}
                >
                  {book.title}
                </button>
              ))}
              {/* TODO: Re-enable favorites quiz mode once improved */}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-theme-border pt-2">
              <span className="text-xs font-semibold text-slate-400">{t.quizInstructionLabel}:</span>
              <button
                type="button"
                disabled={isQuizActive}
                onClick={() => setQuizMode('multiple-choice')}
                className={cn(
                  'flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-default',
                  quizMode === 'multiple-choice'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white text-slate-600 hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                )}
              >
                <ListChecks className="h-4 w-4" />
                {t.multipleChoice}
              </button>
              <button
                type="button"
                disabled={isQuizActive}
                onClick={() => setQuizMode('write')}
                className={cn(
                  'flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-default',
                  quizMode === 'write'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white text-slate-600 hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                )}
              >
                <PencilLine className="h-4 w-4" />
                {t.writeTab}
              </button>

              <span className="text-xs font-semibold text-slate-400 sm:ml-2">{t.myQuizCountLabel}:</span>
              {['all', 20, 40, 60].map((opt) => {
                const notEnough = opt !== 'all' && available < opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={isQuizActive || notEnough}
                    onClick={() => { if (!notEnough) setCount(opt); }}
                    className={cn(
                      'rounded-2xl px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      count === opt
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white text-slate-600 hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                    )}
                  >
                    {opt === 'all' ? t.myQuizCountAll : opt}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {isQuizActive ? (
        quizMode === 'write' ? (
          <WriteMode
            key={quizQuestions.map((q) => q.item.id).join(',')}
            vocabulary={quizQuestions.map((q) => q.item)}
            language={language}
            t={t}
          />
        ) : (
        <Quiz
          vocabulary={quizQuestions.map((q) => q.item)}
          allChoices={quizQuestions.map((q) => q.choices)}
          currentIndex={currentIndex}
          answeredQuestion={answeredQuestion}
          onAnswer={handleAnswer}
          onNext={handleNextQuestion}
          score={score}
          isComplete={quizComplete}
          wrongAnswers={wrongAnswers}
          onRestart={handleRestart}
          onRetryWrong={handleRetryWrong}
          isFavorite={false}
          onToggleFavorite={() => {}}
          language={language}
          deckSource="all"
          deckLabel={deckLabel}
          t={t}
        />
        )
      ) : (
        <Card className="border-theme-border bg-theme-surface shadow-soft">
          <CardContent className="p-4 sm:p-5">
            {isFavoritesMode ? (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-800/60 dark:bg-rose-900/20">
                <Heart className="h-5 w-5 shrink-0 fill-rose-500 text-rose-500" />
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                  {t.myQuizWordsReady.replace('{count}', favoriteVocabulary.length)}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.myQuizLessonsLabel}</p>
                  {enabledSections.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs font-semibold text-primary hover:opacity-80"
                    >
                      {allChecked ? t.myQuizDeselectAll : t.myQuizSelectAll}
                    </button>
                  )}
                </div>

                {loadingSections ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.myQuizLoadingSections}
                  </div>
                ) : enabledSections.length === 0 ? (
                  <p className="py-6 text-sm text-slate-500">{t.myQuizNoLessons}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {enabledSections.map((section) => {
                      const checked = checkedSections.has(section.file);
                      const vocabItems = sectionVocab[section.file];
                      const isLoading = loadingVocab.has(section.file);
                      return (
                        <button
                          key={section.file}
                          type="button"
                          onClick={() => toggleSection(section.file)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                            checked
                              ? 'border-primary/40 bg-primary/10 dark:border-primary/30 dark:bg-primary/10'
                              : 'border-theme-border bg-white hover:bg-primary/5 dark:border-slate-600 dark:bg-slate-700/60 dark:hover:bg-slate-700',
                          )}
                        >
                          {checked
                            ? <CheckSquare2 className="h-4 w-4 shrink-0 text-primary" />
                            : <Square className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-500" />
                          }
                          <span className="flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">{section.title}</span>
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-slate-400" />
                          ) : vocabItems ? (
                            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
                              {vocabItems.length}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                disabled={tooFew || isLoadingAny}
                className="gap-2"
                onClick={handleStart}
              >
                {t.myQuizStart}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
