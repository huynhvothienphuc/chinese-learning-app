import { Heart } from 'lucide-react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Flashcard({ item, flipped, onFlip, isFavorite = false, onToggleFavorite }) {
  if (!item) {
    return (
      <Card className="p-10 text-center text-slate-500">
        <p>No card available.</p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-5xl animate-float-in">
      <button
        type="button"
        className="flashcard-scene h-[400px] w-full text-left outline-none sm:h-[430px]"
        onClick={onFlip}
        aria-label="Flip flashcard"
      >
        <div className={cn('flashcard-inner h-full w-full', flipped && 'is-flipped')}>
          <Card className="flashcard-face flashcard-front flex h-full flex-col overflow-hidden border-blue-200 bg-white/95 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Flashcard</p>
                <p className="mt-1 text-sm text-slate-500">Tap or press space to flip</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(isFavorite && 'border-rose-200 bg-rose-50 text-rose-600')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavorite?.();
                  }}
                  aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                </Button>
                <SpeakButton text={item.chinese} label="Speak word" size="icon" variant="outline" />
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <h2 className="animate-pulse-soft text-6xl font-black tracking-wide text-slate-900 sm:text-7xl md:text-8xl">
                {item.chinese}
              </h2>
              <p className="mt-6 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600">
                Click to flip
              </p>
            </div>
          </Card>

          <Card className="flashcard-face flashcard-back flex h-full flex-col justify-between overflow-hidden border-blue-400 bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 p-5 text-white shadow-xl sm:p-7">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">Pronunciation</p>
                  <h3 className="mt-2 text-4xl font-black text-white sm:text-5xl">{item.chinese}</h3>
                  <p className="mt-2 text-2xl font-bold text-blue-50 sm:text-3xl">{item.pinyin}</p>
                  <p className="mt-3 text-lg font-medium text-blue-100">{item.english}</p>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className={cn('rounded-full', isFavorite && 'bg-rose-100 text-rose-600')}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite?.();
                    }}
                    aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                  >
                    <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                  </Button>
                  <SpeakButton text={item.chinese} label="Speak word" size="icon" variant="secondary" />
                </div>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">Example sentence</p>
                  <SpeakButton text={item.sentenceChinese} label="Speak sentence" size="icon" variant="secondary" />
                </div>
                <div className="space-y-3 text-sm sm:text-base md:text-lg">
                  <p className="font-semibold">{item.sentenceChinese}</p>
                  <p className="text-blue-100">{item.sentencePinyin}</p>
                  <p className="border-t border-white/20 pt-3 text-blue-50">{item.sentenceEnglish}</p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-blue-100/90">Tap the card again to flip back</p>
          </Card>
        </div>
      </button>
    </div>
  );
}
