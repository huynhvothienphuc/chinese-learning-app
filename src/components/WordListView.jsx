import { Check, ChevronDown, Copy, Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import SpeakButton from '@/components/SpeakButton';
import ToggleSwitch from '@/components/ToggleSwitch';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn, getItemMeaning, getSentenceMeaning, matchesVocabQuery } from '@/lib/utils';
import { useSettingsStore } from '@/store/settingsStore';
export default function WordListView({ vocabulary, isFavorite, onToggleFavorite, language, t }) {
  const { showSimplified } = useSettingsStore();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const showPinyin = showDetails;
  const showMeaning = showDetails;

  useEffect(() => {
    if (!copiedId) return undefined;
    const timeoutId = window.setTimeout(() => setCopiedId(null), 1200);
    return () => window.clearTimeout(timeoutId);
  }, [copiedId]);

  async function handleCopyWord(event, item) {
    event.stopPropagation();
    if (!item?.chinese) return;

    try {
      await navigator.clipboard.writeText(item.chinese);
      setCopiedId(item.id ?? item.chinese);
    } catch {
      setCopiedId(null);
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const displayed = useMemo(() => {
    const base = filter === 'favorites' ? vocabulary.filter((item) => isFavorite(item)) : vocabulary;
    return base.filter((item) => matchesVocabQuery(item, searchQuery));
  }, [vocabulary, filter, searchQuery, isFavorite]);

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <Card className="border-theme-border bg-theme-surface shadow-soft">
        <CardContent className="p-8 text-center text-muted-foreground">{t.noData}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-theme-border bg-theme-surface shadow-soft">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t.searchLessonWordsPlaceholder}
            aria-label={t.searchLessonWordsPlaceholder}
            className="w-[220px] max-w-full py-1.5 transition-all duration-200 focus-visible:w-[280px]"
          />
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-2xl px-4 py-1.5 text-sm font-semibold transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-primary/10',
            )}
          >
            {t.sourceAllWords}
          </button>
          <button
            type="button"
            onClick={() => setFilter('favorites')}
            className={cn(
              'flex items-center gap-1.5 rounded-2xl px-4 py-1.5 text-sm font-semibold transition-colors',
              filter === 'favorites'
                ? 'bg-rose-500 text-white'
                : 'bg-background text-foreground hover:bg-rose-50 dark:hover:bg-rose-900/20',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', filter === 'favorites' && 'fill-current')} />
            <span className="hidden sm:inline">{t.favoriteList}</span>
          </button>
          <ToggleSwitch
            checked={showDetails}
            onChange={setShowDetails}
            label={t.showPinyin}
            className="rounded-2xl bg-background px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-primary/10"
          />
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            {normalizedQuery ? t.noLessonWordsMatch : t.noFavorites}
          </div>
        ) : (
          <div>
            {/* Header — desktop only */}
            <div className={cn(
              'mb-1 hidden sm:grid items-center gap-x-3 px-3 py-1',
              'text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border',
              showSimplified
                ? 'sm:grid-cols-[1.5rem_minmax(4rem,10rem)_minmax(0,1fr)_minmax(0,3fr)_minmax(4rem,8rem)_auto]'
                : 'sm:grid-cols-[1.5rem_minmax(4rem,10rem)_minmax(0,1fr)_minmax(0,3fr)_auto]',
            )}>
              <span className="text-center">#</span>
              <span>{t.curriculumColChinese ?? 'Chinese'}</span>
              <span>{t.curriculumColPinyin ?? 'Pinyin'}</span>
              <span>{language === 'vi' ? (t.curriculumColVietnamese ?? 'Vietnamese') : (t.curriculumColEnglish ?? 'English')}</span>
              {showSimplified && <span>Simplified</span>}
              <span className="shrink-0 w-[11.75rem]" />
            </div>
          <div className="space-y-2">
            {displayed.map((item, index) => {
              const favorited = isFavorite(item);
              const meaning = getItemMeaning(item, language);
              const id = item.id ?? index;
              const copyId = item.id ?? item.chinese;
              const isCopied = copiedId === copyId;
              const expanded = expandedId === id;
              const sentenceMeaning = getSentenceMeaning(item, language);
              return (
                <div
                  key={id}
                  className={cn(
                    'overflow-hidden rounded-2xl border-2 transition-colors',
                    expanded
                      ? 'border-primary/40 bg-card shadow-sm'
                      : 'border-transparent bg-card ring-1 ring-border',
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(expanded ? null : id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expanded ? null : id); } }}
                    className={cn(
                      'grid w-full cursor-pointer items-center gap-x-3 px-3 py-1.5 transition-colors hover:bg-primary/10',
                      'grid-cols-[1.5rem_minmax(0,1fr)_auto]',
                      showSimplified
                        ? 'sm:grid-cols-[1.5rem_minmax(4rem,10rem)_minmax(0,1fr)_minmax(0,3fr)_minmax(4rem,8rem)_auto]'
                        : 'sm:grid-cols-[1.5rem_minmax(4rem,10rem)_minmax(0,1fr)_minmax(0,3fr)_auto]',
                    )}
                  >
                    {/* # */}
                    <span className="text-center text-xs font-bold text-muted-foreground">{index + 1}</span>

                    {/* Chinese + pinyin + meaning stacked on mobile */}
                    <div className="min-w-0">
                      <span
                        className="block text-foreground"
                        style={{ fontSize: 'var(--app-font-size, 1rem)' }}
                      >
                        {item.chinese}
                      </span>
                      {showPinyin && (
                        <span className="block truncate text-xs text-muted-foreground sm:hidden">{item.pinyin}</span>
                      )}
                      {showMeaning && (
                        <span className={cn('block text-xs text-muted-foreground sm:hidden', !expanded && 'truncate')}>{meaning}</span>
                      )}
                      {showSimplified && item.simplified && (
                        <span className="block truncate text-xs text-muted-foreground sm:hidden">{item.simplified}</span>
                      )}
                    </div>

                    {/* Pinyin — desktop only */}
                    <span className="hidden truncate text-sm text-muted-foreground sm:block">{showPinyin ? item.pinyin : ''}</span>

                    {/* Meaning — desktop only */}
                    <span className={cn('hidden text-sm text-foreground/80 sm:block', !expanded && 'truncate')}>{showMeaning ? meaning : ''}</span>

                    {/* Simplified — desktop only */}
                    {showSimplified && (
                      <span className="hidden truncate text-sm text-muted-foreground sm:block">{item.simplified ?? ''}</span>
                    )}

                    {/* Actions */}
                    <div className="grid shrink-0 grid-cols-[2rem_2rem_2rem_2rem] items-center justify-end gap-0.5 sm:grid-cols-[5.75rem_2rem_2rem_2rem]">
                      <span className="hidden h-8 items-center justify-end sm:flex">
                        {(item.sentenceChinese || item.samples?.length > 0) && (
                          <span className={cn(
                            'flex items-center justify-end gap-0.5 rounded-lg px-1.5 py-0.5 text-xs font-medium transition-colors',
                            expanded
                              ? 'text-primary'
                              : 'text-muted-foreground',
                          )}>
                            <span>{expanded ? (t.collapseDetails || 'Collapse') : (t.seeMoreDetails || 'See more')}</span>
                            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} />
                          </span>
                        )}
                      </span>
                      <span className={cn(
                        'flex h-8 items-center justify-center rounded-lg text-muted-foreground transition-colors sm:hidden',
                        expanded && 'text-primary',
                      )}>
                        {(item.sentenceChinese || item.samples?.length > 0) && (
                          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')} />
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { void handleCopyWord(e, item); }}
                        aria-label={isCopied ? (t.copiedWord || 'Copied') : (t.copyWord || 'Copy word')}
                        title={isCopied ? (t.copiedWord || 'Copied') : (t.copyWord || 'Copy word')}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                          isCopied
                            ? 'text-emerald-600'
                            : 'text-muted-foreground/50 hover:text-emerald-500',
                        )}
                      >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <SpeakButton text={item.chinese} label={t.speakWord} size="icon" variant="ghost" className="h-8 w-8" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item); }}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                          favorited
                            ? 'text-rose-500 hover:text-rose-600'
                            : 'text-muted-foreground/50 hover:text-rose-400',
                        )}
                      >
                        <Heart className={cn('h-4 w-4', favorited && 'fill-current')} />
                      </button>
                    </div>
                  </div>

                  {expanded && (item.sentenceChinese || item.samples?.length > 0) && (
                    <div className="border-t border-theme-border bg-theme-surface px-3 py-4 pl-[calc(1.5rem+0.75rem)]">
                      {item.samples?.length > 0 ? (
                        <div className="space-y-3">
                          {item.samples.map((ex, i) => (
                            <div key={i} className={cn('flex items-start gap-3', i > 0 && 'border-t border-theme-border pt-3')}>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                {ex.type && (
                                  <span className="inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                    {ex.type}
                                  </span>
                                )}
                                {ex.meaning && <p className="break-words text-xs italic text-muted-foreground">{ex.meaning}</p>}
                                <p className="break-words text-xl font-bold text-foreground">
                                  {ex.sentence}
                                  {showSimplified && ex.simplified && (
                                    <span className="ml-2 text-base font-normal text-muted-foreground">[{ex.simplified}]</span>
                                  )}
                                </p>
                                {showPinyin && ex.pinyin && <p className="break-words text-xs text-muted-foreground">{ex.pinyin}</p>}
                                <p className="break-words text-sm text-muted-foreground">
                                  {language === 'vi' ? (ex.vi || ex.en) : (ex.en || ex.vi)}
                                </p>
                              </div>
                              <SpeakButton text={ex.sentence} label={t.speakSentence} size="icon" variant="ghost" className="h-8 w-8 shrink-0" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="break-words text-xl font-bold text-foreground">{item.sentenceChinese}</p>
                            {item.sentencePinyin && <p className="break-words text-xs text-muted-foreground">{item.sentencePinyin}</p>}
                            {sentenceMeaning && <p className="break-words text-sm text-muted-foreground">{sentenceMeaning}</p>}
                          </div>
                          <SpeakButton text={item.sentenceChinese} label={t.speakSentence} size="icon" variant="ghost" className="h-8 w-8 shrink-0" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
