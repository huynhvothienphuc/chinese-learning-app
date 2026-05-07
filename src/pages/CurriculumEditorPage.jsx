import { Fragment, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Lock, Unlock, Loader2, Plus, Save, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLocale } from '@/hooks/useLocale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { exportLessonToExcel, exportBookToExcel } from '@/lib/excel';

// ── helpers ───────────────────────────────────────────────────────────────────

function emptyWord(id) {
  return { id, chinese: '', pinyin: '', en: '', vi: '', sinoVietnamese: '', notest: false, samples: [] };
}

function emptySample() {
  return { sentence: '', simplified: '', pinyin: '', en: '', vi: '', meaning: '' };
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function CurriculumEditorPage() {
  const { role, roleReady } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useLocale();

  const [books, setBooks]                   = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [lessons, setLessons]               = useState([]);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [words, setWords]                   = useState([]);
  const [expandedIdx, setExpandedIdx]       = useState(null);
  const [dirty, setDirty]                   = useState(false);
  const [dirtyWordIds, setDirtyWordIds]     = useState(new Set());
  const [saving, setSaving]                 = useState(false);
  const [savedFlash, setSavedFlash]         = useState(false);
  const [bookConfirm, setBookConfirm]       = useState(null); // { bookId, title, enabled }
  const [lessonConfirm, setLessonConfirm]   = useState(null); // { lessonId, title, enabled }
  const [freeConfirm, setFreeConfirm]       = useState(null); // { lessonId, title, is_free }
  const [bulkFreeConfirm, setBulkFreeConfirm] = useState(null); // { is_free }
  const [booksLoading, setBooksLoading]     = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [wordsLoading, setWordsLoading]     = useState(false);
  const [downloadingId, setDownloadingId]   = useState(null);
  const [downloadingBook, setDownloadingBook] = useState(false);

  useEffect(() => {
    if (roleReady && role !== 'superadmin') navigate('/');
  }, [roleReady, role, navigate]);

  // Load books
  useEffect(() => {
    setBooksLoading(true);
    supabase.from('books').select('id,title,short_title,order,enabled')
      .then(({ data }) => {
        const sorted = (data ?? []).sort((a, b) => a.order - b.order);
        setBooks(sorted);
        if (sorted.length) setSelectedBookId(sorted[0].id);
      })
      .finally(() => setBooksLoading(false));
  }, []);

  // Load lessons when book changes
  useEffect(() => {
    if (!selectedBookId) return;
    setLessonsLoading(true);
    setEditingLessonId(null);
    setWords([]);
    setDirty(false);
    supabase.from('lessons')
      .select('id,book_id,title,order,is_free,enabled')
      .eq('book_id', selectedBookId)
      .then(({ data }) => setLessons((data ?? []).sort((a, b) => a.order - b.order)))
      .finally(() => setLessonsLoading(false));
  }, [selectedBookId]);

  // Load words when editing lesson changes
  useEffect(() => {
    if (!editingLessonId) return;
    setWordsLoading(true);
    setDirty(false);
    setDirtyWordIds(new Set());
    setExpandedIdx(null);
    supabase.rpc('get_lesson_words', { p_lesson_id: editingLessonId })
      .then(({ data }) => setWords(data ?? []))
      .finally(() => setWordsLoading(false));
  }, [editingLessonId]);

  // ── toggles (save immediately) ────────────────────────────────────────────

  function requestToggleBook(book, enabled) {
    setBookConfirm({ bookId: book.id, title: book.short_title ?? book.title, enabled });
  }

  async function confirmToggleBook() {
    const { bookId, enabled } = bookConfirm;
    setBookConfirm(null);
    setBooks((prev) => prev.map((b) => b.id === bookId ? { ...b, enabled } : b));
    await supabase.from('books').update({ enabled }).eq('id', bookId);
  }

  function requestToggleLesson(lesson, enabled) {
    setLessonConfirm({ lessonId: lesson.id, title: lesson.title, enabled });
  }

  async function confirmToggleLesson() {
    const { lessonId, enabled } = lessonConfirm;
    setLessonConfirm(null);
    setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, enabled } : l));
    await supabase.from('lessons').update({ enabled }).eq('id', lessonId);
  }

  async function confirmBulkFree() {
    const { is_free } = bulkFreeConfirm;
    setBulkFreeConfirm(null);
    setLessons((prev) => prev.map((l) => ({ ...l, is_free })));
    await supabase.from('lessons').update({ is_free }).eq('book_id', selectedBookId);
  }

  async function confirmToggleFree() {
    const { lessonId, is_free } = freeConfirm;
    setFreeConfirm(null);
    setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, is_free } : l));
    await supabase.from('lessons').update({ is_free }).eq('id', lessonId);
  }

  async function toggleLesson(lessonId, field, value) {
    setLessons((prev) => prev.map((l) => l.id === lessonId ? { ...l, [field]: value } : l));
    await supabase.from('lessons').update({ [field]: value }).eq('id', lessonId);
  }

  // ── word editing ──────────────────────────────────────────────────────────

  function markWordDirty(idx) {
    setDirtyWordIds((prev) => new Set([...prev, words[idx]?.id ?? idx]));
  }

  function updateWord(idx, field, value) {
    setWords((prev) => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
    markWordDirty(idx);
    setDirty(true);
  }

  function deleteWord(idx) {
    setWords((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx((prev) => prev === idx ? null : prev > idx ? prev - 1 : prev);
    setDirty(true);
  }

  function addWord() {
    const maxId = words.reduce((m, w) => Math.max(m, w.id ?? 0), 0);
    const newId = maxId + 1;
    setWords((prev) => [...prev, emptyWord(newId)]);
    setDirtyWordIds((prev) => new Set([...prev, newId]));
    setDirty(true);
  }

  // ── sample editing ────────────────────────────────────────────────────────

  function updateSample(wIdx, sIdx, field, value) {
    setWords((prev) => prev.map((w, i) => i !== wIdx ? w : {
      ...w,
      samples: w.samples.map((s, j) => j !== sIdx ? s : { ...s, [field]: value }),
    }));
    markWordDirty(wIdx);
    setDirty(true);
  }

  function deleteSample(wIdx, sIdx) {
    setWords((prev) => prev.map((w, i) => i !== wIdx ? w : {
      ...w, samples: w.samples.filter((_, j) => j !== sIdx),
    }));
    markWordDirty(wIdx);
    setDirty(true);
  }

  function addSample(wIdx) {
    setWords((prev) => prev.map((w, i) => i !== wIdx ? w : {
      ...w, samples: [...w.samples, emptySample()],
    }));
    markWordDirty(wIdx);
    setDirty(true);
  }

  // ── download lesson ───────────────────────────────────────────────────────

  async function downloadBook() {
    if (!selectedBookId || lessons.length === 0) return;
    setDownloadingBook(true);
    const { data } = await supabase
      .from('lessons')
      .select('id, order, title')
      .eq('book_id', selectedBookId)
      .order('order');
    const wordsResults = await Promise.all(
      (data ?? []).map((l) => supabase.rpc('get_lesson_words', { p_lesson_id: l.id }))
    );
    const lessonData = (data ?? []).map((l, i) => ({ lesson: l, words: wordsResults[i].data ?? [] }));
    const bookTitle = selectedBook?.short_title ?? selectedBook?.title ?? 'book';
    await exportBookToExcel(lessonData, bookTitle).catch(() => {});
    setDownloadingBook(false);
  }

  async function downloadLesson(lesson) {
    setDownloadingId(lesson.id);
    const { data } = await supabase.rpc('get_lesson_words', { p_lesson_id: lesson.id });
    const bookShort = selectedBook?.short_title ?? selectedBook?.title ?? 'book';
    const fileName = `${bookShort} - Lesson ${lesson.order} - ${lesson.title}`;
    await exportLessonToExcel(data ?? [], fileName).catch(() => {});
    setDownloadingId(null);
  }

  // ── save all ──────────────────────────────────────────────────────────────

  async function saveAll() {
    if (!editingLessonId || !dirty) return;
    setSaving(true);
    const { data, error } = await supabase.from('lessons')
      .update({ words, updated_at: new Date().toISOString() })
      .eq('id', editingLessonId)
      .select('id');
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    if (!data || data.length === 0) {
      alert('Save blocked — 0 rows updated. RLS policy may be denying the write.\n\nCheck: SELECT role FROM profiles WHERE user_id = auth.uid()');
      return;
    }
    setDirty(false);
    setDirtyWordIds(new Set());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    queryClient.invalidateQueries({ queryKey: ['vocab', selectedBookId, editingLessonId] });
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const selectedBook   = books.find((b) => b.id === selectedBookId);
  const editingLesson  = lessons.find((l) => l.id === editingLessonId);

  if (!roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/superadmin')}>
            <ArrowLeft className="h-4 w-4" /> {t.curriculumDashboardBtn}
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.superadminLabel}</p>
            <h1 className="text-3xl font-black">{t.curriculumTitle}</h1>
          </div>
        </div>

        {/* Books + Lessons */}
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">

          {/* Book list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.curriculumBooksHeader}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="max-h-[228px] overflow-y-auto">
              {booksLoading ? <Skeleton rows={3} /> : books.map((book) => (
                <div
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${selectedBookId === book.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}
                >
                  <span className="truncate">{book.short_title ?? book.title}</span>
                  <Toggle value={book.enabled ?? true} onChange={(v) => requestToggleBook(book, v)} />
                </div>
              ))}
              </div>
            </CardContent>
          </Card>

          {/* Lesson list */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {selectedBook ? `${selectedBook.short_title ?? selectedBook.title} — ${t.curriculumLessonsHeader}` : t.curriculumLessonsHeader}
                </CardTitle>
                {lessons.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setBulkFreeConfirm({ is_free: true })}
                      className="rounded px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                      {t.curriculumAllFree}
                    </button>
                    <button type="button" onClick={() => setBulkFreeConfirm({ is_free: false })}
                      className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                      {t.curriculumAllLocked}
                    </button>
                    <button
                      type="button"
                      onClick={downloadBook}
                      disabled={downloadingBook}
                      title="Download all lessons as XLSX"
                      className="ml-1 flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      {downloadingBook
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Download className="h-3.5 w-3.5" />}
                      XLSX
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {lessonsLoading ? <Skeleton rows={5} /> : lessons.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t.curriculumNoLessons}</p>
              ) : (
                <div className="max-h-[252px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="w-10 px-4 py-2 text-left">{t.curriculumColOrder}</th>
                      <th className="px-4 py-2 text-left">{t.curriculumColTitle}</th>
                      <th className="w-20 px-4 py-2 text-center">{t.curriculumColEnabled}</th>
                      <th className="w-16 px-4 py-2 text-center">{t.curriculumColFree}</th>
                      <th className="w-10 px-2 py-2" />
                      <th className="w-20 px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} className={`border-b border-border last:border-0 transition-colors ${editingLessonId === lesson.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                        <td className="px-4 py-2 text-muted-foreground">{lesson.order}</td>
                        <td className="px-4 py-2 font-medium">{lesson.title}</td>
                        <td className="px-4 py-2 text-center">
                          <Toggle value={lesson.enabled ?? true} onChange={(v) => requestToggleLesson(lesson, v)} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setFreeConfirm({ lessonId: lesson.id, title: lesson.title, is_free: !lesson.is_free })}
                            title={lesson.is_free ? 'Free — click to lock' : 'Locked — click to make free'}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {lesson.is_free
                              ? <Unlock className="h-4 w-4 text-green-500" />
                              : <Lock className="h-4 w-4 text-red-500" />}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => downloadLesson(lesson)}
                            disabled={downloadingId === lesson.id}
                            title="Download XLSX"
                            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                          >
                            {downloadingId === lesson.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Download className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant={editingLessonId === lesson.id ? 'default' : 'outline'}
                            onClick={() => setEditingLessonId(editingLessonId === lesson.id ? null : lesson.id)}
                          >
                            {editingLessonId === lesson.id ? t.curriculumCancel : 'Edit'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Word Editor */}
        {editingLessonId && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{selectedBook?.short_title ?? selectedBook?.title}</p>
                  <CardTitle>Lesson {editingLesson?.order} — {editingLesson?.title}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {savedFlash && <span className="text-xs font-medium text-green-600">{t.curriculumSaved}</span>}
                  {!savedFlash && dirty && <span className="text-xs font-medium text-amber-500">{t.curriculumUnsaved}</span>}
                  <Button onClick={saveAll} disabled={!dirty || saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t.curriculumSaveAll}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {wordsLoading ? <Skeleton rows={6} /> : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <th className="w-8 px-2 py-2 text-center" />
                          <th className="px-2 py-2 text-left min-w-[90px]">{t.curriculumColChinese}</th>
                          <th className="px-2 py-2 text-left min-w-[110px]">{t.curriculumColPinyin}</th>
                          <th className="px-2 py-2 text-left min-w-[140px]">{t.curriculumColEnglish}</th>
                          <th className="px-2 py-2 text-left min-w-[140px]">{t.curriculumColVietnamese}</th>
                          <th className="px-2 py-2 text-left min-w-[110px]">{t.curriculumColSinoViet}</th>
                          <th className="w-16 px-2 py-2 text-center">{t.curriculumColSkipQuiz}</th>
                          <th className="w-8 px-2 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {words.map((word, idx) => (
                          <Fragment key={word.id ?? idx}>
                            {/* Word row */}
                            <tr className={`border-b border-border transition-colors ${
                              dirtyWordIds.has(word.id ?? idx)
                                ? 'bg-amber-50 dark:bg-amber-950/30'
                                : expandedIdx === idx ? 'bg-muted/40' : 'hover:bg-muted/20'
                            }`}>
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                                  title="Edit samples"
                                  className="mx-auto flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  {expandedIdx === idx
                                    ? <ChevronDown className="h-3.5 w-3.5" />
                                    : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                              </td>
                              {['chinese', 'pinyin', 'en', 'vi', 'sinoVietnamese'].map((field) => (
                                <td key={field} className="px-2 py-1">
                                  <input
                                    value={word[field] ?? ''}
                                    onChange={(e) => updateWord(idx, field, e.target.value)}
                                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 transition-colors hover:border-border focus:border-primary focus:bg-background focus:outline-none"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1 text-center">
                                <input
                                  type="checkbox"
                                  checked={word.notest ?? false}
                                  onChange={(e) => updateWord(idx, 'notest', e.target.checked)}
                                  className="h-4 w-4 cursor-pointer rounded border-border"
                                />
                              </td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => deleteWord(idx)}
                                  className="text-muted-foreground transition-colors hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>

                            {/* Samples expanded row */}
                            {expandedIdx === idx && (
                              <tr className="border-b border-border bg-muted/20">
                                <td colSpan={8} className="px-6 py-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t.curriculumSamples}
                                  </p>
                                  {word.samples?.length > 0 && (
                                    <table className="mb-3 w-full text-xs">
                                      <thead>
                                        <tr className="text-muted-foreground">
                                          <th className="pb-1 pr-2 text-left min-w-[130px]">{t.curriculumColSentence}</th>
                                          <th className="pb-1 pr-2 text-left min-w-[110px]">{t.curriculumColPinyin}</th>
                                          <th className="pb-1 pr-2 text-left min-w-[120px]">{t.curriculumColEnglish}</th>
                                          <th className="pb-1 pr-2 text-left min-w-[120px]">{t.curriculumColVietnamese}</th>
                                          <th className="w-6" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {word.samples.map((sample, sIdx) => (
                                          <tr key={sIdx}>
                                            {['sentence', 'pinyin', 'en', 'vi'].map((field) => (
                                              <td key={field} className="py-0.5 pr-2">
                                                <input
                                                  value={sample[field] ?? ''}
                                                  onChange={(e) => updateSample(idx, sIdx, field, e.target.value)}
                                                  className="w-full rounded border border-transparent bg-background px-1 py-0.5 transition-colors hover:border-border focus:border-primary focus:outline-none"
                                                />
                                              </td>
                                            ))}
                                            <td className="py-0.5">
                                              <button
                                                type="button"
                                                onClick={() => deleteSample(idx, sIdx)}
                                                className="text-muted-foreground transition-colors hover:text-destructive"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                  <Button variant="outline" size="sm" onClick={() => addSample(idx)} className="h-7 gap-1 text-xs">
                                    <Plus className="h-3 w-3" /> {t.curriculumAddSample}
                                  </Button>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-border p-4">
                    <Button variant="outline" size="sm" onClick={addWord} className="gap-2">
                      <Plus className="h-4 w-4" /> {t.curriculumAddWord}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      {/* Bulk free/lock confirmation */}
      <Modal open={!!bulkFreeConfirm} onClose={() => setBulkFreeConfirm(null)}>
        <ModalHeader onClose={() => setBulkFreeConfirm(null)}>
          <h2 className="text-base font-bold">
            {bulkFreeConfirm?.is_free ? t.curriculumAllFree : t.curriculumAllLocked}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground">
            {bulkFreeConfirm?.is_free ? t.curriculumBulkFreeConfirm : t.curriculumBulkLockConfirm}{' '}
            <strong className="text-foreground">{selectedBook?.short_title ?? selectedBook?.title}</strong>?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setBulkFreeConfirm(null)}>{t.curriculumCancel}</Button>
          <Button size="sm" onClick={confirmBulkFree}>{t.curriculumConfirm}</Button>
        </ModalFooter>
      </Modal>

      {/* is_free toggle confirmation */}
      <Modal open={!!freeConfirm} onClose={() => setFreeConfirm(null)}>
        <ModalHeader onClose={() => setFreeConfirm(null)}>
          <h2 className="text-base font-bold">
            {freeConfirm?.is_free ? t.curriculumMakeFree : t.curriculumLockLesson}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground">
            {freeConfirm?.is_free ? t.curriculumConfirmMakeFree : t.curriculumConfirmLock}{' '}
            <strong className="text-foreground">{freeConfirm?.title}</strong>{' '}
            {freeConfirm?.is_free ? t.curriculumConfirmMakeFreeEnd : t.curriculumConfirmLockEnd}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setFreeConfirm(null)}>{t.curriculumCancel}</Button>
          <Button size="sm" onClick={confirmToggleFree}>{t.curriculumConfirm}</Button>
        </ModalFooter>
      </Modal>

      {/* Lesson toggle confirmation */}
      <Modal open={!!lessonConfirm} onClose={() => setLessonConfirm(null)}>
        <ModalHeader onClose={() => setLessonConfirm(null)}>
          <h2 className="text-base font-bold">
            {lessonConfirm?.enabled ? t.curriculumEnableLesson : t.curriculumDisableLesson}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground">
            {lessonConfirm?.enabled ? t.curriculumConfirmEnable : t.curriculumConfirmDisable}{' '}
            <strong className="text-foreground">{lessonConfirm?.title}</strong>?
          </p>
          {!lessonConfirm?.enabled && (
            <p className="mt-2 text-xs text-amber-500">{t.curriculumDisableLessonWarn}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setLessonConfirm(null)}>{t.curriculumCancel}</Button>
          <Button size="sm" onClick={confirmToggleLesson}>{t.curriculumConfirm}</Button>
        </ModalFooter>
      </Modal>

      {/* Book toggle confirmation */}
      <Modal open={!!bookConfirm} onClose={() => setBookConfirm(null)}>
        <ModalHeader onClose={() => setBookConfirm(null)}>
          <h2 className="text-base font-bold">
            {bookConfirm?.enabled ? t.curriculumEnableBook : t.curriculumDisableBook}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground">
            {bookConfirm?.enabled ? t.curriculumConfirmEnable : t.curriculumConfirmDisable}{' '}
            <strong className="text-foreground">{bookConfirm?.title}</strong>?
          </p>
          {!bookConfirm?.enabled && (
            <p className="mt-2 text-xs text-amber-500">{t.curriculumDisableBookWarn}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={() => setBookConfirm(null)}>{t.curriculumCancel}</Button>
          <Button size="sm" onClick={confirmToggleBook}>{t.curriculumConfirm}</Button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
