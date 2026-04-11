import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleX, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn, getItemMeaning, shuffleArray } from '@/lib/utils';

function normalizeWriteAnswer(value) {
  return String(value || '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function Summary({ total, correct, wrongAnswers, onRestart, onRetryWrong, t, language }) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] animate-float-in">
      <Card className="self-start border-theme-border bg-theme-surface shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-500"><Trophy className="h-6 w-6" /></div>
          <CardTitle className="mt-3 text-2xl font-black">{t.quizSummary}</CardTitle>
          <CardDescription>{t.greatWork}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl bg-primary/10 p-5 text-center dark:bg-slate-700">
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{correct} / {total}</p>
            <p className="mt-2 text-lg font-semibold text-primary">{pct}% {t.correct}</p>
          </div>
          {wrongAnswers.length > 0 && (
            <Button className="w-full" variant="destructive" onClick={onRetryWrong}>
              {t.writeModeRetry} {wrongAnswers.length}
            </Button>
          )}
          <Button className="w-full" variant={wrongAnswers.length > 0 ? 'outline' : 'default'} onClick={onRestart}>
            {t.startNewQuiz}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-theme-border bg-theme-surface shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-black">{t.reviewWrongAnswers} ({wrongAnswers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {wrongAnswers.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-800">{t.perfectScore}</div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {wrongAnswers.map(({ item, typed }) => (
                <div key={item.id} className="rounded-3xl border border-theme-border bg-white p-4 dark:border-slate-600 dark:bg-slate-700">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {item.pinyin} · {getItemMeaning(item, language)}
                  </p>
                  <div className="mt-2 grid gap-1 text-sm">
                    <p className="text-rose-600 dark:text-rose-400">{t.wrongAnswer}: <span className="font-bold">{typed || '—'}</span></p>
                    <p className="text-emerald-700 dark:text-emerald-400">{t.correctAnswer}: <span className="font-bold">{item.chinese}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const INITIAL_SCORE = { correct: 0, total: 0 };

export default function WriteMode({ vocabulary, language = 'en', t }) {
  const [questions] = useState(() => shuffleArray([...vocabulary]));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [retryWords, setRetryWords] = useState(null);
  const inputRef = useRef(null);
  const cardRef = useRef(null);

  const activeQuestions = retryWords ?? questions;
  const item = activeQuestions[index];
  const answer = item?.chinese ?? '';

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [index]);

  function handleSubmit(e) {
    e.preventDefault();
    if (submitted || !item) return;
    const correct = normalizeWriteAnswer(typed) === normalizeWriteAnswer(answer);
    setIsCorrect(correct);
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    if (!correct) setWrongAnswers((prev) => [...prev, { item, typed: typed.trim() }]);
  }

  function handleNext() {
    if (index >= activeQuestions.length - 1) {
      setIsComplete(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setTyped('');
    setSubmitted(false);
    setIsCorrect(false);
  }

  function handleRestart() {
    setIndex(0);
    setTyped('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(INITIAL_SCORE);
    setWrongAnswers([]);
    setIsComplete(false);
    setRetryWords(null);
  }

  function handleRetryWrong() {
    const words = wrongAnswers.map((w) => w.item);
    setRetryWords(words);
    setIndex(0);
    setTyped('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(INITIAL_SCORE);
    setWrongAnswers([]);
    setIsComplete(false);
  }

  if (isComplete) {
    return (
      <Summary
        total={score.total}
        correct={score.correct}
        wrongAnswers={wrongAnswers}
        onRestart={handleRestart}
        onRetryWrong={handleRetryWrong}
        t={t}
        language={language}
      />
    );
  }

  if (!item) return null;

  const isLast = index === activeQuestions.length - 1;

  return (
    <Card ref={cardRef} className="overflow-hidden border-theme-border bg-theme-surface shadow-lg animate-float-in">
      <CardHeader className="space-y-4 border-b border-theme-border bg-theme-surface">

        {/* Status bar */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary dark:bg-slate-700 dark:text-slate-300">
            {t.writeTab}
          </span>
          <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary dark:bg-slate-700 dark:text-slate-300">
            {t.score}: {score.correct}/{score.total}
          </span>
          <span className="rounded-full bg-primary/20 px-4 py-1 text-sm font-semibold text-primary dark:bg-slate-700 dark:text-slate-300">
            {index + 1} / {activeQuestions.length}
          </span>
          <div className="group relative ml-auto">
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 hover:bg-primary/20 hover:text-primary dark:bg-slate-600 dark:text-slate-400 dark:hover:bg-slate-500"
              aria-label="How to use"
            >
              ?
            </button>
            <div className="pointer-events-none absolute right-0 top-7 z-10 w-56 rounded-2xl border border-theme-border bg-white p-3 text-xs text-slate-600 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-bold text-primary dark:text-primary">How to use</p>
              <ul className="mt-1.5 space-y-1">
                <li>1. Read the meaning shown</li>
                <li>2. Type pinyin → converts to Chinese<br/><span className="text-slate-400">e.g. Hello: type <span className="font-semibold text-slate-600 dark:text-slate-200">nihao</span> → 你好</span></li>
                <li>3. Press <span className="font-semibold">Check</span> to submit</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Question */}
        <p className="text-2xl font-black text-primary sm:text-3xl">
          {getItemMeaning(item, language)}
        </p>
      </CardHeader>

      <CardContent className="bg-theme-surface p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Answer row */}
          <div className={cn(
            'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors',
            !submitted && 'border-theme-border bg-white dark:border-slate-600 dark:bg-slate-700',
            submitted && isCorrect && 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20',
            submitted && !isCorrect && 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/20',
          )}>
            {submitted ? (
              <>
                {isCorrect
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  : <CircleX className="h-5 w-5 shrink-0 text-rose-500 dark:text-rose-400" />
                }
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{isCorrect ? typed : answer}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.pinyin}</p>
                  {!isCorrect && (
                    <p className="mt-1 text-sm text-rose-500 line-through dark:text-rose-400">{typed || '—'}</p>
                  )}
                </div>
              </>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type pinyin..."
                className="flex-1 bg-transparent text-xl font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-white"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            {!submitted
              ? <Button type="submit" disabled={!typed.trim()}>{t.writeModeSubmit}</Button>
              : <Button type="button" onClick={handleNext}>{isLast ? t.viewSummary : t.nextQuestion}</Button>
            }
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
