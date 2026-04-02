import { BookOpenText, CirclePlay, Heart, X } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
        <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-700 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">{t.savedWords}</p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{t.favoriteList}</h2>
              <p className="text-sm text-slate-500">
                {favorites.length} {favorites.length === 1 ? t.savedItem : t.savedItems}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" className="gap-2" disabled={!favorites.length} onClick={onStudyFavorites}>
                <BookOpenText className="h-4 w-4" />
                {t.studyAllFavorites}
              </Button>
              <Button type="button" variant="outline" className="gap-2" disabled={!favorites.length} onClick={onQuizFavorites}>
                <CirclePlay className="h-4 w-4" />
                {t.quizAllFavorites}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6">
            {favorites.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center text-violet-400 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
                {t.noFavorites}
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((favorite) => (
                  <Card key={favorite.favoriteKey} className="overflow-hidden border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{favorite.chinese}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-600 dark:text-slate-300">
                              {favorite.sectionLabel || favorite.section}
                            </span>
                            <SpeakButton text={favorite.chinese} label={t.speakWord} size="icon" variant="outline" />
                          </div>
                          <p className="text-base font-medium text-slate-700 dark:text-slate-200">{getItemMeaning(favorite, language)}</p>

                          <div className="rounded-2xl bg-violet-50/50 p-4 text-sm dark:bg-slate-600">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="font-semibold text-slate-700 dark:text-slate-200">{t.exampleSentence}</p>
                              <SpeakButton text={favorite.sentenceChinese} label={t.speakSentence} size="icon" variant="secondary" />
                            </div>
                            <p className="break-words font-semibold text-slate-900 dark:text-white">{favorite.sentenceChinese}</p>
                            <p className="mt-2 break-words border-t border-slate-200 pt-2 text-slate-500 dark:border-slate-500 dark:text-slate-400">
                              {getSentenceMeaning(favorite, language)}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 self-start border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"
                          onClick={() => onRemove(favorite.favoriteKey)}
                        >
                          <Heart className="h-4 w-4 fill-current" />
                          {t.remove}
                        </Button>
                      </div>
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
