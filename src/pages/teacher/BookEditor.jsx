import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, Save, Loader2, Layers3, FileText, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ShareControls from '@/components/ShareControls';
import TeacherLayout from './TeacherLayout';

export default function BookEditor({ bookId, onShareChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingBookDetails, setEditingBookDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [submittingSection, setSubmittingSection] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [bookError, setBookError] = useState('');

  useEffect(() => { loadBook(); }, [bookId]);

  useEffect(() => {
    if (!editingBookDetails) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        cancelEditingBookDetails();
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingBookDetails, book]);

  async function loadBook() {
    setLoading(true);
    const [{ data: bookData }, { data: sectionData }] = await Promise.all([
      supabase.from('user_books').select('*').eq('id', bookId).single(),
      supabase.from('user_sections').select('id, title, order, words').eq('book_id', bookId).order('order'),
    ]);
    if (bookData) {
      setBook(bookData);
      setEditTitle(bookData.title);
      setEditDesc(bookData.description ?? '');
    }
    setSections(sectionData ?? []);
    setLoading(false);
  }

  async function saveBook(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('user_books')
      .update({ title: editTitle.trim(), description: editDesc.trim() })
      .eq('id', bookId);
    setSaving(false);
    if (error) { setBookError(error.message); return; }
    setBook((b) => ({ ...b, title: editTitle.trim(), description: editDesc.trim() }));
    setEditingBookDetails(false);
  }

  function startEditingBookDetails() {
    setEditTitle(book?.title ?? '');
    setEditDesc(book?.description ?? '');
    setEditingBookDetails(true);
  }

  function cancelEditingBookDetails() {
    setEditTitle(book?.title ?? '');
    setEditDesc(book?.description ?? '');
    setEditingBookDetails(false);
    setBookError('');
  }

  async function addSection(e) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setSectionError('');
    setSubmittingSection(true);
    const order = sections.length;
    const { data, error } = await supabase
      .from('user_sections')
      .insert({ book_id: bookId, user_id: user.id, title: newSectionTitle.trim(), order, words: [] })
      .select()
      .single();
    setSubmittingSection(false);
    if (error) { setSectionError(error.message); return; }
    setSections((prev) => [...prev, data]);
    setNewSectionTitle('');
    setAddingSection(false);
  }

  async function deleteSection(id) {
    if (!confirm('Delete this section and all its words?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('user_sections').delete().eq('id', id);
    if (!error) setSections((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  }

  if (loading) return (
    <TeacherLayout crumbs={[{ label: '…', path: '#' }]}>
      <div className="flex flex-col gap-3">
        {[1,2].map((i) => (
          <Card key={i}><CardContent className="p-5">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </CardContent></Card>
        ))}
      </div>
    </TeacherLayout>
  );

  return (
    <TeacherLayout crumbs={[{ label: book?.title ?? 'Book', path: `/teacher/books/${bookId}` }]}>
      <Card className="overflow-hidden border-theme-border bg-gradient-to-br from-[#ECFAE5] via-white to-[#F8FFF5] shadow-soft dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-green-700 dark:text-green-400">
                    {book?.title || 'Book details'}
                  </h2>
                  <button
                    type="button"
                    onClick={startEditingBookDetails}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-green-200 bg-white text-green-700 transition-colors hover:bg-green-50 dark:border-slate-600 dark:bg-slate-800 dark:text-green-400 dark:hover:bg-slate-700"
                    aria-label="Edit book title and description"
                    title="Edit book title and description"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Layers3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span>Lessons: {sections.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span>
                      Words: {sections.reduce((total, section) => total + (section.words?.length ?? 0), 0)}
                    </span>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {book?.description?.trim() || 'No description yet'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {book && <ShareControls book={book} onBookChange={(updated) => { setBook(updated); onShareChange?.(updated); }} embedded inline />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Lessons in this book</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create lessons here, then open each one to manage words, Excel import, and editing.
          </p>
        </div>
        <Button size="sm" className="gap-2 self-start sm:self-auto" onClick={() => setAddingSection(true)}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>

      {addingSection && (
        <Card className="border-green-200 bg-green-50/80 shadow-soft dark:border-green-800/40 dark:bg-green-900/10">
          <CardContent className="p-5">
            <form onSubmit={addSection} className="flex flex-col gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800 dark:text-white">Create a new lesson</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Use a clear lesson name such as `Lesson 1`, `Unit 2`, or a topic title.
                </p>
              </div>
              <input
                autoFocus
                required
                disabled={submittingSection}
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Section title (e.g. Unit 1)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={submittingSection} className="gap-1.5 min-w-[70px]">
                  {submittingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={submittingSection} onClick={() => { setAddingSection(false); setSectionError(''); }}>Cancel</Button>
              </div>
            </form>
            {sectionError && <p className="mt-2 text-sm text-rose-500">{sectionError}</p>}
          </CardContent>
        </Card>
      )}

      {sections.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <Layers3 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No lessons yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add the first lesson in this book, then open it to import or edit vocabulary.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto pr-1 sm:max-h-[620px]">
          <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <Card key={section.id} className="group overflow-hidden border-slate-200/80 transition-shadow hover:shadow-md/70">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{section.title}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {section.words?.length ?? 0} words
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSection(section.id)}
                    disabled={deletingId === section.id}
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    {deletingId === section.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => navigate(`/teacher/books/${bookId}/sections/${section.id}`)}
                  >
                    Open lesson <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      {editingBookDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          onClick={cancelEditingBookDetails}
        >
          <Card
            className="w-full max-w-lg border-slate-200 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CardContent className="p-5 sm:p-6">
              <form onSubmit={saveBook} className="flex flex-col gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit book details</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Update the title and description shown on this book page.
                  </p>
                </div>
                <input
                  autoFocus
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Book title"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                {bookError && <p className="text-sm text-rose-500">{bookError}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={saving} onClick={cancelEditingBookDetails}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving} className="gap-2 min-w-[96px]">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? 'Saving…' : 'Save changes'}
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
