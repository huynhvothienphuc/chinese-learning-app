import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckSquare2, PencilLine, ListChecks, Loader2, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildQuizChoices, cn, normalizeVocabularyItems, shuffleArray } from '@/lib/utils';
import { fetchJSON } from '@/lib/fetchCache';
import { USER_UPLOAD_BOOK_ID } from '@/lib/constants';
import Quiz from '@/components/Quiz';
import WriteMode from '@/components/WriteMode';

// ─── helpers ────────────────────────────────────────────────────────────────

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.chinese}__${item.pinyin}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scopeKey(bookId, sectionFile) {
  return `${bookId}:${sectionFile}`;
}

function withScopedIds(items, bookId, sectionFile) {
  const scope = scopeKey(bookId, sectionFile);
  return items.map((item, index) => ({
    ...item,
    id: `${scope}:${item.id || `${item.chinese}-${item.pinyin}-${index}`}`,
  }));
}

const INITIAL_SCORE = { correct: 0, total: 0 };

// ─── component ──────────────────────────────────────────────────────────────

export default function MyQuizPage() {
  const { books, uploadedLessons, selectedLanguage: language = 'vi', t } = useOutletContext();
  // Which book's sections are currently being browsed
  const [activeBrowseBook, setActiveBrowseBook] = useState(books[0]?.id ?? '');

  // Sections for the actively-browsed book
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Multi-book selection: Map<scopeKey, { bookId, bookTitle, sectionFile, sectionTitle }>
  const [selection, setSelection] = useState(new Map());

  // Vocab per scope key
  const [vocabByScope, setVocabByScope] = useState({});
  const [loadingScopes, setLoadingScopes] = useState(new Set());

  const [count, setCount] = useState('all');
  const [quizMode, setQuizMode] = useState('multiple-choice');

  // Quiz runtime state
  const [quizQuestions, setQuizQuestions] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [quizComplete, setQuizComplete] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);

  const isQuizActive = quizQuestions !== null;

  // ── auto-select first book once books load ───────────────────────────────
  useEffect(() => {
    if (!activeBrowseBook && books.length > 0) {
      setActiveBrowseBook(books[0].id);
    }
  }, [books, activeBrowseBook]);

  // ── load sections when activeBrowseBook changes ──────────────────────────
  useEffect(() => {
    if (!activeBrowseBook) return;

    if (activeBrowseBook === USER_UPLOAD_BOOK_ID) {
      setSections(uploadedLessons.map((l) => ({ file: l.id, title: l.title, enabled: true })));
      return;
    }

    setLoadingSections(true);
    fetchJSON(`/data/books/${activeBrowseBook}/sections.json`)
      .then((data) => setSections(Array.isArray(data) ? data.filter((s) => s.enabled !== false) : []))
      .catch(() => setSections([]))
      .finally(() => setLoadingSections(false));
  }, [activeBrowseBook, uploadedLessons]);

  // ── fetch vocab for a scope when a section is checked ────────────────────
  function loadVocabForScope(bookId, sectionFile) {
    const key = scopeKey(bookId, sectionFile);
    if (vocabByScope[key] !== undefined || loadingScopes.has(key)) return;

    setLoadingScopes((prev) => new Set([...prev, key]));

    const request =
      bookId === USER_UPLOAD_BOOK_ID
        ? Promise.resolve(
            withScopedIds(
              uploadedLessons.find((l) => l.id === sectionFile)?.items ?? [],
              bookId,
              sectionFile,
            ),
          )
        : fetchJSON(`/data/books/${bookId}/${sectionFile}`).then((data) =>
            withScopedIds(normalizeVocabularyItems(data?.items ?? data), bookId, sectionFile),
          );

    request
      .then((items) => setVocabByScope((prev) => ({ ...prev, [key]: items })))
      .catch(() => setVocabByScope((prev) => ({ ...prev, [key]: [] })))
      .finally(() =>
        setLoadingScopes((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        }),
      );
  }

  function toggleSection(sectionFile, sectionTitle) {
    const key = scopeKey(activeBrowseBook, sectionFile);
    setSelection((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        const bookTitle = books.find((b) => b.id === activeBrowseBook)?.title ?? activeBrowseBook;
        next.set(key, { bookId: activeBrowseBook, bookTitle, sectionFile, sectionTitle });
        loadVocabForScope(activeBrowseBook, sectionFile);
      }
      return next;
    });
  }

  function removeSelection(key) {
    setSelection((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  function clearAll() {
    setSelection(new Map());
  }

  // ── select-all for current book ───────────────────────────────────────────
  const enabledSections = sections.filter((s) => s.enabled !== false);
  const allCheckedForCurrentBook =
    enabledSections.length > 0 &&
    enabledSections.every((s) => selection.has(scopeKey(activeBrowseBook, s.file)));

  function toggleAllCurrentBook() {
    if (allCheckedForCurrentBook) {
      setSelection((prev) => {
        const next = new Map(prev);
        enabledSections.forEach((s) => next.delete(scopeKey(activeBrowseBook, s.file)));
        return next;
      });
    } else {
      setSelection((prev) => {
        const next = new Map(prev);
        const bookTitle = books.find((b) => b.id === activeBrowseBook)?.title ?? activeBrowseBook;
        enabledSections.forEach((s) => {
          const key = scopeKey(activeBrowseBook, s.file);
          if (!next.has(key)) {
            next.set(key, { bookId: activeBrowseBook, bookTitle, sectionFile: s.file, sectionTitle: s.title });
            loadVocabForScope(activeBrowseBook, s.file);
          }
        });
        return next;
      });
    }
  }

  // ── build quiz pool from all selected sections ────────────────────────────
  const pool = dedupe(
    [...selection.values()].flatMap(({ bookId, sectionFile }) => {
      const key = scopeKey(bookId, sectionFile);
      return vocabByScope[key] ?? [];
    }),
  ).filter((item) => !item.notest);

  const available = pool.length;
  const tooFew = quizMode === 'write' ? available < 1 : available < 4;
  const isLoadingAny = loadingScopes.size > 0;

  useEffect(() => {
    if (count !== 'all' && available < count) setCount('all');
  }, [available, count]);

  // ── quiz runtime ──────────────────────────────────────────────────────────
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
    setQuizQuestions(buildQuestions(words, pool));
  }

  // ── group selected entries by book for display ────────────────────────────
  const selectionByBook = [...selection.entries()].reduce((acc, [key, entry]) => {
    if (!acc[entry.bookId]) acc[entry.bookId] = { bookTitle: entry.bookTitle, entries: [] };
    acc[entry.bookId].entries.push({ key, ...entry });
    return acc;
  }, {});

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">

      {/* ── active quiz header ── */}
      {isQuizActive && (
        <Card className="border-theme-border bg-theme-surface shadow-soft">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                {Object.values(selectionByBook).map((group) => (
                  <div key={group.bookTitle} className="flex flex-wrap items-center gap-1.5">
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">{group.bookTitle}:</span>
                    {group.entries.map((e) => (
                      <span key={e.key} className="rounded-2xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {e.sectionTitle}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="shrink-0 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-slate-300 hover:text-foreground dark:border-slate-600 dark:bg-slate-700 dark:text-muted-foreground dark:hover:text-slate-200"
              >
                New Quiz
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── builder UI (hidden while quiz active) ── */}
      {!isQuizActive && (
        <>
          {/* Book + mode row */}
          <Card className="border-theme-border bg-theme-surface shadow-soft">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 border-b border-theme-border pb-3">
                <p className="hidden sm:inline-flex items-center rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                  {t.myQuizSubtitle}
                </p>
                <p className="inline-flex items-center rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                  ✨ Có thể chọn nhiều bài từ nhiều sách!
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-2">

                {/* Row 1: Chọn sách + Số câu hỏi */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Chọn sách:</span>
                  {books.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setActiveBrowseBook(book.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                        activeBrowseBook === book.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white text-foreground hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                      )}
                    >
                      {book.title}
                      {(() => {
                        const n = [...selection.values()].filter((e) => e.bookId === book.id).length;
                        return n > 0 ? (
                          <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-bold">
                            {n}
                          </span>
                        ) : null;
                      })()}
                    </button>
                  ))}
                </div>

                {/* Row 2: Số câu hỏi */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{t.myQuizCountLabel}:</span>
                  {['all', 20, 40, 60].map((opt) => {
                    const notEnough = opt !== 'all' && available < opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={notEnough}
                        onClick={() => { if (!notEnough) setCount(opt); }}
                        className={cn(
                          'rounded-2xl px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                          count === opt
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white text-muted-foreground hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                        )}
                      >
                        {opt === 'all' ? t.myQuizCountAll : opt}
                      </button>
                    );
                  })}
                </div>

                {/* Row 3: Phương pháp kiểm tra */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{t.quizInstructionLabel}:</span>
                  {[
                    { key: 'multiple-choice', label: t.multipleChoice, icon: <ListChecks className="h-4 w-4" /> },
                    { key: 'write', label: t.writeTab, icon: <PencilLine className="h-4 w-4" /> },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setQuizMode(opt.key)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold transition-colors',
                        quizMode === opt.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white text-muted-foreground hover:bg-primary/10 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Selected chips across all books */}
          {selection.size > 0 && (
            <Card className="border-theme-border bg-theme-surface shadow-soft">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Selected — {available} {available === 1 ? 'word' : 'words'}
                    {isLoadingAny && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
                  </p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold text-rose-500 hover:opacity-80"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.values(selectionByBook).map((group) => (
                    <div key={group.bookTitle} className="flex flex-wrap items-center gap-1.5">
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {group.bookTitle}:
                      </span>
                      {group.entries.map((e) => {
                        const vocabCount = vocabByScope[e.key]?.filter((i) => !i.notest).length;
                        return (
                          <span
                            key={e.key}
                            className="flex items-center gap-1 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                          >
                            {e.sectionTitle}
                            {vocabCount != null && (
                              <span className="text-primary/60">({vocabCount})</span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeSelection(e.key)}
                              aria-label={`Remove ${e.sectionTitle}`}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section list for active book */}
          <Card className="border-theme-border bg-theme-surface shadow-soft">
            <CardContent className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {t.myQuizLessonsLabel}
                </p>
                {enabledSections.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllCurrentBook}
                    className="text-xs font-semibold text-primary hover:opacity-80"
                  >
                    {allCheckedForCurrentBook ? t.myQuizDeselectAll : t.myQuizSelectAll}
                  </button>
                )}
              </div>

              {loadingSections ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.myQuizLoadingSections}
                </div>
              ) : enabledSections.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">{t.myQuizNoLessons}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {enabledSections.map((section) => {
                    const key = scopeKey(activeBrowseBook, section.file);
                    const checked = selection.has(key);
                    const vocabItems = vocabByScope[key];
                    const isLoading = loadingScopes.has(key);
                    return (
                      <button
                        key={section.file}
                        type="button"
                        onClick={() => toggleSection(section.file, section.title)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                          checked
                            ? 'border-primary/40 bg-primary/10 dark:border-primary/30 dark:bg-primary/10'
                            : 'border-theme-border bg-white hover:bg-primary/5 dark:border-slate-600 dark:bg-slate-700/60 dark:hover:bg-slate-700',
                        )}
                      >
                        {checked
                          ? <CheckSquare2 className="h-4 w-4 shrink-0 text-primary" />
                          : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="flex-1 truncate text-sm font-medium text-foreground">
                          {section.title}
                        </span>
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                        ) : vocabItems ? (
                          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-muted-foreground dark:bg-slate-600 dark:text-slate-300">
                            {vocabItems.filter((item) => !item.notest).length}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  disabled={tooFew || isLoadingAny || selection.size === 0}
                  className="gap-2"
                  onClick={handleStart}
                >
                  {t.myQuizStart}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── quiz / write mode ── */}
      {isQuizActive && (
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
            t={t}
          />
        )
      )}
    </div>
  );
}
