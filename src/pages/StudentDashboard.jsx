import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLessonStats } from '@/hooks/useStudentData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function HistoryList({ lessons }) {
  return (
    <div className="flex flex-col gap-2">
      {lessons.map((ls) => {
        const recent = Array.isArray(ls.recent_scores) ? ls.recent_scores : [];
        const latest = recent.length > 0 ? recent[0] : (ls.quiz_best_score ?? 0);
        const passed = latest >= 70;
        return (
          <Card key={ls.section_id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{ls.section_title || ls.section_id}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(ls.last_attempt).toLocaleDateString()}
                  <span>· {ls.quiz_attempts} attempt{ls.quiz_attempts !== 1 ? 's' : ''}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {passed
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <XCircle className="h-4 w-4 text-rose-400" />
                }
                <span className={`text-sm font-bold ${passed ? 'text-green-600' : 'text-rose-500'}`}>
                  {latest}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function StudentDashboard() {
  const { user, role, roleReady } = useAuthStore();
  const navigate = useNavigate();

  const { data: lessonStats = [], isLoading, isFetching, refetch } = useLessonStats(user?.id);

  useEffect(() => {
    if (!roleReady) return;
    if (!user || role !== 'member') navigate('/');
  }, [roleReady, role, user, navigate]);

  if (!roleReady) return <Spinner />;

  const completedLessons = lessonStats.length;
  const avgScore = completedLessons > 0
    ? Math.round(lessonStats.reduce((sum, l) => sum + (l.quiz_best_score ?? 0), 0) / completedLessons)
    : 0;

  const recentLessons = [...lessonStats]
    .sort((a, b) => new Date(b.last_attempt) - new Date(a.last_attempt))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-2xl flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user?.user_metadata?.full_name ?? user?.email ?? 'Student'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>← Back</Button>
          </div>
        </div>

        {/* Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-7 w-12 animate-pulse rounded bg-muted mb-2" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="flex flex-col gap-1 p-4">
                <p className="text-2xl font-black text-foreground">{completedLessons}</p>
                <p className="text-sm font-medium text-muted-foreground">Quizzes done</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 p-4">
                <p className="text-2xl font-black text-foreground">{avgScore}%</p>
                <p className="text-sm font-medium text-muted-foreground">Average score</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quiz history */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Quiz History
          </h2>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 w-48 animate-pulse rounded bg-muted mb-2" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quizzes completed yet. Try a quiz in any lesson!</p>
          ) : (
            <HistoryList lessons={recentLessons} />
          )}
        </section>

      </div>
    </div>
  );
}
