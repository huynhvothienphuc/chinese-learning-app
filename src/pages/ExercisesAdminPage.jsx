import { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLocale } from '@/hooks/useLocale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── segment helpers (Sentence Order) ────────────────────────────────────────
// Segments are their own field, never embedded in `sentence`/`pinyin` — those
// render verbatim to students elsewhere (WordListView, Flashcard, TTS).

function segmentsChineseText(row) {
  return (row.segments || []).map((s) => s.chinese).join('/');
}

function segmentsPinyinText(row) {
  return (row.segments || []).map((s) => s.pinyin).join('/');
}

function segmentsFromInput(existingSegments, field, rawText) {
  const chineseParts = field === 'chinese' ? rawText.split('/') : (existingSegments || []).map((s) => s.chinese);
  const pinyinParts = field === 'pinyin' ? rawText.split('/') : (existingSegments || []).map((s) => s.pinyin);
  if (chineseParts.length === 1 && !chineseParts[0] && pinyinParts.length === 1 && !pinyinParts[0]) return [];
  const len = Math.max(chineseParts.length, pinyinParts.length);
  return Array.from({ length: len }, (_, k) => ({ chinese: chineseParts[k] ?? '', pinyin: pinyinParts[k] ?? '' }));
}

// `sentence`/`pinyin` are derived from segments (not typed separately), so
// there's nothing left to cross-check against — just structural completeness.
function segmentsValidation(row) {
  const segments = row.segments || [];
  if (segments.length === 0) return null;
  if (segments.length < 2) return { ok: false, message: 'Cần ít nhất 2 cụm' };
  const hasEmptyCell = segments.some((s) => !s.chinese.trim() || !s.pinyin.trim());
  if (hasEmptyCell) return { ok: false, message: 'Còn ô Chinese/Pinyin trống ở 1 cụm nào đó' };
  return { ok: true, message: 'Hợp lệ — sẵn sàng cho bài tập Sắp xếp câu' };
}

function deriveSentenceFields(segments) {
  return {
    sentence: (segments || []).map((s) => s.chinese).join(''),
    pinyin: (segments || []).map((s) => s.pinyin).join(' '),
  };
}

// ── bracket-marker helpers (Fill in the Blank) ──────────────────────────────
// Admin marks the blank inline with [ ] in both the Sentence and Pinyin
// inputs instead of retyping the target word/pinyin as separate fields.

function extractBracketTarget(text) {
  const raw = text || '';
  const match = raw.match(/\[([^\]]*)\]/);
  return { clean: raw.replace(/[[\]]/g, ''), target: match ? match[1] : '' };
}

function withBracket(clean, target) {
  if (!clean || !target) return clean || '';
  const idx = clean.indexOf(target);
  if (idx < 0) return clean;
  return `${clean.slice(0, idx)}[${target}]${clean.slice(idx + target.length)}`;
}

function fillBlankValidation(row) {
  if (!row.sentence && !row.target_chinese) return null;
  if (!row.target_chinese) return { ok: false, message: 'Chưa đánh dấu từ cần điền trong Câu — bọc từ đó trong [ ]' };
  if (!row.target_pinyin) return { ok: false, message: 'Chưa đánh dấu pinyin cần điền — bọc trong [ ]' };
  if (!row.sentence?.includes(row.target_chinese)) return { ok: false, message: 'Câu không chứa đúng từ đã đánh dấu' };
  return { ok: true, message: 'Hợp lệ — sẵn sàng cho bài tập Điền từ' };
}

// ── shared flash-on-valid status icon ───────────────────────────────────────

