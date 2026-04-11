import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Loader2, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { loadFeedback, deleteFeedback, resolveFeedback } from '@/lib/supabase';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'resolved', label: 'Resolved' },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function FeedbackReviewPage({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('unresolved');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  async function fetchFeedback() {
    setLoading(true);
    setError('');
    try {
      const data = await loadFeedback();
      setItems(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFeedback(); }, []);

  async function handleToggleResolved(item) {
    setTogglingId(item.id);
    try {
      await resolveFeedback(item.id, !item.resolved);
      setItems((prev) => prev.map((f) => f.id === item.id ? { ...f, resolved: !item.resolved } : f));
    } catch (err) {
      alert(err.message ?? 'Failed to update.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this feedback entry?')) return;
    setDeletingId(id);
    try {
      await deleteFeedback(id);
      setItems((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(err.message ?? 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  }

  const displayed = items.filter((f) => {
    if (filter === 'resolved') return f.resolved;
    if (filter === 'unresolved') return !f.resolved;
    return true;
  });

  const counts = {
    all: items.length,
    unresolved: items.filter((f) => !f.resolved).length,
    resolved: items.filter((f) => f.resolved).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchFeedback} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Title card */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-900/30">
                  <MessageSquare className="h-5 w-5 text-green-700 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
                    Feedback Review
                  </CardTitle>
                  <CardDescription>
                    {loading ? 'Loading…' : `${counts.unresolved} unresolved · ${counts.resolved} resolved`}
                  </CardDescription>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                      filter === f.key
                        ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    )}
                  >
                    {f.label}
                    <span className={cn(
                      'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                      filter === f.key ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    )}>
                      {counts[f.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            No {filter !== 'all' ? filter : ''} feedback yet.
          </div>
        )}

        {/* List */}
        {!loading && !error && displayed.length > 0 && (
          <div className="space-y-3">
            {displayed.map((item, index) => (
              <Card
                key={item.id}
                className={cn(
                  'border shadow-sm transition-opacity',
                  item.resolved
                    ? 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                )}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Index */}
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    {index + 1}
                  </span>

                  {/* Message + meta */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn(
                      'break-words text-sm leading-relaxed',
                      item.resolved ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                    )}>
                      {item.message}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(item.created_at).toLocaleString()} · {timeAgo(item.created_at)}
                    </p>
                  </div>

                  {/* Resolve toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleResolved(item)}
                    disabled={togglingId === item.id}
                    className={cn(
                      'shrink-0 rounded-lg p-1.5 transition-colors disabled:opacity-40',
                      item.resolved
                        ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        : 'text-slate-300 hover:bg-green-50 hover:text-emerald-500 dark:text-slate-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'
                    )}
                    aria-label={item.resolved ? 'Mark unresolved' : 'Mark resolved'}
                  >
                    {togglingId === item.id
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : item.resolved
                        ? <CheckCircle2 className="h-5 w-5" />
                        : <Circle className="h-5 w-5" />
                    }
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40 dark:text-slate-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                    aria-label="Delete feedback"
                  >
                    {deletingId === item.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
