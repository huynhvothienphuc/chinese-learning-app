import { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { CheckCircle2, CircleX, RotateCcw, Trophy } from 'lucide-react';
import SpeakButton from '@/components/SpeakButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, shuffleArray } from '@/lib/utils';

function Chip({ segment, onClick, disabled, variant }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-2xl border px-3 py-2 text-left transition-all duration-150',
        'bg-card hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-none',
        variant === 'correct' && 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20',
        variant === 'wrong' && 'border-rose-300 bg-rose-50 dark:bg-rose-900/20',
        !variant && 'border-border',
      )}
    >
      <span className="text-xs text-muted-foreground">{segment.pinyin}</span>
      <span className="text-lg font-bold text-foreground">{segment.chinese}</span>
    </button>
  );
}

// Draggable version, used only while the build area is still editable —
// once locked (answered/practice-submitted) we render plain <Chip> instead.
function DraggableChip({ idx, segment, onTap }) {
  return (
    <Reorder.Item
      as="div"
      value={idx}
      whileDrag={{ scale: 1.05, zIndex: 1 }}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <div
        onClick={onTap}
        className="flex flex-col items-center gap-0.5 rounded-2xl border border-border bg-card px-3 py-2 text-left transition-shadow hover:shadow-md"
      >
        <span className="text-xs text-muted-foreground">{segment.pinyin}</span>
        <span className="text-lg font-bold text-foreground">{segment.chinese}</span>
      </div>
    </Reorder.Item>
  );
}

