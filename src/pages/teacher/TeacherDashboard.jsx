import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TeacherLayout from './TeacherLayout';

function BookSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
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
    await supabase.from('user_books').delete().eq('id', id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setDeletingId(null);
  }

  return (
    <TeacherLayout>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">My Books</h2>
        <Button onClick={() => setCreating(true)} className="gap-2" disabled={creating}>
          <Plus className="h-4 w-4" />
          New book
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10">
          <CardContent className="p-5">
            <form onSubmit={createBook} className="flex flex-col gap-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">New Book</h3>
              <input
                autoFocus
                required
                disabled={submitting}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Book title"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              <input
                disabled={submitting}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
              {error && <p className="text-sm text-rose-500">{error}</p>}
              <div className="flex gap-2">
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

      {/* Book list */}
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
            <p className="text-slate-500">No books yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {books.map((book) => (
            <Card key={book.id} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">{book.title}</p>
                  {book.description && (
                    <p className="mt-0.5 text-sm text-slate-500 truncate">{book.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBook(book.id)}
                    disabled={deletingId === book.id}
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    {deletingId === book.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/teacher/books/${book.id}`)}>
                    Edit <ChevronRight className="h-3.5 w-3.5" />
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
