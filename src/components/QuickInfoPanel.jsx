import { BookOpen, CirclePlay, Heart, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QuickInfoPanel({
  t,
  bookLabel,
  sectionLabel,
  sourceLabel,
  deckCount,
  favoriteCount,
  currentIndex,
  onOpenFavorites,
  onStartReview,
  onStartFavoriteQuiz,
  canUseFavorites,
}) {
  return (
    <div className="space-y-4">
      <Card className="border-white/60 bg-white/90 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Info className="h-5 w-5 text-blue-500" />
            {t.quickInfoTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p><span className="font-semibold text-slate-900">{t.bookLabel}:</span> {bookLabel}</p>
            <p className="mt-2"><span className="font-semibold text-slate-900">{t.lessonLabel}:</span> {sectionLabel}</p>
            <p className="mt-2"><span className="font-semibold text-slate-900">{t.sourceLabel}:</span> {sourceLabel}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.deckWordsLabel}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{deckCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.favoriteWordsLabel}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{favoriteCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.currentCardLabel}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{deckCount > 0 ? currentIndex + 1 : 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-white/90 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t.favoriteDeckTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="secondary" className="w-full justify-start gap-2" onClick={onOpenFavorites}>
            <Heart className="h-4 w-4" />
            {t.openFavoriteList}
          </Button>
          <Button type="button" className="w-full justify-start gap-2" disabled={!canUseFavorites} onClick={onStartReview}>
            <BookOpen className="h-4 w-4" />
            {t.studyAllFavorites}
          </Button>
          <Button type="button" variant="outline" className="w-full justify-start gap-2" disabled={!canUseFavorites} onClick={onStartFavoriteQuiz}>
            <CirclePlay className="h-4 w-4" />
            {t.quizAllFavorites}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
