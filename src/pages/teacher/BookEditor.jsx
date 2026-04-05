import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ShareControls from '@/components/ShareControls';
import TeacherLayout from './TeacherLayout';

export default function BookEditor({ bookId }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [submittingSection, setSubmittingSection] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadBook(); }, [bookId]);

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
    if (!error) setBook((b) => ({ ...b, title: editTitle.trim(), description: editDesc.trim() }));
    setSaving(false);
  }

  async function addSection(e) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setError('');
    setSubmittingSection(true);
    const order = sections.length;
    const { data, error } = await supabase
      .from('user_sections')
      .insert({ book_id: bookId, user_id: user.id, title: newSectionTitle.trim(), order, words: [] })
      .select()
      .single();
    setSubmittingSection(false);
    if (error) { setError(error.message); return; }
    setSections((prev) => [...prev, data]);
    setNewSectionTitle('');
    setAddingSection(false);
  }

  async function deleteSection(id) {
    if (!confirm('Delete this section and all its words?')) return;
    setDeletingId(id);
    await supabase.from('user_sections').delete().eq('id', id);
    setSections((prev) => prev.filter((s) => s.id !== id));
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

      {/* Book meta */}
      <Card>
        <CardContent className="p-5">
          <form onSubmit={saveBook} className="flex flex-col gap-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Book details</h3>
            <input
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Book title"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <div>
              <Button type="submit" size="sm" disabled={saving} className="gap-2 min-w-[80px]">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Share controls */}
      {book && <ShareControls book={book} onBookChange={setBook} />}

      {/* Sections */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sections</h3>
        <Button size="sm" className="gap-2" onClick={() => setAddingSection(true)}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>

      {addingSection && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10">
          <CardContent className="p-4">
            <form onSubmit={addSection} className="flex gap-2">
              <input
                autoFocus
                required
                disabled={submittingSection}
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="Section title (e.g. Unit 1)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <Button type="submit" size="sm" disabled={submittingSection} className="gap-1.5 min-w-[70px]">
                {submittingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={submittingSection} onClick={() => { setAddingSection(false); setError(''); }}>Cancel</Button>
            </form>
            {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {sections.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">No sections yet. Add your first section!</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <Card key={section.id} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white">{section.title}</p>
                  <p className="text-sm text-slate-500">{section.words?.length ?? 0} words</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSection(section.id)}
                    disabled={deletingId === section.id}
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
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
                    Edit words <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
