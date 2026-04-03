import { Eye, EyeOff, Heart, Languages, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, getItemMeaning, getSentenceMeaning } from '@/lib/utils';

export default function Flashcard({
  item,
  flipped,
  onFlip,
  isFavorite = false,
  onToggleFavorite,
  language = 'en',
  canShuffle = false,
  isShuffled = false,
  onShuffle,
  t,
}) {
  const [showPinyin, setShowPinyin] = useState(false);
  const [showMeaning, setShowMeaning] = useState(true);

  useEffect(() => {
    setShowMeaning(true);
  }, [item?.id]);

  if (!item) {
    return (
      <div className="rounded-3xl border bg-white p-10 text-center shadow-md dark:border-slate-700 dark:bg-slate-800">
        <p className="text-muted-foreground">—</p>
      </div>
    );
  }

  const meaning = getItemMeaning(item, language);
  const sentenceMeaning = getSentenceMeaning(item, language);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 rounded-3xl border border-[#CAE8BD] bg-[#ECFAE5] px-4 py-3 shadow-soft dark:border-slate-700/60 dark:bg-slate-800/85">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(event) => {
            event.stopPropagation();
            setShowPinyin((prev) => !prev);
          }}
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{showPinyin ? t.hidePinyin : t.showPinyin}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={(event) => {
            event.stopPropagation();
            setShowMeaning((prev) => !prev);
          }}
        >
          {showMeaning ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{showMeaning ? t.hideMeaning : t.showMeaning}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-2', isFavorite && 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400')}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.();
          }}
        >
          <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
          <span className="hidden sm:inline">{isFavorite ? t.savedWords : t.addFavorite}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canShuffle}
          className={cn('gap-2', isShuffled && 'border-emerald-200 bg-emerald-50 text-emerald-700')}
          onClick={(event) => {
            event.stopPropagation();
            onShuffle?.();
          }}
        >
          <Shuffle className="h-4 w-4" />
          <span className="hidden sm:inline">{isShuffled ? t.resetOrder : t.mix}</span>
        </Button>
      </div>

      <div
        role="button"
        tabIndex={0}
        className="flashcard-scene block h-[380px] w-full cursor-pointer text-left focus:outline-none sm:h-[460px] lg:h-[520px]"
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onFlip();
          }
        }}
      >
        <div className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
          <Card className="flashcard-face flashcard-front rounded-[2rem] border-[#CAE8BD] bg-[#ECFAE5] shadow-xl dark:border-slate-700/60 dark:bg-slate-800">
            <div className="relative flex h-full flex-col items-center justify-center px-6 text-center sm:px-8">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-3">
                <div className={cn('break-words text-6xl font-black text-slate-900 dark:text-slate-100 sm:text-7xl md:text-8xl', !flipped && 'animate-text-zoom')}>{item.chinese}</div>
                <SpeakButton text={item.chinese} label={t.speakWord} size="icon" variant="outline" className="shrink-0" />
              </div>
              {showPinyin ? <p className="mt-4 text-xl font-medium text-slate-500 sm:text-2xl">{item.pinyin}</p> : null}
              {showMeaning ? <p className="mt-4 max-w-2xl text-lg font-medium text-slate-700 dark:text-slate-200 sm:text-2xl">{meaning}</p> : null}
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.tapToFlip}</p>
            </div>
          </Card>

          <Card className="flashcard-face flashcard-back rounded-[2rem] border-[#CAE8BD] bg-[#DDF6D2] shadow-xl dark:border-slate-700/60 dark:bg-slate-800">
            <div className="flex h-full flex-col justify-between gap-5 p-5 sm:p-6 md:p-8">
              <div className="min-h-0 space-y-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="break-words text-4xl font-black text-slate-800 sm:text-5xl dark:text-slate-100">{item.chinese}</h3>
                    <SpeakButton text={item.chinese} label={t.speakWord} size="icon" variant="outline" className="shrink-0" />
                  </div>
                  {showPinyin ? <p className="mt-2 break-words text-lg font-medium text-slate-600 sm:text-xl dark:text-slate-300">{item.pinyin}</p> : null}
                  {showMeaning ? <p className="mt-3 break-words text-lg font-medium text-slate-700 sm:text-xl dark:text-slate-200">{meaning}</p> : null}
                </div>

                <div className="rounded-3xl border border-[#CAE8BD] bg-[#ECFAE5] p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-700/50">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700 dark:text-slate-300">{t.exampleSentence}</p>
                    <SpeakButton text={item.sentenceChinese} label={t.speakSentence} size="icon" variant="outline" />
                  </div>
                  <div className="space-y-3 text-sm sm:text-base md:text-lg">
                    <p className="break-words font-semibold text-slate-800 dark:text-slate-100">{item.sentenceChinese}</p>
                    {item.sentencePinyin && showPinyin ? <p className="break-words text-slate-500 dark:text-slate-400">{item.sentencePinyin}</p> : null}
                    <p className="break-words border-t border-[#CAE8BD] pt-3 text-slate-600 dark:border-slate-600 dark:text-slate-300">{sentenceMeaning}</p>
                  </div>
                </div>
              </div>

              <p className="mx-auto max-w-full px-2 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{t.tapAgainToFlipBack}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
