import { Heart, X } from 'lucide-react';
import SpeakButton from '@/components/SpeakButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FavoritesPanel({ isOpen, favorites, onClose, onRemove }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Saved words</p>
              <h2 className="text-xl font-black text-slate-900">Favorite List</h2>
              <p className="text-sm text-slate-500">{favorites.length} saved item{favorites.length === 1 ? '' : 's'}</p>
            </div>

            <Button type="button" variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-6">
            {favorites.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                No favorite words yet. Tap the heart on a flashcard to save one.
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((favorite) => (
                  <Card key={favorite.favoriteKey} className="overflow-hidden border-slate-200 bg-white">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-3xl font-black text-slate-900">{favorite.chinese}</span>
                            <span className="text-lg font-semibold text-blue-600">{favorite.pinyin}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              {favorite.sectionLabel || favorite.section}
                            </span>
                            <SpeakButton text={favorite.chinese} label="Speak favorite word" size="icon" variant="outline" />
                          </div>
                          <p className="text-base font-medium text-slate-700">{favorite.english}</p>

                          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="font-semibold text-slate-700">Example sentence</p>
                              <SpeakButton
                                text={favorite.sentenceChinese}
                                label="Speak favorite sentence"
                                size="icon"
                                variant="secondary"
                              />
                            </div>
                            <p className="font-semibold text-slate-900">{favorite.sentenceChinese}</p>
                            <p className="mt-1 text-slate-600">{favorite.sentencePinyin}</p>
                            <p className="mt-2 border-t border-slate-200 pt-2 text-slate-500">{favorite.sentenceEnglish}</p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 self-start border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => onRemove(favorite.favoriteKey)}
                        >
                          <Heart className="h-4 w-4 fill-current" />
                          Remove
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
