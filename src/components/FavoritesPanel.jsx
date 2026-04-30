import { CirclePlay, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getItemMeaning, getSentenceMeaning } from '@/lib/utils';

export default function FavoritesPanel({
  isOpen,
  favorites,
  onClose,
  onRemove,
  onQuizFavorites,
  language = 'en',
  t,
}) {
  const [fullMode, setFullMode] = useState(false);
  const [query, setQuery] = useState('');
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const searchInputRef = useRef(null);

  const filtered = query.trim()
    ? favorites.filter((f) => {
        const q = query.toLowerCase();
        return (
          f.chinese?.includes(query) ||
          f.pinyin?.toLowerCase().includes(q) ||
          f.english?.toLowerCase().includes(q) ||
          f.vietnamese?.toLowerCase().includes(q)
        );
      })
    : favorites;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    searchInputRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          aria-describedby={dialogDescriptionId}
          className={`w-full overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-2xl ${fullMode ? 'max-w-7xl' : 'max-w-5xl'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-theme-border px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{t.savedWords}</p>
              <h2 id={dialogTitleId} className="text-xl font-black text-foreground">{t.favoriteList}</h2>
              <p id={dialogDescriptionId} className="text-sm text-muted-foreground">
                {favorites.length} {favorites.length === 1 ? t.savedItem : t.savedItems}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchFavoritesPlaceholder}
                  aria-label={t.searchFavoritesPlaceholder}
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="outline" className="gap-2" disabled={!favorites.length} onClick={onQuizFavorites}>
                <CirclePlay className="h-4 w-4" />
                {t.quizAllFavorites}
              </Button>
              <button
                type="button"
                onClick={() => setFullMode((p) => !p)}
                aria-pressed={fullMode}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${fullMode ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
                  {fullMode && <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {fullMode ? t.hideExampleDetails : t.showExampleDetails}
              </button>
              <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label={t.closeFavorites}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6">
            {favorites.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center text-muted-foreground">
                {t.noFavorites}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-center text-muted-foreground">
                {t.noSearchResults?.replace('{query}', query) ?? `No results for "${query}"`}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((favorite) => (
                  <Card key={favorite.favoriteKey} className="overflow-hidden border-border bg-card">
                    <CardContent className="p-4">
                      {fullMode ? (
                        <div className="flex items-start gap-6">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-2xl font-black text-foreground">{favorite.chinese}</span>
                              <SpeakButton text={favorite.chinese} label={t.speakWord} size="sm" variant="outline" className="h-7 w-7 p-0" iconSize="sm" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">{getItemMeaning(favorite, language)}</p>
                          </div>

                          <div className="min-w-0 flex-[2] rounded-2xl bg-theme-surface px-4 py-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-words font-semibold text-foreground">{favorite.sentenceChinese}</p>
                              <SpeakButton text={favorite.sentenceChinese} label={t.speakSentence} size="sm" variant="secondary" className="h-7 w-7 shrink-0 p-0" iconSize="sm" />
                            </div>
                            <p className="mt-1 break-words text-muted-foreground">{getSentenceMeaning(favorite, language)}</p>
                          </div>

                          <button
                            type="button"
                            className="shrink-0 rounded-xl p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onRemove(favorite.favoriteKey)}
                            aria-label={t.remove}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                            <span className="text-2xl font-black text-foreground">{favorite.chinese}</span>
                            <SpeakButton text={favorite.chinese} label={t.speakWord} size="sm" variant="outline" className="h-7 w-7 p-0" iconSize="sm" />
                            <span className="text-sm font-medium text-muted-foreground">{getItemMeaning(favorite, language)}</span>
                          </div>

                          <button
                            type="button"
                            className="shrink-0 rounded-xl p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onRemove(favorite.favoriteKey)}
                            aria-label={t.remove}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
