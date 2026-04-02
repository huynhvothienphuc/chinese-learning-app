import { useMemo } from 'react';
import { CheckCircle2, CircleX, Heart, Trophy } from 'lucide-react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildQuizChoices, cn, getItemMeaning, getSentenceMeaning } from '@/lib/utils';

const choiceLetters = ['A', 'B', 'C', 'D'];

function ChoiceButton({ choice, label, isAnswered, isCorrect, isWrongSelection, onSelect, language }) {
  return (
    <button
      type="button"
      disabled={isAnswered}
      onClick={onSelect}
      className={cn(
        'w-full rounded-3xl border px-4 py-4 text-left transition-all duration-200 sm:px-5',
        'bg-white hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-700 dark:border-slate-600',
        isAnswered && 'cursor-default hover:translate-y-0 hover:shadow-none',
        !isAnswered && 'border-slate-200 dark:border-slate-600',
        isCorrect && 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200',
        isWrongSelection && 'border-rose-300 bg-rose-50 ring-2 ring-rose-200 dark:border-rose-700 dark:bg-rose-900/30 dark:ring-rose-800',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700 dark:bg-slate-600 dark:text-slate-100">
          {label}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">{choice.chinese}</p>
              {isAnswered ? <p className="mt-1 text-sm text-slate-500">{getItemMeaning(choice, language)}</p> : null}
            </div>
            {isCorrect ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" /> : null}
            {isWrongSelection ? <CircleX className="mt-1 h-5 w-5 shrink-0 text-rose-600" /> : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function Summary({ totalQuestions, score, wrongAnswers, onRestart, t, language }) {
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
          <div className="rounded-3xl bg-indigo-50/60 p-5 text-center dark:bg-slate-700">
            <p className="text-4xl font-black text-slate-900 dark:text-slate-100">{score.correct} / {totalQuestions}</p>
            <p className="mt-2 text-lg font-semibold text-blue-600">{percentage}% {t.correct}</p>
          </div>
          <Button className="w-full" onClick={onRestart}>
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
                <div key={`${item.id}-${selectedAnswer}`} className="rounded-3xl border border-violet-100 bg-violet-50/40 p-4 dark:border-slate-600 dark:bg-slate-700">
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
  choicePool,
  currentIndex,
  answeredQuestion,
  onAnswer,
  onNext,
  score,
  isComplete,
  wrongAnswers,
  onRestart,
  isFavorite,
  onToggleFavorite,
  language = 'en',
  deckSource = 'all',
  t,
}) {
  const currentItem = vocabulary[currentIndex];
  const choices = useMemo(() => {
    if (!currentItem) return [];
    return buildQuizChoices(choicePool || vocabulary, currentItem);
  }, [currentItem, vocabulary, choicePool]);

  if (isComplete) {
    return <Summary totalQuestions={vocabulary.length} score={score} wrongAnswers={wrongAnswers} onRestart={onRestart} t={t} language={language} />;
  }

  if (!currentItem) return null;

  const selectedAnswer = answeredQuestion?.selectedAnswer ?? null;
  const isAnswered = Boolean(answeredQuestion);
  const isCorrect = answeredQuestion?.isCorrect;
  const isLastQuestion = currentIndex === vocabulary.length - 1;

  return (
    <Card className="overflow-hidden border-white/60 bg-white/95 shadow-lg animate-float-in dark:border-slate-700/60 dark:bg-slate-800/90">
      <CardHeader className="space-y-5 border-b border-slate-100 bg-white/80 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-blue-900/40 dark:text-blue-300">{t.quizInstructionLabel}</span>
          <span className="rounded-full bg-violet-100/70 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-slate-700 dark:text-slate-300">{deckSource === 'favorites' ? t.sourceFavoriteWords : t.sourceAllWords}</span>
          <span className="rounded-full bg-violet-100/70 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-slate-700 dark:text-slate-300">{t.score}: {score.correct}/{score.total}</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">{t.quizTab}</p>
              <CardTitle className="mt-3 text-3xl font-black text-blue-600 md:text-4xl">{currentItem.pinyin}</CardTitle>
              <CardDescription className="mt-2 text-base">{getItemMeaning(currentItem, language)}</CardDescription>
            </div>
            <p className="text-sm text-slate-500">{t.quizInstructionText}</p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <div className="rounded-full bg-violet-100/70 px-4 py-2 text-sm font-semibold text-violet-600 dark:bg-slate-700 dark:text-slate-300">
              {currentIndex + 1} / {vocabulary.length}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(isFavorite && 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400')}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? t.removeFavorite : t.addFavorite}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </Button>
            <SpeakButton text={currentItem.chinese} label={t.speakQuizAnswer} size="icon" variant="outline" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4 sm:p-6">
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

        {isAnswered ? (
          <div className="space-y-4 rounded-3xl border border-violet-100 bg-violet-50/40 p-5 dark:border-slate-600 dark:bg-slate-700/50">
            <div className={cn('flex items-center gap-2 text-lg font-bold', isCorrect ? 'text-emerald-700' : 'text-rose-700')}>
              {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <CircleX className="h-5 w-5" />}
              {isCorrect ? t.correct : t.incorrect}
            </div>

            <div className="rounded-2xl bg-white p-4 dark:bg-slate-700">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{t.exampleSentence}</p>
                <SpeakButton text={currentItem.sentenceChinese} label={t.speakSentence} size="icon" variant="secondary" />
              </div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 break-words">{currentItem.sentenceChinese}</p>
              <p className="mt-1 text-sm text-slate-500 break-words">{getSentenceMeaning(currentItem, language)}</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={onNext}>{isLastQuestion ? t.viewSummary : t.nextQuestion}</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
