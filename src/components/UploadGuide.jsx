import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Trash2, Upload, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { exportVocabularyToExcel } from '@/lib/excel';
import { cn } from '@/lib/utils';

const columns = [
  { key: 'chinese', required: true },
  { key: 'pinyin', required: true },
  { key: 'vietnamese', required: true },
  { key: 'english', required: false },
  { key: 'sentence_chinese', required: false },
  { key: 'sentence_pinyin', required: false },
  { key: 'sentence_vietnamese', required: false },
  { key: 'sentence_english', required: false },
];

const sampleRows = [
  { chinese: '一共', pinyin: 'yígòng', vietnamese: 'tổng cộng', english: 'altogether' },
  { chinese: '多少', pinyin: 'duōshǎo', vietnamese: 'bao nhiêu', english: 'how much, how many' },
];

function SetCard({ lesson, onDelete, t }) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDownload() {
    setExporting(true);
    try {
      await exportVocabularyToExcel(lesson.items, lesson.title);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(lesson.id);
    } finally {
      setDeleting(false);
    }
  }

  const isSupabase = lesson.source === 'supabase';

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-theme-border bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
      <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{lesson.title}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {lesson.items?.length ?? 0} {t.wordsLabel}
          {' · '}
          {isSupabase ? (
            <span className="text-green-600 dark:text-green-400">{t.savedPermanently}</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">{t.savedInBrowserShort}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={exporting}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-300"
        aria-label={t.downloadSet}
      >
        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
        aria-label={t.deleteSet}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function UploadGuide({
  onBackToLearn,
  onOpenPicker,
  maxUploadLabel,
  uploadError,
  uploadedLessons = [],
  onDeleteLesson,
  supabaseSets = [],
  onDeleteSupabaseSet,
  supabaseSlotsUsed = 0,
  t,
}) {
  const steps = [
    { icon: Download, title: t.step1Title, description: t.step1Description },
    { icon: WandSparkles, title: t.step2Title, description: t.step2Description },
    { icon: FileSpreadsheet, title: t.step3Title, description: t.step3Description },
    { icon: Upload, title: t.step4Title, description: t.step4Description },
  ];

  const allSets = [
    ...supabaseSets.map((s) => ({ ...s, source: 'supabase', items: s.items ?? [] })),
    ...uploadedLessons.map((l) => ({ ...l, source: 'browser' })),
  ];

  const SUPABASE_LIMIT = 3;
  const supabaseFull = supabaseSlotsUsed >= SUPABASE_LIMIT;

  return (
    <div className="space-y-6 animate-float-in">
      <Card className="overflow-hidden border-white/60 bg-white/90 shadow-lg">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green-600">{t.uploadLesson}</p>
          <CardTitle className="text-3xl font-black text-slate-900 dark:text-white">{t.uploadTitle}</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">{t.uploadDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl border border-green-100 bg-green-50/50 p-5 dark:border-slate-600 dark:bg-slate-700">
              <div className="mb-4 inline-flex rounded-2xl bg-green-100 p-3 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/60 bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-black">{t.templateFormat}</CardTitle>
            <CardDescription>{t.requiredColumnsHelp}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl border border-green-100 bg-green-50/50 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-700">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-green-600 dark:text-slate-400">{t.columnHeaderLabel}</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((column) => (
                  <span
                    key={column.key}
                    className={cn(
                      'rounded-full px-3 py-2 text-xs font-semibold',
                      column.required
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
                    )}
                  >
                    {column.key}
                    {column.required ? ` · ${t.requiredTag}` : ` · ${t.optionalTag}`}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-green-100 bg-green-50/50 p-4 sm:p-5 dark:border-slate-600 dark:bg-slate-700">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-green-600 dark:text-slate-400">{t.sampleRows}</p>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800">
                <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">chinese</th>
                      <th className="px-4 py-3">pinyin</th>
                      <th className="px-4 py-3">vietnamese</th>
                      <th className="px-4 py-3">english</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row) => (
                      <tr key={`${row.chinese}-${row.pinyin}`} className="border-t border-slate-100 dark:border-slate-600">
                        <td className="px-4 py-3 font-semibold">{row.chinese}</td>
                        <td className="px-4 py-3">{row.pinyin}</td>
                        <td className="px-4 py-3">{row.vietnamese}</td>
                        <td className="px-4 py-3">{row.english}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/60 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-black">{t.downloadAndUpload}</CardTitle>
              <CardDescription>{t.templateTools}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href="/data/templates/upload-template.xlsx"
                download="upload-template.xlsx"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <Download className="h-4 w-4" />
                {t.downloadTemplate}
              </a>

              <Button type="button" className="h-11 w-full gap-2" onClick={onOpenPicker}>
                <Upload className="h-4 w-4" />
                {t.uploadLesson}
              </Button>

              <div className="rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                <p className="font-semibold">{t.browserStorageWarningTitle}</p>
                <p className="mt-1 text-amber-700 dark:text-amber-400">{t.browserStorageWarningBody}</p>
              </div>

              <div className="rounded-3xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <p className="font-semibold">{t.uploadRules}</p>
                <ul className="mt-2 space-y-2 text-green-700 dark:text-green-400">
                  <li>• {t.xlsxOnly}</li>
                  <li>• {t.maxSize}: {maxUploadLabel}</li>
                  <li>• {t.maxWordsPerSet}: 100</li>
                </ul>
              </div>

              {uploadError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">{uploadError}</div>
              ) : null}

              <Button type="button" variant="secondary" className="w-full" onClick={onBackToLearn}>
                {t.backToLearningPage}
              </Button>
            </CardContent>
          </Card>

          {allSets.length > 0 && (
            <Card className="border-white/60 bg-white/90 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-black">{t.mySetsTitle}</CardTitle>
                <CardDescription>
                  {supabaseSlotsUsed > 0
                    ? t.mySetsSubtitle.replace('{used}', supabaseSlotsUsed).replace('{max}', SUPABASE_LIMIT)
                    : t.mySetsSubtitleGuest}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {supabaseFull && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    {t.supabaseSlotsFull}
                  </div>
                )}
                {allSets.map((set) => (
                  <SetCard
                    key={set.id}
                    lesson={set}
                    t={t}
                    onDelete={set.source === 'supabase' ? onDeleteSupabaseSet : onDeleteLesson}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-white/60 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-black">{t.helpfulNote}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <p>{t.xlsxRequiredHelp}</p>
              <p>{t.invalidRowsHelp}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
