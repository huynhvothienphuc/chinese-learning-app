import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, shuffleArray } from '@/lib/utils';

// Single-screen matching exercise — not paginated like the other quiz modes,
// so it owns its own completion state instead of plugging into MyQuizPage's
// currentIndex/score machinery.
export default function MatchingQuiz({ pairs, onRestart, onComplete, t }) {
  const [matched, setMatched] = useState(() => new Set());
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [wrongFlash, setWrongFlash] = useState(null); // { questionIdx, answerIdx }
  const [mistakes, setMistakes] = useState(0);
  const completedRef = useRef(false);

  const rightOrder = useMemo(() => {
    let order = shuffleArray(pairs.map((_, i) => i));
    if (pairs.length > 1 && order.every((v, i) => v === i)) order = shuffleArray(order);
    return order;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs]);

  const isComplete = pairs.length > 0 && matched.size === pairs.length;

  useEffect(() => {
    if (isComplete && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [isComplete, onComplete]);

  function selectQuestion(idx) {
    if (matched.has(idx) || wrongFlash) return;
    setSelectedIdx((prev) => (prev === idx ? null : idx));
  }

  function selectAnswer(idx) {
    if (matched.has(idx) || wrongFlash || selectedIdx === null) return;
    if (selectedIdx === idx) {
      setMatched((prev) => new Set([...prev, idx]));
      setSelectedIdx(null);
      return;
    }
    setMistakes((prev) => prev + 1);
    setWrongFlash({ questionIdx: selectedIdx, answerIdx: idx });
    setTimeout(() => {
      setWrongFlash(null);
      setSelectedIdx(null);
    }, 500);
  }

  if (pairs.length === 0) return null;

  if (isComplete) {
    return (
      <Card className="overflow-hidden border-border bg-card shadow-lg animate-float-in">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-500 dark:bg-amber-900/30">
            <Trophy className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl font-black">{t.quizSummary}</CardTitle>
          <CardDescription>{t.greatWork}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="rounded-3xl bg-primary/10 p-5">
            <p className="text-4xl font-black text-foreground">{pairs.length} / {pairs.length}</p>
            <p className="mt-2 text-lg font-semibold text-primary">
              {mistakes === 0 ? t.perfectScore : `${mistakes} ${t.myQuizMatchingMistakes}`}
            </p>
          </div>
          <Button className="w-full" onClick={onRestart}>{t.startNewQuiz}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-theme-border bg-theme-surface shadow-lg animate-float-in">
      {/* Sticky so the "currently selected" reminder stays visible while
          scrolling down to the answer column on narrow (single-column) screens. */}
      <CardHeader className="sticky top-0 z-10 space-y-2 border-b border-theme-border bg-theme-surface">
        <div className="flex items-center gap-2">
          <Badge variant="badge-01">{matched.size} / {pairs.length}</Badge>
        </div>
        {selectedIdx !== null ? (
          <p className="text-sm font-semibold text-primary">
            {t.exercisesSelectedQuestion}: {pairs[selectedIdx].question.chinese}
          </p>
        ) : (
          <CardDescription>{t.myQuizMatchingHint}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-3 bg-theme-surface p-4 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          {pairs.map((pair, idx) => (
            <button
              key={`q-${idx}`}
              type="button"
              disabled={matched.has(idx)}
              onClick={() => selectQuestion(idx)}
              className={cn(
                'w-full rounded-2xl border px-4 py-3 text-center transition-all duration-150',
                'bg-card hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-none',
                matched.has(idx) && 'border-emerald-300 bg-emerald-50 opacity-70 dark:bg-emerald-900/20',
                !matched.has(idx) && selectedIdx === idx && 'border-primary ring-2 ring-primary/30',
                !matched.has(idx) && wrongFlash?.questionIdx === idx && 'border-rose-400 bg-rose-50 dark:bg-rose-900/30',
                !matched.has(idx) && selectedIdx !== idx && wrongFlash?.questionIdx !== idx && 'border-border',
              )}
            >
              <p className="text-xs text-muted-foreground">{pair.question.pinyin}</p>
              <p className="text-base font-bold text-foreground">{pair.question.chinese}</p>
              {matched.has(idx) && <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-emerald-600" />}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rightOrder.map((idx) => {
            const pair = pairs[idx];
            return (
              <button
                key={`a-${idx}`}
                type="button"
                disabled={matched.has(idx)}
                onClick={() => selectAnswer(idx)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-3 text-center transition-all duration-150',
                  'bg-card hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-none',
                  matched.has(idx) && 'border-emerald-300 bg-emerald-50 opacity-70 dark:bg-emerald-900/20',
                  !matched.has(idx) && wrongFlash?.answerIdx === idx && 'border-rose-400 bg-rose-50 dark:bg-rose-900/30',
                  !matched.has(idx) && wrongFlash?.answerIdx !== idx && 'border-border',
                )}
              >
                <p className="text-xs text-muted-foreground">{pair.answer.pinyin}</p>
                <p className="text-base font-bold text-foreground">{pair.answer.chinese}</p>
                {matched.has(idx) && <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
