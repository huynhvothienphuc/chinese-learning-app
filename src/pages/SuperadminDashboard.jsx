import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Globe, BookOpen, BarChart2, Loader2, RefreshCw, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useLocale } from '@/hooks/useLocale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── helpers ───────────────────────────────────────────────────────────────────



function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-black">{value ?? '—'}</p>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function SuperadminDashboard() {
  const { role, roleReady } = useAuthStore();
  const navigate = useNavigate();
  const t = useLocale();

  const [stats, setStats] = useState(null);
  const [locales, setLocales] = useState([]);
  const [bookPop, setBookPop] = useState([]);
  const [lessonPop, setLessonPop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lessonTab, setLessonTab] = useState('all');
  const [bookNameMap, setBookNameMap] = useState({});  // { bookId: shortTitle }
  const [sectionNameMap, setSectionNameMap] = useState({}); // { bookId: { file: { order, title } } }

  useEffect(() => {
    if (roleReady && role !== 'superadmin') navigate('/');
  }, [roleReady, role, navigate]);

  async function load() {
    setLoading(true);
    try {
      const [s, l, b, ls] = await Promise.all([
        supabase.rpc('get_user_stats'),
        supabase.rpc('get_locale_breakdown'),
        supabase.rpc('get_book_popularity'),
        supabase.rpc('get_lesson_popularity'),
      ]);
      setStats(s.data);
      setLocales(l.data ?? []);
      setBookPop(b.data ?? []);

      const lessonData = ls.data ?? [];
      setLessonPop(lessonData);

      // Build name maps from static JSON files
      const books = await fetch('/data/books.json').then((r) => r.json()).catch(() => []);
      const bMap = Object.fromEntries(books.map((b) => [b.id, b.shortTitle ?? b.title]));
      setBookNameMap(bMap);

      const uniqueBookIds = [...new Set(lessonData.map((r) => r.book_id).filter(Boolean))];
      const sMap = {};
      await Promise.all(
        uniqueBookIds.map(async (bookId) => {
          const sections = await fetch(`/data/books/${bookId}/sections.json`).then((r) => r.json()).catch(() => []);
          sMap[bookId] = Object.fromEntries(sections.map((s) => [s.file, { order: s.order, title: s.title }]));
        }),
      );
      setSectionNameMap(sMap);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function sectionLabel(bookId, sectionId) {

    const s = sectionNameMap[bookId]?.[sectionId];
    if (!s) return sectionId;
    return `Lesson ${s.order}: ${s.title}`;
  }

  if (!roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.superadminLabel}</p>
            <h1 className="text-3xl font-black">{t.superadminDashboardTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/')}>
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/superadmin/curriculum')}>
              <BookOpen className="h-4 w-4" />
              {t.superadminCurriculumBtn}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t.superadminRefreshBtn}
            </Button>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Users} label={t.superadminTotalUsers} value={stats?.total} />
          <StatCard icon={Users} label={t.superadminNewThisMonth} value={stats?.new_this_month} />
          <StatCard icon={Users} label={t.superadminActiveLast7} value={stats?.active_last_7_days} />
          <StatCard icon={Globe} label={t.superadminCountries} value={locales.length} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">

            {/* Lesson popularity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black">{t.superadminTopLessons}</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <span className="font-bold">{t.superadminOpens}</span>
                    <span className="opacity-70">{t.superadminOpensDesc}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    <span className="font-bold">{t.superadminQuizzes}</span>
                    <span className="opacity-70">{t.superadminQuizzesDesc}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <span className="font-bold text-foreground">{t.superadminAvgScore}</span>
                    <span>{t.superadminAvgScoreDesc}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4"><Skeleton rows={5} /></div>
                ) : lessonPop.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">{t.superadminNoLessonData}</p>
                ) : (() => {
                  const bookIds = ['all', ...new Set(lessonPop.map((r) => r.book_id).filter(Boolean))];
                  const filtered = lessonTab === 'all' ? lessonPop : lessonPop.filter((r) => r.book_id === lessonTab);
                  return (
                    <>
                      {/* Book tabs */}
                      <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pb-0 pt-1">
                        {bookIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setLessonTab(id)}
                            className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${lessonTab === id
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            {id === 'all' ? t.superadminAllTab : (bookNameMap[id] ?? id)}
                          </button>
                        ))}
                      </div>

                      {/* Scrollable table */}
                      <div className="max-h-80 overflow-y-auto overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              {lessonTab === 'all' && <th className="px-4 py-3 text-left">{t.superadminColBook}</th>}
                              <th className="px-4 py-3 text-left">{t.superadminColSection}</th>
                              <th className="px-4 py-3 text-right">{t.superadminColOpens}</th>
                              <th className="px-4 py-3 text-right">{t.superadminColQuizzes}</th>
                              <th className="px-4 py-3 text-right">{t.superadminColAvgScore}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((row, i) => (
                              <tr key={i} className="border-t border-border hover:bg-muted/40 transition-colors">
                                {lessonTab === 'all' && <td className="px-4 py-3 font-medium">{bookNameMap[row.book_id] ?? row.book_id}</td>}
                                <td className="px-4 py-3 text-muted-foreground">{sectionLabel(row.book_id, row.section_id)}</td>
                                <td className="px-4 py-3 text-right font-semibold">{row.opens}</td>
                                <td className="px-4 py-3 text-right">{row.quizzes}</td>
                                <td className="px-4 py-3 text-right">
                                  {row.avg_score != null
                                    ? <span className={`font-semibold ${row.avg_score >= 70 ? 'text-green-600' : 'text-rose-500'}`}>{Math.round(row.avg_score)}%</span>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Book popularity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {t.superadminBookPopularity}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4"><Skeleton rows={3} /></div>
                ) : bookPop.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-muted-foreground">{t.superadminNoBookData}</p>
                ) : (
                  <div className="max-h-[280px] overflow-y-auto px-4 py-3 space-y-3">
                    {bookPop.map((b, i) => {
                      const max = bookPop[0]?.opens ?? 1;
                      const pct = Math.round((b.opens / max) * 100);
                      return (
                        <div key={i}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold truncate">{bookNameMap[b.book_id] ?? b.book_id}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">{b.opens} opens</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Locale breakdown — hidden until data exists */}
            {!loading && locales.filter((l) => l.locale && l.locale !== 'unknown').length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {t.superadminUserLocales}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {locales.filter((l) => l.locale && l.locale !== 'unknown').map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{l.locale}</span>
                        <span className="text-muted-foreground">{l.user_count} users</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
