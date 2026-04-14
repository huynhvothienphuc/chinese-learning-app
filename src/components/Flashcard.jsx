import { Heart, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import SpeakButton from '@/components/SpeakButton';
import ToggleSwitch from '@/components/ToggleSwitch';
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
  const [showDetails, setShowDetails] = useState(false);
  const showPinyin = showDetails;
  const showMeaning = showDetails;

  useEffect(() => {
    setShowDetails(false);
  }, [item?.id]);

  if (!item) {
    return (
      <div className="rounded-3xl border bg-white p-10 text-center shadow-md dark:bg-slate-800">
        <p className="text-muted-foreground">—</p>
      </div>
    );
  }

  const meaning = getItemMeaning(item, language);
  const sentenceMeaning = getSentenceMeaning(item, language);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 rounded-3xl border border-theme-border bg-theme-surface px-3 py-3 shadow-soft dark:bg-slate-800/85 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleSwitch
            checked={showDetails}
            onChange={setShowDetails}
            label={t.showPinyin}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-green-50 dark:bg-slate-800 dark:text-slate-300 md:h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'h-10 gap-2 px-3 md:h-9',
              isFavorite && 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
            )}
            aria-label={isFavorite ? t.removeFavorite : t.addFavorite}
            title={isFavorite ? t.removeFavorite : t.addFavorite}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite?.();
              event.currentTarget.blur();
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
            className={cn(
              'h-10 gap-2 px-3 md:h-9',
              isShuffled && 'border-emerald-200 bg-emerald-50 text-emerald-700',
            )}
            aria-label={isShuffled ? t.resetOrder : t.mix}
            title={isShuffled ? t.resetOrder : t.mix}
            onClick={(event) => {
              event.stopPropagation();
              onShuffle?.();
              event.currentTarget.blur();
            }}
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">{isShuffled ? t.resetOrder : t.mix}</span>
          </Button>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? t.tapAgainToFlipBack : t.tapToFlip}
        className="flashcard-scene block h-[380px] w-full cursor-pointer text-left focus:outline-none sm:h-[500px] lg:h-[560px]"
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onFlip();
          }
        }}
      >
        <div className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
          <Card className="flashcard-face flashcard-front rounded-[2rem] border-theme-border bg-background shadow-xl">
            <div className="relative flex h-full flex-col items-center justify-center px-4 text-center sm:px-8">
              <div className="flex max-w-full flex-wrap items-center justify-center gap-3">
                <div className={cn('break-words text-5xl font-black text-slate-900 dark:text-slate-100 sm:text-7xl md:text-8xl', !flipped && 'animate-text-zoom')}>{item.chinese}</div>
                <SpeakButton text={item.chinese} label={t.speakWord} size="icon" variant="outline" className="shrink-0" />
              </div>
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.tapToFlip}</p>
              <p className="mt-3 hidden text-xs font-medium tracking-[0.02em] text-slate-400 dark:text-slate-500 md:block">
                {t.keyboardHintPrefix}{' '}
                <span>[{t.previous} <span className="px-1 font-semibold">←</span>]</span>{' '}
                <span>[{t.next} <span className="px-1 font-semibold">→</span>]</span>{' '}
                <span>[{t.flipLabel} <span className="px-1 font-semibold">↑</span>]</span>
              </p>
            </div>
          </Card>

          <Card className="flashcard-face flashcard-back rounded-[2rem] border-theme-border bg-theme-surface shadow-xl">
            <div className="flex h-full flex-col gap-4 p-4 sm:p-6 md:p-8">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="break-words text-3xl font-black text-slate-800 sm:text-5xl dark:text-slate-100">{item.chinese}</h3>
                    <SpeakButton text={item.chinese} label={t.speakWord} size="icon" variant="outline" className="shrink-0" />
                  </div>
                  {showPinyin ? <p className="mt-2 break-words text-lg font-medium text-slate-600 sm:text-xl dark:text-slate-300">{item.pinyin}</p> : null}
                  {showMeaning ? <p className="mt-3 break-words text-lg font-medium text-slate-700 sm:text-xl dark:text-slate-200">{meaning}</p> : null}
                </div>

                {item.samples?.length > 0 ? (
                  <div className="rounded-3xl border border-theme-border bg-background p-4 sm:p-5 dark:bg-card">
                    <div className="space-y-4">
                      {item.samples.slice(0, 2).map((ex, i) => (
                        <div key={i} className={i > 0 ? 'border-t border-theme-border pt-4 dark:border-slate-600' : ''}>
                          {ex.type && (
                            <span className="mb-1.5 inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                              {ex.type}
                            </span>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <p className="break-words text-2xl font-black text-slate-800 sm:text-3xl dark:text-slate-100">
                              {ex.sentence.split(item.chinese).map((part, j, arr) => (
                                <span key={j}>
                                  {part}
                                  {j < arr.length - 1 && (
                                    <mark className="rounded bg-primary/20 px-0.5 text-primary not-italic dark:bg-primary/30 dark:text-primary-foreground">
                                      {item.chinese}
                                    </mark>
                                  )}
                                </span>
                              ))}
                            </p>
                            <SpeakButton text={ex.sentence} label={t.speakSentence} size="icon" variant="outline" />
                          </div>
                          {showPinyin && ex.pinyin ? <p className="mt-1 break-words text-slate-500 dark:text-slate-400">{ex.pinyin}</p> : null}
                          <p className="mt-2 break-words text-slate-600 dark:text-slate-300">
                            {language === 'vi' ? (ex.vi || ex.en) : (ex.en || ex.vi)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-theme-border bg-background p-4 sm:p-5 dark:bg-card">
                    <div className="space-y-3 text-sm sm:text-base md:text-lg">
                      <div className="flex items-start justify-between gap-2">
                        <p className="break-words text-2xl font-black text-slate-800 sm:text-3xl dark:text-slate-100">{item.sentenceChinese}</p>
                        <SpeakButton text={item.sentenceChinese} label={t.speakSentence} size="icon" variant="outline" />
                      </div>
                      {item.sentencePinyin && showPinyin ? <p className="break-words text-slate-500 dark:text-slate-400">{item.sentencePinyin}</p> : null}
                      <p className="break-words border-t border-theme-border pt-3 text-slate-600 dark:border-slate-600 dark:text-slate-300">{sentenceMeaning}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center">
                <p className="mx-auto max-w-full px-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{t.tapAgainToFlipBack}</p>
                <p className="hidden text-xs font-medium tracking-[0.02em] text-slate-400 dark:text-slate-500 md:block">
                  {t.keyboardHintPrefix}{' '}
                  <span>[{t.previous} <span className="px-1 font-semibold">←</span>]</span>{' '}
                  <span>[{t.next} <span className="px-1 font-semibold">→</span>]</span>{' '}
                  <span>[{t.flipLabel} <span className="px-1 font-semibold">↑</span>]</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
