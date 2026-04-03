import { BookOpen, Heart, Layers3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import SectionSelector from '@/components/SectionSelector';

function StatPill({ icon: Icon, label, value, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-white text-green-600 dark:bg-slate-700 dark:text-slate-200',
    rose: 'bg-white text-rose-500 dark:bg-rose-950/40 dark:text-rose-300',
    emerald: 'bg-white text-teal-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${toneMap[tone] || toneMap.slate}`}>
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className="rounded-full bg-[#ECFAE5] px-2 py-0.5 text-xs font-bold dark:bg-slate-900/60 dark:text-white">{value}</span>
    </div>
  );
}

export default function StudyDeckPanel({
  canUseFavorites = true,
  t,
  books,
  selectedBook,
  onBookChange,
  sections,
  selectedSection,
  onSectionChange,
  source,
  onSourceChange,
  deckCount,
  lessonCount,
  favoriteCount,
  currentIndex,
  mode,
}) {
  const remaining = Math.max(deckCount - (mode === 'quiz' || mode === 'flashcard' ? currentIndex + 1 : 0), 0);

  return (
    <Card className="animate-float-in border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(180px,0.9fr)_minmax(260px,1.2fr)_minmax(180px,0.9fr)]">
          <div className="space-y-2">
            <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.bookLabel}</label>
            <Select className="w-full" value={selectedBook} onChange={(event) => onBookChange(event.target.value)}>
              {books.map((book) => (
                <option key={book.id} value={book.id}>{book.title}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.lessonLabel}</label>
            <SectionSelector
              sections={sections}
              selectedSection={selectedSection}
              onChange={onSectionChange}
              noSectionsLabel={t.noSections}
              comingSoonLabel={t.comingSoon}
            />
          </div>

          <div className="space-y-2">
            <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.sourceLabel}</label>
            <Select className="w-full" value={source} onChange={(event) => onSourceChange(event.target.value)}>
              <option value="all">{t.sourceAllWords}</option>
              <option value="favorites" disabled={!canUseFavorites}>{t.sourceFavoriteWords}</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatPill icon={BookOpen} label={t.lessonWordsLabel} value={lessonCount} tone="slate" />
          <StatPill icon={Heart} label={t.favoriteWordsLabel} value={favoriteCount} tone="rose" />
          <StatPill icon={Layers3} label={t.remainingWordsLabel} value={remaining} tone="emerald" />
        </div>
      </CardContent>
    </Card>
  );
}
