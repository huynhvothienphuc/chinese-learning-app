import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { loadLessonStats, loadWordStats } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

function formatSection(sectionId) {
  // e.g. "section1" → "Section 1"
  return sectionId.replace(/([a-z]+)(\d+)/i, (_, word, num) =>
    word.charAt(0).toUpperCase() + word.slice(1) + ' ' + num
  );
}

function formatBook(bookId) {
  return bookId.replace(/([a-z]+)(\d+)/i, (_, word, num) =>
    word.charAt(0).toUpperCase() + word.slice(1) + ' ' + num
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

function ScoreBadge({ score }) {
  const color =
    score >= 80 ? 'text-green-600 dark:text-green-400' :
    score >= 60 ? 'text-amber-500 dark:text-amber-400' :
    'text-rose-500 dark:text-rose-400';
  return <span className={`text-sm font-bold ${color}`}>{score}%</span>;
}

export default function StudentDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [lessonStats, setLessonStats] = useState([]);
  const [wordStats, setWordStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== 'member') {
      navigate('/');
      return;
    }
    Promise.all([
      loadLessonStats(user.id),
      loadWordStats(user.id),
    ]).then(([lessons, words]) => {
      setLessonStats(lessons);
      setWordStats(words);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, role]);

  const weakWords = wordStats.filter(
    (w) => w.times_seen > 0 && w.times_correct / w.times_seen < 0.6
  );
  const recentQuizzes = lessonStats.slice(0, 5);
  const totalWords = wordStats.length;
  const avgScore = lessonStats.length > 0
    ? Math.round(lessonStats.reduce((sum, s) => sum + s.quiz_best_score, 0) / lessonStats.length)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user?.user_metadata?.full_name ?? user?.email}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            ← Back
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 text-center">
            <p className="text-3xl font-black text-green-600 dark:text-green-400">{totalWords}</p>
            <p className="mt-1 text-xs text-slate-500">Words practiced</p>
          </div>
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-4 text-center">
            <p className="text-3xl font-black text-green-600 dark:text-green-400">
              {avgScore !== null ? `${avgScore}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Avg quiz score</p>
          </div>
        </div>

        {/* Weak words alert */}
        {weakWords.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              ⚠️ {weakWords.length} weak word{weakWords.length > 1 ? 's' : ''} — correct rate &lt; 60%
            </span>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
            >
              Practice →
            </button>
          </div>
        )}

        {/* Recent quizzes */}
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <h2 className="mb-4 font-bold text-slate-700 dark:text-slate-200">Recent Quizzes</h2>
          {recentQuizzes.length === 0 ? (
            <p className="text-sm text-slate-400">No quizzes completed yet. Go study!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentQuizzes.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {formatBook(s.book_id)} · {formatSection(s.section_title || s.section_id)}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(s.last_attempt)} · {s.quiz_attempts} attempt{s.quiz_attempts > 1 ? 's' : ''}</span>
                  </div>
                  <ScoreBadge score={s.quiz_best_score} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Word bank summary */}
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <h2 className="mb-4 font-bold text-slate-700 dark:text-slate-200">Word Bank</h2>
          {wordStats.length === 0 ? (
            <p className="text-sm text-slate-400">Start studying to build your word bank.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total words practiced</span>
                <span className="font-bold">{totalWords}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Strong words (≥ 60%)</span>
                <span className="font-bold text-green-600 dark:text-green-400">{totalWords - weakWords.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Weak words (&lt; 60%)</span>
                <span className="font-bold text-rose-500">{weakWords.length}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
