import { BookOpenText, CirclePlay, LayoutList, List, Search, X } from 'lucide-react';
import { useState } from 'react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getItemMeaning, getSentenceMeaning } from '@/lib/utils';

export default function FavoritesPanel({
  isOpen,
  favorites,
  onClose,
  onRemove,
  onStudyFavorites,
  onQuizFavorites,
  language = 'en',
  t,
}) {
  const [fullMode, setFullMode] = useState(false);
  const [query, setQuery] = useState('');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
        <div className={`w-full overflow-hidden rounded-[2rem] border border-[#CAE8BD] bg-[#ECFAE5] shadow-2xl dark:border-slate-700/60 dark:bg-slate-800 ${fullMode ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <div className="flex items-center justify-between gap-4 border-b border-[#CAE8BD] px-5 py-4 dark:border-slate-700 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green-600">{t.savedWords}</p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{t.favoriteList}</h2>
              <p className="text-sm text-slate-500">
                {favorites.length} {favorites.length === 1 ? t.savedItem : t.savedItems}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="h-10 rounded-xl border border-[#CAE8BD] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#B0DB9C] focus:ring-2 focus:ring-[#B0DB9C]/30 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                />
              </div>
              <Button type="button" className="gap-2" disabled={!favorites.length} onClick={onStudyFavorites}>
                <BookOpenText className="h-4 w-4" />
                {t.studyAllFavorites}
              </Button>
              <Button type="button" variant="outline" className="gap-2" disabled={!favorites.length} onClick={onQuizFavorites}>
                <CirclePlay className="h-4 w-4" />
                {t.quizAllFavorites}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => setFullMode((p) => !p)} aria-label="Toggle view mode">
                {fullMode ? <List className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6">
            {favorites.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/40 p-10 text-center text-green-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
                {t.noFavorites}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/40 p-10 text-center text-green-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
                No results for "{query}"
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((favorite) => (
                  <Card key={favorite.favoriteKey} className="overflow-hidden border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700">
                    <CardContent className="p-4">
                      {fullMode ? (
                        <div className="flex items-start gap-6">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-2xl font-black text-slate-900 dark:text-white">{favorite.chinese}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
                                {favorite.sectionLabel || favorite.section}
                              </span>
                              <SpeakButton text={favorite.chinese} label={t.speakWord} size="icon" variant="outline" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{getItemMeaning(favorite, language)}</p>
                          </div>

                          <div className="min-w-0 flex-[2] rounded-2xl bg-green-50/50 px-4 py-3 text-sm dark:bg-slate-600">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <p className="break-words font-semibold text-slate-900 dark:text-white">{favorite.sentenceChinese}</p>
                                <p className="break-words text-slate-500 dark:text-slate-400">{getSentenceMeaning(favorite, language)}</p>
                              </div>
                              <SpeakButton text={favorite.sentenceChinese} label={t.speakSentence} size="icon" variant="secondary" />
                            </div>
                          </div>

                          <button
                            type="button"
                            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                            onClick={() => onRemove(favorite.favoriteKey)}
                            aria-label={t.remove}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-2xl font-black text-slate-900 dark:text-white">{favorite.chinese}</span>
                              <SpeakButton text={favorite.chinese} label={t.speakWord} size="icon" variant="outline" />
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
                                {favorite.sectionLabel || favorite.section}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{getItemMeaning(favorite, language)}</p>
                          </div>

                          <button
                            type="button"
                            className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
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
