import { useMemo } from 'react';
import { CheckCircle2, CircleX, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buildQuizChoices, cn } from '@/lib/utils';
import SpeakButton from "@/components/SpeakButton";
function ChoiceButton({ choice, isAnswered, isCorrect, isWrongSelection, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isAnswered}
      className={cn(
        'w-full rounded-2xl border px-4 py-4 text-left text-lg font-semibold transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md disabled:cursor-default',
        !isAnswered && 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50',
        isCorrect && 'border-emerald-500 bg-emerald-50 text-emerald-900',
        isWrongSelection && 'border-rose-500 bg-rose-50 text-rose-900',
        isAnswered && !isCorrect && !isWrongSelection && 'border-slate-200 bg-slate-50 text-slate-500',
      )}
    >
      {choice.chinese}
    </button>
  );
}

function Summary({ totalQuestions, score, wrongAnswers, onRestart }) {
  const percentage = totalQuestions ? Math.round((score.correct / totalQuestions) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[256px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-amber-500" />
            Quiz Summary
          </CardTitle>
          <CardDescription>Great work finishing the full section.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl bg-slate-50 p-5 text-center">
            <p className="text-4xl font-black text-slate-900">{score.correct} / {totalQuestions}</p>
            <p className="mt-2 text-lg font-semibold text-blue-600">{percentage}% Correct</p>
          </div>
          <Button className="w-full" onClick={onRestart}>
            Start New Quiz
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Wrong Answers ({wrongAnswers.length})</CardTitle>
          <CardDescription>Go over the words that need a little more practice.</CardDescription>
        </CardHeader>
        <CardContent>
          {wrongAnswers.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
              Perfect Score! No wrong answers!
            </div>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
              {wrongAnswers.map(({ item, selectedAnswer }) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-bold text-slate-900">
                    {item.pinyin} <span className="font-medium text-slate-500">({item.english})</span>
                  </p>
                  <div className="mt-3 grid gap-2 text-sm md:text-base">
                    <p className="text-rose-600 line-through">Wrong answer: {selectedAnswer}</p>
                    <p className="font-bold text-emerald-700">Correct answer: {item.chinese}</p>
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
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
}) {
  const currentItem = vocabulary[currentIndex];
  const choices = useMemo(() => {
    if (!currentItem) {
      return [];
    }
    return buildQuizChoices(vocabulary, currentItem);
  }, [currentItem, vocabulary]);

  if (isComplete) {
    return (
      <Summary
        totalQuestions={vocabulary.length}
        score={score}
        wrongAnswers={wrongAnswers}
        onRestart={onRestart}
      />
    );
  }

  if (!currentItem) {
    return null;
  }

  const selectedAnswer = answeredQuestion?.selectedAnswer ?? null;
  const isAnswered = Boolean(answeredQuestion);
  const isCorrect = answeredQuestion?.isCorrect;
  const isLastQuestion = currentIndex === vocabulary.length - 1;

  return (
    <Card className="animate-float-in">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-black text-blue-600 md:text-4xl">{currentItem.pinyin}</CardTitle>
            <CardDescription className="mt-2 text-base">({currentItem.english})</CardDescription>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            {currentIndex + 1} / {vocabulary.length}
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{currentItem.pinyin}</div>
              <div className="text-sm text-muted-foreground">({currentItem.english})</div>
            </div>

            <SpeakButton text={currentItem.chinese} label="Speak answer" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3">
          {choices.map((choice) => {
            const choiceIsCorrect = isAnswered && choice.id === currentItem.id;
            const choiceIsWrongSelection =
              isAnswered && selectedAnswer === choice.chinese && selectedAnswer !== currentItem.chinese;

            return (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                isAnswered={isAnswered}
                isCorrect={choiceIsCorrect}
                isWrongSelection={choiceIsWrongSelection}
                onSelect={() => onAnswer(choice)}
              />
            );
          })}
        </div>

        {isAnswered && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div
              className={cn(
                'flex items-center gap-2 text-lg font-bold',
                isCorrect ? 'text-emerald-700' : 'text-rose-700',
              )}
            >
              {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <CircleX className="h-5 w-5" />}
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="font-semibold text-slate-900">{currentItem.sentenceChinese}</p>
              <p className="mt-1 text-slate-600">{currentItem.sentencePinyin}</p>
              <p className="mt-1 text-sm text-slate-500">{currentItem.sentenceEnglish}</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={onNext}>{isLastQuestion ? 'View Summary' : 'Next Question'}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
