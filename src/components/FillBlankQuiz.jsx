import { useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, CircleX, RotateCcw, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildFillBlankChoices, cn } from '@/lib/utils';

function BlankChoice({ choice, isAnswered, isCorrect, isWrongSelection, onSelect }) {
  return (
    <button
      type="button"
      disabled={isAnswered}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-2xl border px-3 py-2 transition-all duration-150',
        'bg-card hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0 disabled:hover:shadow-none',
        !isAnswered && 'border-border',
        isCorrect && 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800',
        isWrongSelection && 'border-rose-300 bg-rose-50 ring-2 ring-rose-200 dark:border-rose-700 dark:bg-rose-900/30 dark:ring-rose-800',
      )}
    >
      <span className="text-xs text-muted-foreground">{choice.pinyin}</span>
      <span className="text-lg font-bold text-foreground">{choice.chinese}</span>
    </button>
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
              Practice {wrongAnswers.length} wrong word{wrongAnswers.length > 1 ? 's' : ''}
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
              {wrongAnswers.map(({ entry, selectedAnswer }, i) => (
                <div key={i} className="rounded-3xl border border-theme-border bg-primary/5 p-4">
                  <p className="text-lg font-bold text-foreground">
                    {entry.word.pinyin} <span className="font-medium text-muted-foreground">({entry.word.vi || entry.word.en})</span>
                  </p>
                  <div className="mt-3 grid gap-2 text-sm sm:text-base">
                    <p className="text-rose-600 line-through dark:text-rose-400">{t.wrongAnswer}: {selectedAnswer}</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">{t.correctAnswer}: {entry.word.chinese}</p>
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

export default function FillBlankQuiz({
  entries,
  pool,
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
  const currentEntry = entries[currentIndex];

  const choices = useMemo(() => {
    if (!currentEntry) return [];
    return buildFillBlankChoices(pool, currentEntry.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentIndex]);

  if (isComplete) {
    return <Summary total={entries.length} score={score} wrongAnswers={wrongAnswers} onRestart={onRestart} onRetryWrong={onRetryWrong} t={t} />;
  }

  if (!currentEntry) return null;

  const { word, sample } = currentEntry;
  const blankIndex = sample.sentence.indexOf(word.chinese);
  const before = blankIndex >= 0 ? sample.sentence.slice(0, blankIndex) : sample.sentence;
  const after = blankIndex >= 0 ? sample.sentence.slice(blankIndex + word.chinese.length) : '';

  const isAnswered = Boolean(answeredQuestion);
  const selectedAnswer = answeredQuestion?.selectedAnswer ?? null;
  const isLastQuestion = currentIndex === entries.length - 1;

  return (
    <Card ref={cardRef} className="overflow-hidden border-theme-border bg-theme-surface shadow-lg animate-float-in">
      <CardHeader className="space-y-4 border-b border-theme-border bg-theme-surface">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="badge-01">{t.score}: {score.correct}/{score.total}</Badge>
          <Badge variant="badge-01">{currentIndex + 1} / {entries.length}</Badge>
          {isAnswered && (
            <Button className="ml-auto shrink-0" onClick={onNext}>
              {isLastQuestion ? t.viewSummary : t.nextQuestion}
            </Button>
          )}
        </div>
        <CardTitle className="text-2xl font-black text-foreground md:text-3xl">
          {before}
          <span className={cn(
            'mx-1 inline-block min-w-[3ch] rounded-lg border-b-4 px-2 text-center',
            !isAnswered && 'border-primary/40',
            isAnswered && answeredQuestion.isCorrect && 'border-emerald-400 text-emerald-600',
            isAnswered && !answeredQuestion.isCorrect && 'border-rose-400 text-rose-600',
          )}>
            {isAnswered ? word.chinese : '…'}
          </span>
          {after}
        </CardTitle>
        <CardDescription>{sample.pinyin}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 bg-theme-surface p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => {
            const choiceIsCorrect = isAnswered && choice.id === word.id;
            const choiceIsWrongSelection = isAnswered && selectedAnswer === choice.chinese && selectedAnswer !== word.chinese;
            return (
              <BlankChoice
                key={choice.id}
                choice={choice}
                isAnswered={isAnswered}
                isCorrect={choiceIsCorrect}
                isWrongSelection={choiceIsWrongSelection}
                onSelect={() => onAnswer(choice, currentEntry)}
              />
            );
          })}
        </div>
        {isAnswered && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sm">
              {answeredQuestion.isCorrect
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t.correct}</>
                : <><CircleX className="h-4 w-4 text-rose-600" /> {t.correctAnswer}: {word.chinese}</>}
            </span>
            {!answeredQuestion.isCorrect && (
              <Button variant="outline" size="sm" className="gap-2" onClick={onRetryQuestion}>
                <RotateCcw className="h-3.5 w-3.5" /> {t.exercisesTryAgain}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
