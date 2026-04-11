import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Save, Loader2, Upload, FileSpreadsheet, Pencil } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { added, skipped }
  const [addingWord, setAddingWord] = useState(false);
  const [form, setForm] = useState(EMPTY_WORD);
  const [formError, setFormError] = useState('');
  const [editingWordId, setEditingWordId] = useState(null);
  const [editingWordForm, setEditingWordForm] = useState(EMPTY_WORD);
  const [editingWordError, setEditingWordError] = useState('');
  const [savingWordEdit, setSavingWordEdit] = useState(false);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [editingSectionTitle, setEditingSectionTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadSection(); }, [sectionId]);

  useEffect(() => {
    if (!editingWordId) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeEditWordModal();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingWordId]);

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
    if (!editSectionTitle.trim()) return;
    setTitleError('');
    setSavingTitle(true);
    const { error } = await supabase.from('user_sections').update({ title: editSectionTitle.trim() }).eq('id', sectionId);
    setSavingTitle(false);
    if (error) { setTitleError(error.message); return; }
    setSection((s) => ({ ...s, title: editSectionTitle.trim() }));
    setEditingSectionTitle(false);
  }

  function startEditingSectionTitle() {
    setEditSectionTitle(section?.title ?? '');
    setEditingSectionTitle(true);
  }

  function cancelEditingSectionTitle() {
    setEditSectionTitle(section?.title ?? '');
    setEditingSectionTitle(false);
    setTitleError('');
  }

  async function addWord(e) {
    e.preventDefault();
    setFormError('');
    if (!form.chinese.trim() || !form.pinyin.trim() || !form.english.trim()) {
      setFormError('Chinese, Pinyin and English are required.');
      return;
    }
    const normalized = normalizeVocabularyItems([{ ...form }]);
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
    const { error } = await supabase.from('user_sections').update({ words: updatedWords }).eq('id', sectionId);
    if (!error) setWords(updatedWords);
    setDeletingId(null);
  }

  function openEditWordModal(word) {
    setEditingWordId(word.id);
    setEditingWordForm({
      chinese: word.chinese ?? '',
      pinyin: word.pinyin ?? '',
      english: word.english ?? '',
      vietnamese: word.vietnamese ?? '',
      sentenceChinese: word.sentenceChinese ?? '',
      sentencePinyin: word.sentencePinyin ?? '',
      sentenceEnglish: word.sentenceEnglish ?? '',
      sentenceVietnamese: word.sentenceVietnamese ?? '',
    });
    setEditingWordError('');
  }

  function closeEditWordModal() {
    setEditingWordId(null);
    setEditingWordForm(EMPTY_WORD);
    setEditingWordError('');
  }

  async function saveEditedWord(e) {
    e.preventDefault();
    setEditingWordError('');

    if (!editingWordForm.chinese.trim() || !editingWordForm.pinyin.trim() || !editingWordForm.english.trim()) {
      setEditingWordError('Chinese, Pinyin and English are required.');
      return;
    }

    const normalized = normalizeVocabularyItems([{ ...editingWordForm, id: editingWordId }]);

    if (!normalized.length) {
      setEditingWordError('Invalid word data.');
      return;
    }

    const updatedWord = normalized[0];

    if (words.some((word) => word.id !== editingWordId && word.chinese === updatedWord.chinese)) {
      setEditingWordError(`"${updatedWord.chinese}" already exists in this section.`);
      return;
    }

    const updatedWords = words.map((word) => (word.id === editingWordId ? { ...updatedWord, id: editingWordId } : word));

    setSavingWordEdit(true);
    const { error } = await supabase
      .from('user_sections')
      .update({ words: updatedWords })
      .eq('id', sectionId);

    if (error) {
      setEditingWordError(error.message);
      setSavingWordEdit(false);
      return;
    }

    setWords(updatedWords);
    setSavingWordEdit(false);
    closeEditWordModal();
  }

  function field(label, key, required = false, placeholder = '', values = form, setValues = setForm) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        <input
          value={values[key]}
          onChange={(e) => setValues((current) => ({ ...current, [key]: e.target.value }))}
          placeholder={placeholder || label}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
      </div>
    );
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredWords = normalizedQuery
    ? words.filter((word) => [
      word.chinese,
      word.pinyin,
      word.english,
      word.vietnamese,
      word.sentenceChinese,
      word.sentencePinyin,
      word.sentenceEnglish,
      word.sentenceVietnamese,
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedQuery)))
    : words;

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

      <div className="px-1">
        <div className="py-1">
          {editingSectionTitle ? (
            <form onSubmit={saveSectionTitle} className="flex flex-col gap-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  autoFocus
                  value={editSectionTitle}
                  onChange={(e) => setEditSectionTitle(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-green-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" variant="outline" disabled={savingTitle} className="gap-1.5 min-w-[100px]">
                    {savingTitle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {savingTitle ? 'Saving…' : 'Save title'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={savingTitle} onClick={cancelEditingSectionTitle}>
                    Cancel
                  </Button>
                </div>
              </div>
              {titleError && <p className="text-sm text-rose-500">{titleError}</p>}
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-green-700 dark:text-green-400">
                  {section?.title || 'Section'}
                </h2>
                <button
                  type="button"
                  onClick={startEditingSectionTitle}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-green-200 bg-white text-green-700 transition-colors hover:bg-green-50 dark:border-slate-600 dark:bg-slate-800 dark:text-green-400 dark:hover:bg-slate-700"
                  aria-label="Edit section title"
                  title="Edit section title"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Words header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          Words <span className="ml-1 text-base font-normal text-slate-400">({filteredWords.length}/{words.length})</span>
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 sm:w-[220px] dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />

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
      ) : filteredWords.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-slate-500">No matching words.</p>
            <p className="text-sm text-slate-400">Try another keyword or clear the search box.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr className="border-b border-slate-200">
                  <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Chinese</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Pinyin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">English</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Vietnamese</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sentence Chinese</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sentence Pinyin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sentence English</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Sentence Vietnamese</th>
                  <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((word, i) => (
                  <tr key={word.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="px-4 py-3 align-top text-xs font-bold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 align-top font-semibold text-slate-800 dark:text-white">{word.chinese}</td>
                    <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400">{word.pinyin}</td>
                    <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-300">{word.english}</td>
                    <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400">
                      {word.vietnamese || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                      {word.sentenceChinese || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400">
                      {word.sentencePinyin || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                      {word.sentenceEnglish || '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-500 dark:text-slate-400">
                      {word.sentenceVietnamese || '—'}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditWordModal(word)}
                          className="text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Edit word"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWord(word.id)}
                          disabled={deletingId === word.id}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete word"
                        >
                          {deletingId === word.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editingWordId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          onClick={closeEditWordModal}
        >
          <Card
            className="w-full max-w-4xl border-slate-200 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CardContent className="p-5 sm:p-6">
              <form onSubmit={saveEditedWord} className="flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit word</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Update the full vocabulary record for this lesson.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {field('Chinese', 'chinese', true, '学', editingWordForm, setEditingWordForm)}
                  {field('Pinyin', 'pinyin', true, 'xué', editingWordForm, setEditingWordForm)}
                  {field('English', 'english', true, 'to learn', editingWordForm, setEditingWordForm)}
                  {field('Vietnamese', 'vietnamese', false, 'học (optional)', editingWordForm, setEditingWordForm)}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {field('Sentence (Chinese)', 'sentenceChinese', false, '我在学中文。', editingWordForm, setEditingWordForm)}
                  {field('Sentence (Pinyin)', 'sentencePinyin', false, 'Wǒ zài xué zhōngwén.', editingWordForm, setEditingWordForm)}
                  {field('Sentence (English)', 'sentenceEnglish', false, 'I am learning Chinese.', editingWordForm, setEditingWordForm)}
                  {field('Sentence (Vietnamese)', 'sentenceVietnamese', false, 'Tôi đang học tiếng Trung. (optional)', editingWordForm, setEditingWordForm)}
                </div>

                {editingWordError && <p className="text-sm text-rose-500">{editingWordError}</p>}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={savingWordEdit} onClick={closeEditWordModal}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={savingWordEdit} className="gap-2 min-w-[96px]">
                    {savingWordEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {savingWordEdit ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </TeacherLayout>
  );
}
