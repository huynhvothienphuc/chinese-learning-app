import { useEffect, useState } from 'react';
import { ArrowLeft, CheckSquare2, Heart, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, normalizeVocabularyItems, shuffleArray } from '@/lib/utils';
import Divider from './ui/divider';
import Quiz from './Quiz';

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

export default function MyQuizPage({ books, uploadedLessons, favoriteVocabulary, onBack, language = 'en', t }) {
  const [selectedBook, setSelectedBook] = useState(books[0]?.id ?? '');
  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [checkedSections, setCheckedSections] = useState(new Set());
  const [sectionVocab, setSectionVocab] = useState({});
  const [loadingVocab, setLoadingVocab] = useState(new Set());
  const [count] = useState('all');

  // Quiz state
  const [quizWords, setQuizWords] = useState(null);
  const [quizPool, setQuizPool] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [quizComplete, setQuizComplete] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState([]);

  const isFavoritesMode = selectedBook === FAVORITES_ID;
  const isQuizActive = quizWords !== null;

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
    fetch(`/data/books/${selectedBook}/sections.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSections(data.filter((s) => s.enabled !== false)))
      .catch(() => setSections([]))
      .finally(() => setLoadingSections(false));
  }, [selectedBook, uploadedLessons, isFavoritesMode]);

  function loadSectionVocab(sectionFile) {
    if (sectionVocab[sectionFile] !== undefined || loadingVocab.has(sectionFile)) return;

    setLoadingVocab((prev) => new Set([...prev, sectionFile]));

    const request =
      selectedBook === USER_UPLOAD_BOOK_ID
        ? Promise.resolve(uploadedLessons.find((l) => l.id === sectionFile)?.items || [])
        : fetch(`/data/books/${selectedBook}/${sectionFile}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data) => normalizeVocabularyItems(data?.items || data));

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
  const tooFew = available < 4;
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

  function handleStart() {
    const shuffled = shuffleArray([...pool]);
    const words = count === 'all' ? shuffled : shuffled.slice(0, count);
    resetQuizState();
    setQuizPool([...pool]);
    setQuizWords(words);
  }

  function handleAnswer(choice) {
    if (!quizWords || answeredQuestion) return;
    const currentItem = quizWords[currentIndex];
    const correct = choice.id === currentItem.id;
    setAnsweredQuestion({ selectedAnswer: choice.chinese, isCorrect: correct });
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    if (!correct) {
      setWrongAnswers((prev) => [...prev, { item: currentItem, selectedAnswer: choice.chinese }]);
    }
  }

  function handleNextQuestion() {
    if (currentIndex >= quizWords.length - 1) {
      setQuizComplete(true);
      setAnsweredQuestion(null);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setAnsweredQuestion(null);
  }

  function handleRestart() {
    resetQuizState();
    setQuizWords(null);
    setQuizPool(null);
  }

  function handleRetryWrong() {
    const words = wrongAnswers.map((w) => w.item);
    resetQuizState();
    setQuizPool(words);
    setQuizWords(words);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
        <CardContent className="p-4 sm:p-5">
          <button
            type="button"
            onClick={isQuizActive ? handleRestart : onBack}
            className="mb-3 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {isQuizActive ? t.myQuizBack : t.myQuizBack}
          </button>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{t.myQuizTitle}</h1>
          <div className="flex flex-wrap gap-2 pt-3">
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
                    : 'bg-white text-slate-700 hover:bg-green-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                )}
              >
                {book.title}
              </button>
            ))}
            <Divider />
            <button
              type="button"
              disabled={favoriteVocabulary.length === 0 || isQuizActive}
              onClick={() => setSelectedBook(FAVORITES_ID)}
              className={cn(
                'flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                selectedBook === FAVORITES_ID
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-rose-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
              )}
            >
              <Heart className={cn('h-3.5 w-3.5', selectedBook === FAVORITES_ID ? 'fill-current' : '')} />
              {t.favoriteList}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-bold',
                selectedBook === FAVORITES_ID ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-300',
              )}>
                {favoriteVocabulary.length}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {isQuizActive ? (
        <Quiz
          vocabulary={quizWords}
          choicePool={quizPool}
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
      ) : (
        <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
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
                      className="text-xs font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
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
                              ? 'border-green-300 bg-green-50 dark:border-green-700/60 dark:bg-green-900/20'
                              : 'border-[#CAE8BD] bg-white hover:bg-green-50/60 dark:border-slate-600 dark:bg-slate-700/60 dark:hover:bg-slate-700',
                          )}
                        >
                          {checked
                            ? <CheckSquare2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
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
