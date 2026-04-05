import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import SectionSelector from '@/components/SectionSelector';
import StudyModeTabs from '@/components/StudyModeTabs';

function getBookOptionLabel(book, t) {
  if (!book) return '';
  if (book.id === 'user-upload') return book.title;

  const bookNumber =
    String(book.shortTitle || book.id || '')
      .match(/\d+/)?.[0] || '';

  const translated = bookNumber
    ? `${t.bookSeriesName} ${bookNumber}`
    : t.bookSeriesName;

  return `${book.title} | ${translated}`;
}

export default function StudyDeckPanel({
  t,
  books,
  selectedBook,
  onBookChange,
  sections,
  selectedSection,
  onSectionChange,
  activeTab,
  onTabChange,
}) {
  return (
    <Card className="animate-float-in border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.bookLabel}</label>
            <Select className="w-full" value={selectedBook} onChange={(event) => onBookChange(event.target.value)}>
              {books.map((book) => (
                <option key={book.id} value={book.id}>{getBookOptionLabel(book, t)}</option>
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

        <div className="h-px bg-[#CAE8BD] dark:bg-slate-700" />

        <div className="space-y-2">
          <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.studyModeLabel}</label>
          <StudyModeTabs t={t} activeTab={activeTab} onChange={onTabChange} embedded />
        </div>
      </CardContent>
    </Card>
  );
}
