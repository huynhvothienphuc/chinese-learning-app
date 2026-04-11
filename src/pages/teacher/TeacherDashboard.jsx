import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, ChevronRight, Loader2, Library, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TeacherLayout from './TeacherLayout';

function BookSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadBooks(); }, []);

  async function loadBooks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_books')
      .select('id, title, description, created_at')
      .order('created_at', { ascending: false });
    if (!error) setBooks(data ?? []);
    setLoading(false);
  }

  async function createBook(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError('');
    setSubmitting(true);
    const { data, error } = await supabase
      .from('user_books')
      .insert({ user_id: user.id, title: newTitle.trim(), description: newDesc.trim() })
      .select()
      .single();
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    setBooks((prev) => [data, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setCreating(false);
  }

  async function deleteBook(id) {
    if (!confirm('Delete this book and all its sections?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('user_books').delete().eq('id', id);
    if (!error) setBooks((prev) => prev.filter((b) => b.id !== id));
    setDeletingId(null);
  }

  return (
    <TeacherLayout>
      <Card className="overflow-hidden border-theme-border bg-gradient-to-br from-[#ECFAE5] via-white to-[#F8FFF5] shadow-soft dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">
                Teacher Workspace
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Build books, lessons, and vocabulary sets
                </h2>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  Start with a book, add lessons, then import or edit words. This space is designed for
                  fast lesson setup without changing your existing data workflow.
                </p>
              </div>
            </div>
            <Button onClick={() => setCreating(true)} className="gap-2 self-start" disabled={creating}>
              <Plus className="h-4 w-4" />
              New book
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Library className="h-4 w-4 text-green-600 dark:text-green-400" />
                Books
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{books.length}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Teaching books in your workspace</p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                Workflow
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Book → Lesson → Words</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create structure first, then fill content</p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                Best Next Step
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Import lessons faster</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use Excel for bulk upload, then edit rows</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {creating && (
        <Card className="border-green-200 bg-green-50/80 shadow-soft dark:border-green-800/40 dark:bg-green-900/10">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={createBook} className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create a new book</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Set up the book first. You can add lessons and words after it is created.
                </p>
              </div>
              <input
                autoFocus
                required
                disabled={submitting}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Book title"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <textarea
                disabled={submitting}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              {error && <p className="text-sm text-rose-500">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={submitting} className="gap-2 min-w-[90px]">
                  {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</> : 'Create'}
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => { setCreating(false); setError(''); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <BookSkeleton />
          <BookSkeleton />
          <BookSkeleton />
        </div>
      ) : books.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300" />
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No books yet</p>
              <p className="text-slate-500">Create your first teaching book to start adding lessons.</p>
            </div>
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create first book
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {books.map((book) => (
            <Card key={book.id} className="group overflow-hidden border-slate-200/80 transition-shadow hover:shadow-md/70">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-800 dark:text-white">{book.title}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Created {new Date(book.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBook(book.id)}
                    disabled={deletingId === book.id}
                    className="shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    {deletingId === book.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="min-h-[44px]">
                  {book.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{book.description}</p>
                  )}
                  {!book.description && (
                    <p className="text-sm italic text-slate-400 dark:text-slate-500">No description yet</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Book workspace</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Lessons inside</span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Open to manage lessons and sharing</p>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/teacher/books/${book.id}`)}>
                    Open book <ChevronRight className="h-3.5 w-3.5" />
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
