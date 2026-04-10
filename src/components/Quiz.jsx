import { memo, useEffect, useRef } from 'react';
import { CheckCircle2, CircleX, Trophy } from 'lucide-react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, getItemMeaning, getSentenceMeaning } from '@/lib/utils';

const choiceLetters = ['A', 'B', 'C', 'D'];

const ChoiceButton = memo(function ChoiceButton({ choice, label, isAnswered, isCorrect, isWrongSelection, onSelect, language }) {
  return (
    <button
      type="button"
      disabled={isAnswered}
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl border px-3 py-2 text-left transition-all duration-200 sm:px-4',
        'bg-white hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-700 dark:border-slate-600',
        isAnswered && 'cursor-default hover:translate-y-0 hover:shadow-none',
        !isAnswered && 'border-slate-200 dark:border-slate-600',
        isCorrect && 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200',
        isWrongSelection && 'border-rose-300 bg-rose-50 ring-2 ring-rose-200 dark:border-rose-700 dark:bg-rose-900/30 dark:ring-rose-800',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-black text-green-700 dark:bg-slate-600 dark:text-slate-100">
          {label}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words font-black text-slate-900 dark:text-white" style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>{choice.chinese}</p>
              {isAnswered ? <p className="text-sm text-slate-500">{getItemMeaning(choice, language)}</p> : null}
            </div>
            {isCorrect ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
            {isWrongSelection ? <CircleX className="h-5 w-5 shrink-0 text-rose-600" /> : null}
          </div>
        </div>
      </div>
    </button>
  );
});

function Summary({ totalQuestions, score, wrongAnswers, onRestart, onRetryWrong, t, language }) {
  const percentage = totalQuestions === 0 ? 0 : Math.round((score.correct / totalQuestions) * 100);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] animate-float-in">
      <Card className="self-start overflow-hidden border-white/60 bg-white/95 shadow-lg dark:border-slate-700/60 dark:bg-slate-800/90">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-500">
            <Trophy className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl font-black">{t.quizSummary}</CardTitle>
          <CardDescription>{t.greatWork}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-3xl bg-green-50/60 p-5 text-center dark:bg-slate-700">
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{score.correct} / {totalQuestions}</p>
            <p className="mt-2 text-lg font-semibold text-green-700">{percentage}% {t.correct}</p>
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

      <Card className="overflow-hidden border-white/60 bg-white/95 shadow-lg dark:border-slate-700/60 dark:bg-slate-800/90">
        <CardHeader>
          <CardTitle className="text-2xl font-black">{t.reviewWrongAnswers} ({wrongAnswers.length})</CardTitle>
          <CardDescription>{t.revisitWords}</CardDescription>
        </CardHeader>
        <CardContent>
          {wrongAnswers.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-800">
              {t.perfectScore}
            </div>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              {wrongAnswers.map(({ item, selectedAnswer }) => (
                <div key={`${item.id}-${selectedAnswer}`} className="rounded-3xl border border-green-100 bg-green-50/40 p-4 dark:border-slate-600 dark:bg-slate-700">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {item.pinyin} <span className="font-medium text-slate-500">({getItemMeaning(item, language)})</span>
                  </p>
                  <div className="mt-3 grid gap-2 text-sm sm:text-base">
                    <p className="text-rose-600 line-through dark:text-rose-400">{t.wrongAnswer}: {selectedAnswer}</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">{t.correctAnswer}: {item.chinese}</p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-600">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{item.sentenceChinese}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{getSentenceMeaning(item, language)}</p>
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

export default function Quiz({
  vocabulary,
  allChoices,
  currentIndex,
  answeredQuestion,
  onAnswer,
  onNext,
  score,
  isComplete,
  wrongAnswers,
  onRestart,
  onRetryWrong,
  language = 'en',
  deckLabel,
  t,
}) {
  const cardRef = useRef(null);
  const currentItem = vocabulary[currentIndex];
  const choices = allChoices?.[currentIndex] ?? [];

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentIndex]);

  if (isComplete) {
    return <Summary totalQuestions={vocabulary.length} score={score} wrongAnswers={wrongAnswers} onRestart={onRestart} onRetryWrong={onRetryWrong} t={t} language={language} />;
  }

  if (!currentItem) return null;

  const selectedAnswer = answeredQuestion?.selectedAnswer ?? null;
  const isAnswered = Boolean(answeredQuestion);
  const isCorrect = answeredQuestion?.isCorrect;
  const isLastQuestion = currentIndex === vocabulary.length - 1;

  return (
    <Card ref={cardRef} className="overflow-hidden border-[#CAE8BD] bg-[#ECFAE5] shadow-lg animate-float-in dark:border-slate-700/60 dark:bg-slate-800/90">
      <CardHeader className="space-y-5 border-b border-[#CAE8BD] bg-[#ECFAE5] dark:border-slate-700 dark:bg-slate-800/70">
        {/* Row 1: status + actions */}
        {/* Row 1: score + counter + ? */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-100/70 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-slate-700 dark:text-slate-300">{t.score}: {score.correct}/{score.total}</span>
          <div className="rounded-full bg-green-100/70 px-4 py-1.5 text-sm font-semibold text-green-700 dark:bg-slate-700 dark:text-slate-300">
            {currentIndex + 1} / {vocabulary.length}
          </div>
          <div className="group relative ml-auto">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500 hover:bg-green-200 hover:text-green-700 dark:bg-slate-600 dark:text-slate-400 dark:hover:bg-slate-500"
              aria-label="How to use"
            >
              ?
            </button>
            <div className="pointer-events-none absolute right-0 top-10 z-10 w-56 rounded-2xl border border-green-100 bg-white p-3 text-xs text-slate-600 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="text-slate-600 dark:text-slate-300">Choose 1 of 4 answers that matches the pinyin &amp; meaning shown.</p>
            </div>
          </div>
        </div>

        {/* Row 2: pinyin + speak */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <CardTitle className="truncate text-3xl font-black text-green-700 dark:text-primary md:text-4xl">{currentItem.pinyin}</CardTitle>
            <SpeakButton text={currentItem.chinese} label={t.speakQuizAnswer} size="icon" variant="ghost" />
          </div>
          {isAnswered && (
            <Button className="hidden shrink-0 sm:flex" onClick={onNext}>{isLastQuestion ? t.viewSummary : t.nextQuestion}</Button>
          )}
        </div>

        {/* Row 3: meaning */}
        <CardDescription className="text-base">{getItemMeaning(currentItem, language)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 bg-[#ECFAE5] p-4 sm:p-6 dark:bg-slate-800/90">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {choices.map((choice, index) => {
            const choiceIsCorrect = isAnswered && choice.id === currentItem.id;
            const choiceIsWrongSelection = isAnswered && selectedAnswer === choice.chinese && selectedAnswer !== currentItem.chinese;

            return (
              <ChoiceButton
                key={choice.id}
                label={choiceLetters[index] || String(index + 1)}
                choice={choice}
                isAnswered={isAnswered}
                isCorrect={choiceIsCorrect}
                isWrongSelection={choiceIsWrongSelection}
                onSelect={() => onAnswer(choice)}
                language={language}
              />
            );
          })}
        </div>

        {isAnswered && (
          <Button className="w-full sm:hidden" onClick={onNext}>{isLastQuestion ? t.viewSummary : t.nextQuestion}</Button>
        )}
      </CardContent>
    </Card>
  );
}