function Summary({ total, score, wrongAnswers, onRestart, onRetryWrong, t }) {
  const percentage = total === 0 ? 0 : Math.round((score.correct / total) * 100);
  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] animate-float-in">
      <Card className="self-start overflow-hidden border-border bg-card shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-500 dark:bg-amber-900/30">
            <Trophy className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl font-black">{t.quizSummary}</CardTitle>
          <CardDescription>{t.greatWork}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-3xl bg-primary/10 p-5 text-center">
            <p className="text-4xl font-black text-foreground">{score.correct} / {total}</p>
            <p className="mt-2 text-lg font-semibold text-primary">{percentage}% {t.correct}</p>
          </div>
          {wrongAnswers.length > 0 && (
            <Button className="w-full" variant="destructive" onClick={onRetryWrong}>
              Practice {wrongAnswers.length} wrong sentence{wrongAnswers.length > 1 ? 's' : ''}
            </Button>
          )}
          <Button className="w-full" variant={wrongAnswers.length > 0 ? 'outline' : 'default'} onClick={onRestart}>
            {t.startNewQuiz}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-black">{t.reviewWrongAnswers} ({wrongAnswers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {wrongAnswers.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              {t.perfectScore}
            </div>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              {wrongAnswers.map(({ entry }, i) => (
                <div key={i} className="rounded-3xl border border-theme-border bg-primary/5 p-4">
                  <p className="text-lg font-bold text-foreground">{entry.sample.sentence}</p>
                  <p className="text-sm text-muted-foreground">{entry.sample.pinyin}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SentenceOrderQuiz({
  entries,
  currentIndex,
  answeredQuestion,
  onAnswer,
  onRetryQuestion,
  onNext,
  score,
  isComplete,
  wrongAnswers,
  onRestart,
  onRetryWrong,
  t,
}) {
  const cardRef = useRef(null);
  const [placed, setPlaced] = useState([]);
  const currentEntry = entries[currentIndex];
  const segments = currentEntry?.sample?.segments ?? [];

  // Reset on a *new question instance*, not on `currentIndex` — retrying a
  // wrong-answers set always restarts at index 0, so if the previous session
  // was also on index 0 (e.g. a single-question retry set), an index-only
  // comparison never fires and stale `placed` soft-locks the build area.
  // `currentEntry` is a fresh object every time ExercisePage builds a new
  // `quizQuestions` array (handleStart/handleRetryWrong), so it's a reliable
  // per-question identity even when the index repeats.
  const [renderedEntry, setRenderedEntry] = useState(currentEntry);
  if (renderedEntry !== currentEntry) {
    setRenderedEntry(currentEntry);
    setPlaced([]);
  }

  const order = useMemo(() => {
    if (segments.length < 2) return segments.map((_, i) => i);
    let next = shuffleArray(segments.map((_, i) => i));
    if (next.every((v, i) => v === i)) next = shuffleArray(next);
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntry]);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentIndex]);

  if (isComplete) {
    return <Summary total={entries.length} score={score} wrongAnswers={wrongAnswers} onRestart={onRestart} onRetryWrong={onRetryWrong} t={t} />;
  }

  if (!currentEntry) return null;

  // The parent stores results per question index and lets a retry overwrite
  // a prior wrong result — `answeredQuestion` is null again while retrying,
  // so this component's own "locked" state just follows it directly.
  const locked = Boolean(answeredQuestion);
  const isCorrect = answeredQuestion?.isCorrect;
  const available = order.filter((i) => !placed.includes(i));
  const isLastQuestion = currentIndex === entries.length - 1;

  function handlePlace(idx) {
    if (locked) return;
    const next = [...placed, idx];
    setPlaced(next);
    if (next.length === segments.length) {
      onAnswer(next.every((v, i) => v === i), currentEntry);
    }
  }

  function handleRemove(idx) {
    if (locked) return;
    setPlaced((prev) => prev.filter((v) => v !== idx));
  }

  function handleRetry() {
    setPlaced([]);
    onRetryQuestion();
  }

  return (
    <Card ref={cardRef} className="overflow-hidden border-theme-border bg-theme-surface shadow-lg animate-float-in">
      <CardHeader className="space-y-4 border-b border-theme-border bg-theme-surface">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="badge-01">{t.score}: {score.correct}/{score.total}</Badge>
          <Badge variant="badge-01">{currentIndex + 1} / {entries.length}</Badge>
          {Boolean(answeredQuestion) && (
            <Button className="ml-auto shrink-0" onClick={onNext}>
              {isLastQuestion ? t.viewSummary : t.nextQuestion}
            </Button>
          )}
        </div>
        <CardDescription>{t.myQuizSentenceOrderHint}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 bg-theme-surface p-4 sm:p-6">
        {/* Build area */}
        <div
          className={cn(
            'flex min-h-[64px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-3',
            !locked && 'border-primary/30',
            locked && isCorrect && 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20',
            locked && !isCorrect && 'border-rose-300 bg-rose-50 dark:bg-rose-900/20',
          )}
        >
          {placed.length === 0 && !locked && (
            <span className="text-sm text-muted-foreground">{t.myQuizSentenceOrderPlaceholder}</span>
          )}
          {locked ? (
            placed.map((idx, pos) => (
              <Chip key={idx} segment={segments[idx]} disabled variant={idx === pos ? 'correct' : 'wrong'} />
            ))
          ) : (
            <Reorder.Group as="div" axis="x" values={placed} onReorder={setPlaced} className="flex flex-wrap gap-2">
              {placed.map((idx) => (
                <DraggableChip key={idx} idx={idx} segment={segments[idx]} onTap={() => handleRemove(idx)} />
              ))}
            </Reorder.Group>
          )}
          {locked && (
            <span className="ml-2 inline-flex items-center gap-1">
              {isCorrect
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <CircleX className="h-5 w-5 text-rose-600" />}
            </span>
          )}
        </div>

        {/* Word bank */}
        {!locked && (
          <div className="flex flex-wrap gap-2">
            {available.map((idx) => (
              <Chip key={idx} segment={segments[idx]} onClick={() => handlePlace(idx)} />
            ))}
          </div>
        )}

        {/* Reveal correct sentence + retry on wrong answer */}
        {locked && !isCorrect && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{currentEntry.sample.sentence}</p>
                <SpeakButton text={currentEntry.sample.sentence} size="icon" variant="ghost" />
              </div>
              <p className="text-sm text-muted-foreground">{currentEntry.sample.pinyin}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRetry}>
              <RotateCcw className="h-3.5 w-3.5" /> {t.exercisesTryAgain}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
