import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Save, Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizeVocabularyItems } from '@/lib/utils';
import { parseVocabularyWorkbook } from '@/lib/excel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TeacherLayout from './TeacherLayout';

const EMPTY_WORD = {
  chinese: '', pinyin: '', english: '', vietnamese: '',
  sentenceChinese: '', sentencePinyin: '', sentenceEnglish: '', sentenceVietnamese: '',
};

export default function SectionEditor({ bookId, sectionId }) {
  const fileInputRef = useRef(null);

  const [section, setSection] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { added, skipped }
  const [addingWord, setAddingWord] = useState(false);
  const [form, setForm] = useState(EMPTY_WORD);
  const [formError, setFormError] = useState('');
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadSection(); }, [sectionId]);

  async function loadSection() {
    setLoading(true);
    const [{ data: sec }, { data: book }] = await Promise.all([
      supabase.from('user_sections').select('*').eq('id', sectionId).single(),
      supabase.from('user_books').select('title').eq('id', bookId).single(),
    ]);
    if (sec) {
      setSection(sec);
      setEditSectionTitle(sec.title);
      setWords(normalizeVocabularyItems(sec.words ?? []));
    }
    if (book) setBookTitle(book.title);
    setLoading(false);
  }

  async function saveSectionTitle(e) {
    e.preventDefault();
    setSavingTitle(true);
    await supabase.from('user_sections').update({ title: editSectionTitle.trim() }).eq('id', sectionId);
    setSection((s) => ({ ...s, title: editSectionTitle.trim() }));
    setSavingTitle(false);
  }

  async function addWord(e) {
    e.preventDefault();
    setFormError('');
    if (!form.chinese.trim() || !form.pinyin.trim() || !form.english.trim()) {
      setFormError('Chinese, Pinyin and English are required.');
      return;
    }
    const normalized = normalizeVocabularyItems([{
      ...form,
      vietnamese: form.vietnamese || form.english,
      sentenceVietnamese: form.sentenceVietnamese || form.sentenceEnglish,
    }]);
    if (!normalized.length) { setFormError('Invalid word data.'); return; }

    const newWord = normalized[0];

    // Deduplicate within same section
    if (words.some((w) => w.chinese === newWord.chinese)) {
      setFormError(`"${newWord.chinese}" already exists in this section.`);
      return;
    }

    const updatedWords = [...words, newWord];
    setSaving(true);
    const { error } = await supabase
      .from('user_sections')
      .update({ words: updatedWords })
      .eq('id', sectionId);
    if (error) { setFormError(error.message); setSaving(false); return; }

    setWords(updatedWords);
    setForm(EMPTY_WORD);
    setAddingWord(false);
    setSaving(false);
  }

  async function handleExcelUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploading(true);
    setUploadResult(null);
    try {
      const parsed = await parseVocabularyWorkbook(file);

      // Deduplicate against existing words in this section only
      const existingChinese = new Set(words.map((w) => w.chinese));
      const newWords = parsed.filter((w) => !existingChinese.has(w.chinese));
      const skipped = parsed.length - newWords.length;

      if (newWords.length === 0) {
        setUploadResult({ added: 0, skipped });
        setUploading(false);
        return;
      }

      const updatedWords = [...words, ...newWords];
      const { error } = await supabase
        .from('user_sections')
        .update({ words: updatedWords })
        .eq('id', sectionId);

      if (error) throw new Error(error.message);

      setWords(updatedWords);
      setUploadResult({ added: newWords.length, skipped });
    } catch (err) {
      setUploadResult({ error: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function deleteWord(wordId) {
    setDeletingId(wordId);
    const updatedWords = words.filter((w) => w.id !== wordId);
    await supabase.from('user_sections').update({ words: updatedWords }).eq('id', sectionId);
    setWords(updatedWords);
    setDeletingId(null);
  }

  function field(label, key, required = false, placeholder = '') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder || label}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>
    );
  }

  if (loading) return (
    <TeacherLayout crumbs={[{ label: '…', path: `/teacher/books/${bookId}` }, { label: '…', path: '#' }]}>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </CardContent></Card>
        ))}
      </div>
    </TeacherLayout>
  );

  return (
    <TeacherLayout crumbs={[
      { label: bookTitle, path: `/teacher/books/${bookId}` },
      { label: section?.title ?? 'Section', path: '#' },
    ]}>

      {/* Section title */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={saveSectionTitle} className="flex gap-2">
            <input
              value={editSectionTitle}
              onChange={(e) => setEditSectionTitle(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-green-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <Button type="submit" size="sm" variant="outline" disabled={savingTitle} className="gap-1.5 min-w-[100px]">
              {savingTitle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {savingTitle ? 'Saving…' : 'Save title'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Words header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          Words <span className="ml-1 text-base font-normal text-slate-400">({words.length})</span>
        </h3>
        <div className="flex gap-2">
          {/* Excel upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleExcelUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileSpreadsheet className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Upload Excel'}
          </Button>

          <Button size="sm" className="gap-2" onClick={() => setAddingWord((v) => !v)}>
            <Plus className="h-4 w-4" /> Add word
          </Button>
        </div>
      </div>

      {/* Upload result banner */}
      {uploadResult && (
        <Card className={uploadResult.error
          ? 'border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-900/10'
          : 'border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10'
        }>
          <CardContent className="flex items-center justify-between p-4">
            {uploadResult.error ? (
              <p className="text-sm text-rose-600">{uploadResult.error}</p>
            ) : (
              <p className="text-sm text-green-700 dark:text-green-400">
                <span className="font-semibold">{uploadResult.added} words added</span>
                {uploadResult.skipped > 0 && (
                  <span className="ml-2 text-slate-500">· {uploadResult.skipped} skipped (already in this section)</span>
                )}
              </p>
            )}
            <button type="button" onClick={() => setUploadResult(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </CardContent>
        </Card>
      )}

      {/* Add word form */}
      {addingWord && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10">
          <CardContent className="p-5">
            <form onSubmit={addWord} className="flex flex-col gap-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-200">New Word</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field('Chinese', 'chinese', true, '学')}
                {field('Pinyin', 'pinyin', true, 'xué')}
                {field('English', 'english', true, 'to learn')}
                {field('Vietnamese', 'vietnamese', false, 'học (optional)')}
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-700">
                  + Example sentence (optional)
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {field('Sentence (Chinese)', 'sentenceChinese', false, '我在学中文。')}
                  {field('Sentence (Pinyin)', 'sentencePinyin', false, 'Wǒ zài xué zhōngwén.')}
                  {field('Sentence (English)', 'sentenceEnglish', false, 'I am learning Chinese.')}
                  {field('Sentence (Vietnamese)', 'sentenceVietnamese', false, 'Tôi đang học tiếng Trung. (optional)')}
                </div>
              </details>
              {formError && <p className="text-sm text-rose-500">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving} className="gap-2 min-w-[100px]">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving…' : 'Add word'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setAddingWord(false); setForm(EMPTY_WORD); setFormError(''); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Word list */}
      {words.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Upload className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500">No words yet.</p>
            <p className="text-sm text-slate-400">Add words manually or upload an Excel file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {words.map((word, i) => (
            <Card key={word.id} className="group">
              <CardContent className="flex items-center gap-4 p-4">
                <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                  <span className="text-lg font-bold text-slate-800 dark:text-white">{word.chinese}</span>
                  <span className="text-sm text-slate-500">{word.pinyin}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{word.english}</span>
                  {word.vietnamese && word.vietnamese !== word.english && (
                    <span className="text-sm text-slate-400">{word.vietnamese}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteWord(word.id)}
                  disabled={deletingId === word.id}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  {deletingId === word.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
