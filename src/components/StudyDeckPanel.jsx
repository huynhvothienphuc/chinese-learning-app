import { BookOpen, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import SectionSelector from '@/components/SectionSelector';

function StatPill({ icon: Icon, label, value, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-white text-green-600 dark:bg-slate-700 dark:text-slate-200',
    rose:  'bg-white text-rose-500 dark:bg-rose-950/40 dark:text-rose-300',
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
  t,
  books,
  selectedBook,
  onBookChange,
  sections,
  selectedSection,
  onSectionChange,
  lessonCount,
  favoriteCount,
}) {
  return (
    <Card className="animate-float-in border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
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
              lessonLabel={t.lessonLabel}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatPill icon={BookOpen} label={t.lessonWordsLabel} value={lessonCount} tone="slate" />
          <StatPill icon={Heart} label={t.favoriteWordsLabel} value={favoriteCount} tone="rose" />
        </div>
      </CardContent>
    </Card>
  );
}
