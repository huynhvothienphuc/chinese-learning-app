import { useMemo } from 'react';
import { CheckCircle2, CircleX, Heart, Trophy } from 'lucide-react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildQuizChoices, cn } from '@/lib/utils';

const choiceLetters = ['A', 'B', 'C', 'D'];

function ChoiceButton({ choice, label, isAnswered, isCorrect, isWrongSelection, onSelect }) {
  return (
    <button
      type="button"
      disabled={isAnswered}
      onClick={onSelect}
      className={cn(
        'w-full rounded-3xl border px-4 py-4 text-left transition-all duration-200 sm:px-5',
        'bg-white hover:-translate-y-0.5 hover:shadow-md',
        isAnswered && 'cursor-default hover:translate-y-0 hover:shadow-none',
        !isAnswered && 'border-slate-200',
        isCorrect && 'border-emerald-300 bg-emerald-50',
        isWrongSelection && 'border-rose-300 bg-rose-50',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
          {label}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-slate-900 sm:text-xl">{choice.chinese}</p>
              {isAnswered ? <p className="mt-1 text-sm text-slate-500">({choice.english})</p> : null}
            </div>
            {isCorrect ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" /> : null}
            {isWrongSelection ? <CircleX className="mt-1 h-5 w-5 shrink-0 text-rose-600" /> : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function Summary({ totalQuestions, score, wrongAnswers, onRestart }) {
  const percentage = totalQuestions === 0 ? 0 : Math.round((score.correct / totalQuestions) * 100);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] animate-float-in">
      <Card className="self-start overflow-hidden border-white/60 bg-white/95 shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-amber-100 p-3 text-amber-500">
            <Trophy className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-2xl font-black">Quiz Summary</CardTitle>
          <CardDescription>Great work finishing the section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-3xl bg-slate-50 p-5 text-center">
            <p className="text-4xl font-black text-slate-900">{score.correct} / {totalQuestions}</p>
            <p className="mt-2 text-lg font-semibold text-blue-600">{percentage}% Correct</p>
          </div>
          <Button className="w-full" onClick={onRestart}>
            Start New Quiz
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/60 bg-white/95 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Review Wrong Answers ({wrongAnswers.length})</CardTitle>
          <CardDescription>Revisit the words that need a little more practice.</CardDescription>
        </CardHeader>
        <CardContent>
          {wrongAnswers.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-800">
              Perfect Score! No wrong answers!
            </div>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              {wrongAnswers.map(({ item, selectedAnswer }) => (
                <div key={`${item.id}-${selectedAnswer}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-bold text-slate-900">
                    {item.pinyin} <span className="font-medium text-slate-500">({item.english})</span>
                  </p>
                  <div className="mt-3 grid gap-2 text-sm sm:text-base">
                    <p className="text-rose-600 line-through">Wrong answer: {selectedAnswer}</p>
                    <p className="font-bold text-emerald-700">Correct answer: {item.chinese}</p>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-900">{item.sentenceChinese}</p>
                    <p className="text-slate-600">{item.sentencePinyin}</p>
                    <p className="text-sm text-slate-500">{item.sentenceEnglish}</p>
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
}) {
  const currentItem = vocabulary[currentIndex];
  const choices = useMemo(() => {
    if (!currentItem) return [];
    return buildQuizChoices(vocabulary, currentItem);
  }, [currentItem, vocabulary]);

  if (isComplete) {
    return <Summary totalQuestions={vocabulary.length} score={score} wrongAnswers={wrongAnswers} onRestart={onRestart} />;
  }

  if (!currentItem) return null;

  const selectedAnswer = answeredQuestion?.selectedAnswer ?? null;
  const isAnswered = Boolean(answeredQuestion);
  const isCorrect = answeredQuestion?.isCorrect;
  const isLastQuestion = currentIndex === vocabulary.length - 1;

  return (
    <Card className="overflow-hidden border-white/60 bg-white/95 shadow-lg animate-float-in">
      <CardHeader className="space-y-4 border-b border-slate-100 bg-white/80">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Multiple choice</p>
            <CardTitle className="mt-3 text-3xl font-black text-blue-600 md:text-4xl">{currentItem.pinyin}</CardTitle>
            <CardDescription className="mt-2 text-base">({currentItem.english})</CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start">
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              {currentIndex + 1} / {vocabulary.length}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(isFavorite && 'border-rose-200 bg-rose-50 text-rose-600')}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </Button>
            <SpeakButton text={currentItem.chinese} label="Speak quiz answer" size="icon" variant="outline" />
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
              />
            );
          })}
        </div>

        {isAnswered ? (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className={cn('flex items-center gap-2 text-lg font-bold', isCorrect ? 'text-emerald-700' : 'text-rose-700')}>
              {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <CircleX className="h-5 w-5" />}
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </div>

            <div className="rounded-2xl bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">Example sentence</p>
                <SpeakButton text={currentItem.sentenceChinese} label="Speak quiz sentence" size="icon" variant="secondary" />
              </div>
              <p className="font-semibold text-slate-900">{currentItem.sentenceChinese}</p>
              <p className="mt-1 text-slate-600">{currentItem.sentencePinyin}</p>
              <p className="mt-1 text-sm text-slate-500">{currentItem.sentenceEnglish}</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={onNext}>{isLastQuestion ? 'View Summary' : 'Next Question'}</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
