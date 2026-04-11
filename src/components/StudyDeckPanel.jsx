import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import SectionSelector from '@/components/SectionSelector';
import StudyModeTabs from '@/components/StudyModeTabs';

function getBookOptionLabel(book, t) {
  if (!book) return '';
  if (book.id === 'user-upload' || book.source === 'teacher') return book.title;

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
  booksLoading,
}) {
  return (
    <Card className="animate-float-in border-theme-border bg-theme-surface shadow-soft">
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1 min-w-0">
            <div className="flex h-5 items-center gap-2">
              <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.bookLabel}</label>
              {booksLoading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />}
            </div>
            <Select className="min-w-0 w-full" value={selectedBook} onChange={(event) => onBookChange(event.target.value)} disabled={booksLoading && books.length === 0}>
              {books.map((book) => (
                <option key={book.id} value={book.id}>{getBookOptionLabel(book, t)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex h-5 items-center">
              <label className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t.lessonLabel}</label>
            </div>
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
        <StudyModeTabs t={t} activeTab={activeTab} onChange={onTabChange} embedded />
      </CardContent>
    </Card>
  );
}
