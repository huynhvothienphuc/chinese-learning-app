import { Heart } from 'lucide-react';
import { useState } from 'react';
import SpeakButton from '@/components/SpeakButton';
import { Card, CardContent } from '@/components/ui/card';
import { cn, getItemMeaning } from '@/lib/utils';

export default function WordListView({ vocabulary, isFavorite, onToggleFavorite, language, t }) {
  const [filter, setFilter] = useState('all');

  const displayed = filter === 'favorites' ? vocabulary.filter((item) => isFavorite(item)) : vocabulary;

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
        <CardContent className="p-8 text-center text-slate-500">{t.noData}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-2xl px-4 py-1.5 text-sm font-semibold transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-white text-slate-600 hover:bg-green-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
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
                : 'bg-white text-slate-600 hover:bg-rose-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', filter === 'favorites' && 'fill-current')} />
            {t.favoriteList}
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/40 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-700/40">
            {t.noFavorites}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((item, index) => {
              const favorited = isFavorite(item);
              const meaning = getItemMeaning(item, language);
              return (
                <div
                  key={item.id ?? index}
                  className="flex items-center gap-3 rounded-2xl border border-[#CAE8BD] bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700/60"
                >
                  <span className="w-7 shrink-0 text-center text-xs font-bold text-slate-400">{index + 1}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="text-xl font-black text-slate-900 dark:text-slate-100">{item.chinese}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{item.pinyin}</span>
                    </div>
                    <p className="mt-0.5 break-words text-sm text-slate-600 dark:text-slate-300">{meaning}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <SpeakButton text={item.chinese} label={t.speakWord} size="icon" variant="ghost" className="h-8 w-8" />
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(item)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                        favorited
                          ? 'text-rose-500 hover:text-rose-600'
                          : 'text-slate-300 hover:text-rose-400 dark:text-slate-500 dark:hover:text-rose-400',
                      )}
                    >
                      <Heart className={cn('h-4 w-4', favorited && 'fill-current')} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