function StatusIcon({ validation }) {
  const [flash, setFlash] = useState(false);
  const wasOk = useRef(validation?.ok ?? false);

  useEffect(() => {
    if (validation?.ok && !wasOk.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
    wasOk.current = validation?.ok ?? false;
  }, [validation?.ok]);

  if (!validation) return <span className="block h-3.5 w-3.5" />;

  return (
    <span
      title={validation.message}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-700 ${flash ? 'bg-emerald-100 dark:bg-emerald-900/40' : ''}`}
    >
      {validation.ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
    </span>
  );
}

// ── generic per-row CRUD ─────────────────────────────────────────────────────
// Real tables now (not a jsonb blob) — add/edit/delete each write immediately
// instead of a page-level dirty flag + batch save.

function makeRowCrud(table, emptyFields, setRows) {
  return {
    async add(lessonId) {
      const { data, error } = await supabase.from(table)
        .insert({ lesson_id: lessonId, ...emptyFields })
        .select()
        .single();
      if (!error && data) setRows((prev) => [...prev, data]);
    },
    updateLocal(id, field, value) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    async commit(id, field, value, onSaved) {
      await supabase.from(table).update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
      onSaved?.();
    },
    async commitFields(id, fields, onSaved) {
      await supabase.from(table).update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
      onSaved?.();
    },
    async remove(id) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      await supabase.from(table).delete().eq('id', id);
    },
  };
}

function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

const inputClass = 'w-full rounded border border-border bg-background px-1 py-0.5 transition-colors hover:border-primary/50 focus:border-primary focus:outline-none';

// ── main ──────────────────────────────────────────────────────────────────────

export default function ExercisesAdminPage() {
  const { role, roleReady } = useAuthStore();
  const navigate = useNavigate();
  const t = useLocale();

  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [booksLoading, setBooksLoading] = useState(true);

  const [lessons, setLessons] = useState([]);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const [sentenceRows, setSentenceRows] = useState([]);
  const [fillBlankRows, setFillBlankRows] = useState([]);
  const [grammarRows, setGrammarRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [flashRowKey, setFlashRowKey] = useState(null);

  useEffect(() => {
    if (roleReady && role !== 'superadmin') navigate('/');
  }, [roleReady, role, navigate]);

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

  useEffect(() => {
    if (!selectedBookId) return;
    setLessonsLoading(true);
    setSelectedLessonId(null);
    supabase.from('lessons')
      .select('id,book_id,title,order')
      .eq('book_id', selectedBookId)
      .then(({ data }) => setLessons((data ?? []).sort((a, b) => a.order - b.order)))
      .finally(() => setLessonsLoading(false));
  }, [selectedBookId]);

  useEffect(() => {
    if (!selectedLessonId) return;
    setRowsLoading(true);
    Promise.all([
      supabase.from('lesson_sentence_exercises').select('*').eq('lesson_id', selectedLessonId).order('order'),
      supabase.from('lesson_fill_blank_exercises').select('*').eq('lesson_id', selectedLessonId).order('order'),
      supabase.from('lesson_grammar_qa').select('*').eq('lesson_id', selectedLessonId).order('order'),
    ]).then(([sentence, fillBlank, grammar]) => {
      setSentenceRows(sentence.data ?? []);
      setFillBlankRows(fillBlank.data ?? []);
      setGrammarRows(grammar.data ?? []);
    }).finally(() => setRowsLoading(false));
  }, [selectedLessonId]);

  const sentenceCrud = makeRowCrud('lesson_sentence_exercises', { sentence: '', pinyin: '', segments: [] }, setSentenceRows);
  const fillBlankCrud = makeRowCrud('lesson_fill_blank_exercises', { sentence: '', pinyin: '', target_chinese: '', target_pinyin: '', target_meaning: '' }, setFillBlankRows);
  const grammarCrud = makeRowCrud('lesson_grammar_qa', { question_chinese: '', question_pinyin: '', answer_chinese: '', answer_pinyin: '' }, setGrammarRows);

  function flashSaved(key) {
    setFlashRowKey(key);
    setTimeout(() => setFlashRowKey((prev) => (prev === key ? null : prev)), 700);
  }

  const selectedBook = books.find((b) => b.id === selectedBookId);

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
            <h1 className="text-3xl font-black">{t.exercisesTitle}</h1>
          </div>
        </div>

        {/* Books + Lessons */}
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {selectedBook ? `${selectedBook.short_title ?? selectedBook.title} — ${t.curriculumLessonsHeader}` : t.curriculumLessonsHeader}
              </CardTitle>
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
                        <th className="w-24 px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {lessons.map((lesson) => (
                        <tr key={lesson.id} className={`border-b border-border last:border-0 transition-colors ${selectedLessonId === lesson.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                          <td className="px-4 py-2 text-muted-foreground">{lesson.order}</td>
                          <td className="px-4 py-2 font-medium">{lesson.title}</td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              size="sm"
                              variant={selectedLessonId === lesson.id ? 'default' : 'outline'}
                              onClick={() => setSelectedLessonId(selectedLessonId === lesson.id ? null : lesson.id)}
                            >
                              {selectedLessonId === lesson.id ? t.curriculumCancel : t.exercisesSelectLesson}
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

        {selectedLessonId && (
          rowsLoading ? (
            <Card><CardContent><Skeleton rows={4} /></CardContent></Card>
          ) : (
            <>
              {/* Sentence Order */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>{t.exercisesSentenceOrderTitle}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {sentenceRows.length > 0 && (
                    <div className="mb-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="pb-1 pr-2 text-left min-w-[180px]">{t.exercisesColSegmentsChinese}</th>
                            <th className="pb-1 pr-2 text-left min-w-[180px]">{t.exercisesColSegmentsPinyin}</th>
                            <th className="w-6" />
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {sentenceRows.map((row) => {
                            function commitSegments(nextSegments) {
                              sentenceCrud.updateLocal(row.id, 'segments', nextSegments);
                              sentenceCrud.commitFields(row.id, { segments: nextSegments, ...deriveSentenceFields(nextSegments) }, () => flashSaved(`sentence-${row.id}`));
                            }
                            return (
                              <Fragment key={row.id}>
                                <tr className={cn('transition-colors duration-700', flashRowKey === `sentence-${row.id}` && 'bg-emerald-50 dark:bg-emerald-900/20')}>
                                  <td className="py-0.5 pr-2">
                                    <input
                                      value={segmentsChineseText(row)}
                                      placeholder="假朋友/而/不会"
                                      onChange={(e) => sentenceCrud.updateLocal(row.id, 'segments', segmentsFromInput(row.segments, 'chinese', e.target.value))}
                                      onBlur={() => commitSegments(row.segments)}
                                      className={inputClass}
                                    />
                                  </td>
                                  <td className="py-0.5 pr-2">
                                    <input
                                      value={segmentsPinyinText(row)}
                                      placeholder="Jiǎ péngyou/ér/bú huì"
                                      onChange={(e) => sentenceCrud.updateLocal(row.id, 'segments', segmentsFromInput(row.segments, 'pinyin', e.target.value))}
                                      onBlur={() => commitSegments(row.segments)}
                                      className={inputClass}
                                    />
                                  </td>
                                  <td className="py-0.5 text-center"><StatusIcon validation={segmentsValidation(row)} /></td>
                                  <td className="py-0.5">
                                    <button type="button" onClick={() => sentenceCrud.remove(row.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                                {row.sentence && (
                                  <tr>
                                    <td colSpan={4} className="pb-1.5 pl-1 text-muted-foreground">
                                      = {row.sentence} · {row.pinyin}
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => sentenceCrud.add(selectedLessonId)} className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> {t.exercisesAddRow}
                  </Button>
                </CardContent>
              </Card>

              {/* Fill in the Blank */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>{t.exercisesFillBlankTitle}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <p className="mb-2 text-xs text-muted-foreground">{t.exercisesFillBlankHint}</p>
                  {fillBlankRows.length > 0 && (
                    <div className="mb-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="pb-1 pr-2 text-left min-w-[180px]">{t.curriculumColSentence}</th>
                            <th className="pb-1 pr-2 text-left min-w-[180px]">{t.curriculumColPinyin}</th>
                            <th className="pb-1 pr-2 text-left min-w-[140px]">{t.exercisesColTargetMeaning}</th>
                            <th className="w-6" />
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {fillBlankRows.map((row) => {
                            function commitSentence(rawText) {
                              const { clean, target } = extractBracketTarget(rawText);
                              fillBlankCrud.updateLocal(row.id, 'sentence', clean);
                              fillBlankCrud.updateLocal(row.id, 'target_chinese', target);
                              fillBlankCrud.commitFields(row.id, { sentence: clean, target_chinese: target }, () => flashSaved(`fillblank-${row.id}`));
                            }
                            function commitPinyin(rawText) {
                              const { clean, target } = extractBracketTarget(rawText);
                              fillBlankCrud.updateLocal(row.id, 'pinyin', clean);
                              fillBlankCrud.updateLocal(row.id, 'target_pinyin', target);
                              fillBlankCrud.commitFields(row.id, { pinyin: clean, target_pinyin: target }, () => flashSaved(`fillblank-${row.id}`));
                            }
                            return (
                              <Fragment key={row.id}>
                                <tr className={cn('transition-colors duration-700', flashRowKey === `fillblank-${row.id}` && 'bg-emerald-50 dark:bg-emerald-900/20')}>
                                  <td className="py-0.5 pr-2">
                                    <input
                                      defaultValue={withBracket(row.sentence, row.target_chinese)}
                                      key={`sentence-${row.id}-${row.sentence}`}
                                      placeholder="你[好]嗎？"
                                      onBlur={(e) => commitSentence(e.target.value)}
                                      className={inputClass}
                                    />
                                  </td>
                                  <td className="py-0.5 pr-2">
                                    <input
                                      defaultValue={withBracket(row.pinyin, row.target_pinyin)}
                                      key={`pinyin-${row.id}-${row.pinyin}`}
                                      placeholder="nǐ [hǎo] ma?"
                                      onBlur={(e) => commitPinyin(e.target.value)}
                                      className={inputClass}
                                    />
                                  </td>
                                  <td className="py-0.5 pr-2">
                                    <input
                                      value={row.target_meaning ?? ''}
                                      onChange={(e) => fillBlankCrud.updateLocal(row.id, 'target_meaning', e.target.value)}
                                      onBlur={(e) => fillBlankCrud.commit(row.id, 'target_meaning', e.target.value, () => flashSaved(`fillblank-${row.id}`))}
                                      className={inputClass}
                                    />
                                  </td>
                                  <td className="py-0.5 text-center"><StatusIcon validation={fillBlankValidation(row)} /></td>
                                  <td className="py-0.5">
                                    <button type="button" onClick={() => fillBlankCrud.remove(row.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                                {row.sentence && (
                                  <tr>
                                    <td colSpan={5} className="pb-1.5 pl-1 text-muted-foreground">
                                      = {row.sentence} · {row.pinyin} {row.target_chinese && `(${t.exercisesColTargetChinese}: ${row.target_chinese} · ${row.target_pinyin})`}
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fillBlankCrud.add(selectedLessonId)} className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> {t.exercisesAddRow}
                  </Button>
                </CardContent>
              </Card>

              {/* Q&A Matching */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>{t.exercisesMatchingTitle}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {grammarRows.length > 0 && (
                    <div className="mb-3 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="pb-1 pr-2 text-left min-w-[140px]">{t.exercisesColQuestionChinese}</th>
                            <th className="pb-1 pr-2 text-left min-w-[130px]">{t.exercisesColQuestionPinyin}</th>
                            <th className="pb-1 pr-2 text-left min-w-[140px]">{t.exercisesColAnswerChinese}</th>
                            <th className="pb-1 pr-2 text-left min-w-[130px]">{t.exercisesColAnswerPinyin}</th>
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {grammarRows.map((row) => (
                            <tr key={row.id} className={cn('transition-colors duration-700', flashRowKey === `grammar-${row.id}` && 'bg-emerald-50 dark:bg-emerald-900/20')}>
                              {['question_chinese', 'question_pinyin', 'answer_chinese', 'answer_pinyin'].map((field) => (
                                <td key={field} className="py-0.5 pr-2">
                                  <input
                                    value={row[field] ?? ''}
                                    onChange={(e) => grammarCrud.updateLocal(row.id, field, e.target.value)}
                                    onBlur={(e) => grammarCrud.commit(row.id, field, e.target.value, () => flashSaved(`grammar-${row.id}`))}
                                    className={inputClass}
                                  />
                                </td>
                              ))}
                              <td className="py-0.5">
                                <button type="button" onClick={() => grammarCrud.remove(row.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => grammarCrud.add(selectedLessonId)} className="h-7 gap-1 text-xs">
                    <Plus className="h-3 w-3" /> {t.exercisesAddRow}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        )}

      </div>
    </div>
  );
}
