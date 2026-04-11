import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Loader2, MessageSquare, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  loadFeedback, deleteFeedback, resolveFeedback,
  loadWordFeedback, deleteWordFeedback, resolveWordFeedback,
} from '@/lib/supabase';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'resolved', label: 'Resolved' },
];

const TABS = [
  { key: 'general', label: 'General', icon: MessageSquare },
  { key: 'word', label: 'Word Feedback', icon: BookOpen },
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

function FeedbackList({ items, loading, error, filter, onToggleResolved, onDelete, togglingId, deletingId }) {
  const displayed = items.filter((f) => {
    if (filter === 'resolved') return f.resolved;
    if (filter === 'unresolved') return !f.resolved;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
        {error}
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-400 dark:bg-slate-800">
        No {filter !== 'all' ? filter : ''} feedback yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayed.map((item, index) => (
        <Card
          key={item.id}
          className={cn(
            'border shadow-sm transition-opacity',
            item.resolved
              ? 'border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900'
              : 'border-slate-200 bg-white dark:bg-slate-800'
          )}
        >
          <CardContent className="flex items-start gap-4 p-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1 space-y-1">
              {/* Word context badge (only for word feedback) */}
              {item.chinese && (
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {item.chinese}
                  </span>
                  {item.book_id && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {item.book_id}
                    </span>
                  )}
                  {item.section_id && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {item.section_id}
                    </span>
                  )}
                </div>
              )}

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

            <button
              type="button"
              onClick={() => onToggleResolved(item)}
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

            <button
              type="button"
              onClick={() => onDelete(item.id)}
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
  );
}

function useFeedbackTab(loadFn, resolveFn, deleteFn) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function fetch() {
    setLoading(true);
    setError('');
    try {
      const data = await loadFn();
      setItems(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  async function handleToggleResolved(item) {
    setTogglingId(item.id);
    try {
      await resolveFn(item.id, !item.resolved);
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
      await deleteFn(id);
      setItems((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(err.message ?? 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  }

  const counts = {
    all: items.length,
    unresolved: items.filter((f) => !f.resolved).length,
    resolved: items.filter((f) => f.resolved).length,
  };

  return { items, loading, error, fetch, handleToggleResolved, handleDelete, togglingId, deletingId, counts };
}

export default function FeedbackReviewPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('general');
  const [filter, setFilter] = useState('unresolved');

  const general = useFeedbackTab(loadFeedback, resolveFeedback, deleteFeedback);
  const word = useFeedbackTab(loadWordFeedback, resolveWordFeedback, deleteWordFeedback);

  const active = activeTab === 'general' ? general : word;

  function handleRefresh() {
    active.fetch();
  }

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
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={active.loading}>
            <RefreshCw className={cn('h-4 w-4', active.loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Title card + tabs */}
        <Card className="border-slate-200 bg-white shadow-sm dark:bg-slate-800">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-900/30">
                  <MessageSquare className="h-5 w-5 text-green-700 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
                    Feedback Review
                  </CardTitle>
                  <CardDescription>
                    {active.loading
                      ? 'Loading…'
                      : `${active.counts.unresolved} unresolved · ${active.counts.resolved} resolved`}
                  </CardDescription>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:bg-slate-900">
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
                      {active.counts[f.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Source tabs */}
            <div className="mt-4 flex gap-1 border-t border-slate-100 pt-4">
              {TABS.map((tab) => {
                const tabData = tab.key === 'general' ? general : word;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                      activeTab === tab.key
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tabData.counts.unresolved > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {tabData.counts.unresolved}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardHeader>
        </Card>

        <FeedbackList
          items={active.items}
          loading={active.loading}
          error={active.error}
          filter={filter}
          onToggleResolved={active.handleToggleResolved}
          onDelete={active.handleDelete}
          togglingId={active.togglingId}
          deletingId={active.deletingId}
        />
      </div>
    </div>
  );
}
