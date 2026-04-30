import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, ChevronRight, Loader2, Library, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
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
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuthStore();
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
      <Card className="overflow-hidden border-theme-border bg-gradient-to-br from-theme-surface via-background to-background shadow-soft">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Teacher Workspace
              </p>
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                  Build books, lessons, and vocabulary sets
                </h2>
                <p className="text-sm leading-6 text-muted-foreground sm:text-base">
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
            <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Library className="h-4 w-4 text-primary" />
                Books
              </div>
              <p className="mt-3 text-3xl font-black text-foreground">{books.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Teaching books in your workspace</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Workflow
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">Book → Lesson → Words</p>
              <p className="mt-1 text-sm text-muted-foreground">Create structure first, then fill content</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Best Next Step
              </div>
              <p className="mt-3 text-base font-semibold text-foreground">Import lessons faster</p>
              <p className="mt-1 text-sm text-muted-foreground">Use Excel for bulk upload, then edit rows</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {creating && (
        <Card className="border-primary/20 bg-primary/5 shadow-soft">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={createBook} className="flex flex-col gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Create a new book</h3>
                <p className="text-sm text-muted-foreground">
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <textarea
                disabled={submitting}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
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
              <p className="text-lg font-semibold text-foreground">No books yet</p>
              <p className="text-muted-foreground">Create your first teaching book to start adding lessons.</p>
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
            <Card key={book.id} className="group overflow-hidden border-border/80 transition-shadow hover:shadow-md/70">
              <CardContent className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-foreground">{book.title}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{book.description}</p>
                  )}
                  {!book.description && (
                    <p className="text-sm italic text-muted-foreground">No description yet</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1">Book workspace</span>
                  <span className="rounded-full bg-muted px-3 py-1">Lessons inside</span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Open to manage lessons and sharing</p>
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
