import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, XCircle, Clock, RefreshCw, Trash2, Library, Eye, Download, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLessonStats, useStudentSets } from '@/hooks/useStudentData';
import { useStreak } from '@/hooks/useStreak';
import { useBooks } from '@/hooks/useVocabData';
import { deleteStudentSet } from '@/lib/supabase';
import { exportVocabularyToExcel } from '@/lib/excel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { USER_UPLOAD_BOOK_ID } from '@/lib/constants';


function SectionHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {action}
    </div>
  );
}

export default function StudentDashboard() {
  const { user, role, roleReady, authReady } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { books: contextBooks = [], t } = useOutletContext() ?? {};
  const { data: booksData = [] } = useBooks(user?.id, authReady);
  const books = booksData.length > 0 ? booksData : contextBooks;
  const { data: lessonStats = [], isLoading, isFetching, refetch } = useLessonStats(user?.id);
  const { data: wordBanks = [], isLoading: banksLoading } = useStudentSets(user?.id);
  const { streak } = useStreak({ userId: user?.id, isMember: ['member', 'teacher', 'admin', 'superadmin'].includes(role) });

  function getBookTitle(bookId) {
    if (!bookId) return '';
    if (bookId === USER_UPLOAD_BOOK_ID) return 'My Uploads';
    const found = books.find((b) => b.id === bookId);
    if (found) return found.title ?? found.shortTitle;
    const m = bookId.match(/^book(\d+)$/i);
    return m ? `Book ${m[1]}` : bookId;
  }

  useEffect(() => {
    if (roleReady && role && !['member', 'teacher', 'admin', 'superadmin'].includes(role)) navigate('/');
  }, [roleReady, role, navigate]);

  const [viewingBank, setViewingBank] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function handleExportBank() {
    if (!viewingBank) return;
    setExporting(true);
    try {
      await exportVocabularyToExcel(viewingBank.items, viewingBank.label);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteWordBank(id) {
    await deleteStudentSet(id);
    queryClient.invalidateQueries({ queryKey: ['studentSets', user?.id] });
  }

  if (!roleReady) return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  const completedLessons = lessonStats.length;
  const recentLessons = [...lessonStats]
    .sort((a, b) => new Date(b.last_attempt) - new Date(a.last_attempt));

  return (
    <div className="flex flex-col gap-6 py-2">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">My Dashboard</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        {isLoading ? [...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-7 w-12 animate-pulse rounded bg-muted mb-2" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        )) : (
          <>
            <Card className={cn('overflow-hidden', streak > 0 && 'border-orange-300 dark:border-orange-700')}>
              <CardContent className={cn('relative flex flex-col gap-3 p-4', streak > 0 && 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40')}>
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl', streak > 0 ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-muted')}>
                    {streak > 0 ? '🔥' : '💤'}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-black leading-none">{streak > 0 ? streak : '—'}</p>
                    <p className="text-xs font-medium text-muted-foreground">{t.dashboardDayStreak}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t.dashboardStreakHint ?? '💡 Do a quiz every day to build your streak!'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl">
                  📝
                </div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-black leading-none">{completedLessons}</p>
                  <p className="text-xs font-medium text-muted-foreground">{t.dashboardQuizzesDone}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 2-column main content */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* Word Bank */}
        <Card>
          <CardContent className="p-4">
            <SectionHeader
              icon={Library}
              title={t.dashboardWordBank}
              action={
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs px-2" onClick={() => navigate('/upload-word')} disabled={wordBanks.length >= 3}>
                  {t.dashboardNewBank}
                </Button>
              }
            />
            {banksLoading ? (
              <div className="flex flex-col gap-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : wordBanks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.dashboardNoWordBanks ?? 'No word banks yet. Upload an Excel file to get started.'}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...wordBanks].reverse().map((bank, i) => (
                  <div key={bank.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{`Word Bank ${i + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{bank.items?.length ?? 0} {t.dashboardWords}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingBank({ ...bank, label: `Word Bank ${i + 1}` })}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWordBank(bank.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t.dashboardSlotsUsed?.replace('{used}', wordBanks.length).replace('{max}', 3)}</p>
          </CardContent>
        </Card>

        {/* Quiz History */}
        <Card>
          <CardContent className="p-4">
            <SectionHeader icon={BookOpen} title={t.dashboardQuizHistory} />
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted mb-1.5" />
                    <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : recentLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.dashboardNoQuizzes}</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1 scrollbar-pretty">
                {recentLessons.map((ls) => {
                  const recent = Array.isArray(ls.recent_scores) ? ls.recent_scores : [];
                  const latest = recent.length > 0 ? recent[0] : (ls.quiz_best_score ?? 0);
                  const passed = latest >= 70;
                  return (
                    <div key={ls.section_id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {ls.section_title || ls.section_id}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">[{getBookTitle(ls.book_id)}]</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(ls.last_attempt).toLocaleDateString()}
                          <span>· {ls.quiz_attempts} {ls.quiz_attempts !== 1 ? t.dashboardAttempts : t.dashboardAttempt}</span>
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <Modal open={!!viewingBank} onClose={() => setViewingBank(null)} className="max-w-lg">
        <ModalHeader onClose={() => setViewingBank(null)}>
          <h2 className="text-base font-bold">{viewingBank?.label}</h2>
          <p className="text-xs text-muted-foreground">{viewingBank?.items?.length ?? 0} {t.dashboardWords}</p>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">Chinese</th>
                  <th className="px-4 py-2.5 text-left">Pinyin</th>
                  <th className="px-4 py-2.5 text-left">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {(viewingBank?.items ?? []).map((item, i) => (
                  <tr key={item.id ?? i} className="border-t border-border hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5 font-bold">{item.chinese}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.pinyin}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.vietnamese || item.english}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" className="gap-2" onClick={handleExportBank} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download .xlsx
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
