import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSections, useVocabulary, usePrefetchAdjacentSections } from '@/hooks/useVocabData';
import { useStudySession } from '@/hooks/useStudySession';
import { useStreak } from '@/hooks/useStreak';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { trackLessonStat } from '@/lib/supabase';
import { trackEvent, initGoogleAnalytics } from '@/lib/analytics';
import { formatSectionName } from '@/lib/utils';
import {
  USER_UPLOAD_BOOK_ID,
  SESSION_SELECTED_BOOK_KEY,
  SESSION_SELECTED_SECTION_KEY,
} from '@/lib/constants';
import StudyDeckPanel from '@/components/StudyDeckPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Flashcard     = lazy(() => import('@/components/Flashcard'));
const Quiz          = lazy(() => import('@/components/Quiz'));
const WriteMode     = lazy(() => import('@/components/WriteMode'));
const WordListView  = lazy(() => import('@/components/WordListView'));

const SAMPLE_NOTICE_KEY = 'sample-sentence-notice-last-seen';

function readSavedSectionsByBook() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_SELECTED_SECTION_KEY) || '{}');
  } catch {
    sessionStorage.removeItem(SESSION_SELECTED_SECTION_KEY);
    return {};
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LearnPage() {
  const {
    t, selectedLanguage,
    books, booksLoading,
    favoriteVocabulary, favoriteKeySet,
    toggleFavorite, isFavorite,
    uploadedLessons,
  } = useOutletContext();

  const { user, role } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { markStudied } = useStreak();

  // ── book / section selection ──
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const booksInitRef = useRef(false);

  const currentBook = useMemo(() => books.find((b) => b.id === selectedBook) ?? null, [books, selectedBook]);

  const sectionsQuery = useSections(
    selectedBook !== USER_UPLOAD_BOOK_ID ? selectedBook : null,
    currentBook?.source,
  );

  const sections = useMemo(() => {
    if (selectedBook === USER_UPLOAD_BOOK_ID) {
      return uploadedLessons
        .map((l) => ({ id: l.id, title: l.title, file: l.id, source: 'upload', enabled: true }))
        .sort((a, b) => a.title.localeCompare(b.title));
    }
    return sectionsQuery.data ?? [];
  }, [selectedBook, uploadedLessons, sectionsQuery.data]);

  const currentSection = useMemo(
    () => sections.find((s) => s.file === selectedSection) ?? undefined,
    [sections, selectedSection],
  );

  const vocabQuery = useVocabulary(
    selectedBook !== USER_UPLOAD_BOOK_ID ? selectedBook : null,
    selectedSection,
    currentSection,
  );

  const rawVocab = useMemo(() => {
    if (selectedBook === USER_UPLOAD_BOOK_ID) {
      return uploadedLessons.find((l) => l.id === selectedSection)?.items || [];
    }
    return vocabQuery.data ?? [];
  }, [selectedBook, selectedSection, uploadedLessons, vocabQuery.data]);

  usePrefetchAdjacentSections(selectedBook, selectedSection, sections);

  // ── study session ──
  const session = useStudySession({
    rawVocab,
    favoriteVocabulary,
    onQuizComplete: (finalScore) => {
      if (!user || role !== 'member' || !selectedBook || !selectedSection || finalScore.total === 0) return;
      const sectionTitle = currentSection?.title || formatSectionName(selectedSection);
      trackLessonStat(user.id, {
        bookId: selectedBook,
        sectionId: selectedSection,
        sectionTitle,
        score: finalScore.correct,
        total: finalScore.total,
      }).catch(() => {}).finally(() => {
        queryClient.invalidateQueries({ queryKey: ['lessonStats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['wordStats', user.id] });
      });
    },
  });

  // ── GA init once ──
  useEffect(() => { initGoogleAnalytics(); }, []);

  // ── handle navigate-with-state for favorites quiz + post-upload redirect ──
  useEffect(() => {
    if (!location.state) return;
    if (location.state.quizFavorites) {
      session.startFavorites();
    }
    if (location.state.selectBook) {
      setSelectedBook(location.state.selectBook);
      if (location.state.selectSection) setSelectedSection(location.state.selectSection);
    }
    navigate('/', { replace: true });
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── initialize selectedBook from sessionStorage once books load ──
  useEffect(() => {
    if (!books.length) return;
    if (booksInitRef.current && selectedBook && books.some((b) => b.id === selectedBook)) return;
    booksInitRef.current = true;
    const saved = sessionStorage.getItem(SESSION_SELECTED_BOOK_KEY);
    const ids = books.map((b) => b.id);
    setSelectedBook(saved && ids.includes(saved) ? saved : ids[0] || '');
  }, [books]); // eslint-disable-line react-hooks/exhaustive-deps

  // fallback: if selectedBook becomes invalid (e.g. after logout), reset
  useEffect(() => {
    if (!books.length) return;
    if (!selectedBook || !books.some((b) => b.id === selectedBook)) {
      setSelectedBook(books[0].id);
    }
  }, [books, selectedBook]);

  useEffect(() => {
    if (!selectedBook) return;
    sessionStorage.setItem(SESSION_SELECTED_BOOK_KEY, selectedBook);
    trackEvent('select_book', { book_id: selectedBook });
  }, [selectedBook]);

  // ── initialize selectedSection when sections load ──
  useEffect(() => {
    if (!sections.length || !selectedBook) return;
    const savedByBook = readSavedSectionsByBook();
    const saved = savedByBook[selectedBook];
    const firstEnabled = sections.find((s) => s.enabled !== false)?.file || sections[0]?.file || '';
    setSelectedSection(saved && sections.some((s) => s.file === saved && s.enabled !== false) ? saved : firstEnabled);
  }, [sections, selectedBook]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedBook || !selectedSection) return;
    const savedByBook = readSavedSectionsByBook();
    savedByBook[selectedBook] = selectedSection;
    sessionStorage.setItem(SESSION_SELECTED_SECTION_KEY, JSON.stringify(savedByBook));
    trackEvent('select_section', { book_id: selectedBook, section_id: selectedSection });
  }, [selectedBook, selectedSection]);

  // ── keyboard shortcuts (flashcard mode) ──
  useEffect(() => {
    if (session.mode !== 'flashcard') return undefined;
    function onKey(e) {
      const tag = e.target?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return;
      const k = e.key;
      if ([' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ',', '.', '<', '>'].includes(k)) e.preventDefault();
      if ((k === ' ' || k === 'ArrowUp') && session.activeVocabulary.length > 0) {
        markStudied(); session.handleFlipCard();
      }
      if ((k === 'ArrowLeft' || k === ',' || k === '<') && session.currentIndex > 0) session.handlePrevious();
      if ((k === 'ArrowRight' || k === '.' || k === '>') && session.currentIndex < session.activeVocabulary.length - 1) session.handleNextFlashcard();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session.mode, session.activeVocabulary.length, session.currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── sample-notice modal ──
  const [sampleNoticeLastSeen, setSampleNoticeLastSeen] = useLocalStorageState(SAMPLE_NOTICE_KEY, '');
  const [isSampleNoticeOpen, setIsSampleNoticeOpen] = useState(false);
  const shouldShowSampleNotice = currentSection?.verified === false;

  useEffect(() => {
    if (!shouldShowSampleNotice) { setIsSampleNoticeOpen(false); return; }
    if (sampleNoticeLastSeen === getTodayKey()) return;
    setIsSampleNoticeOpen(true);
  }, [shouldShowSampleNotice, sampleNoticeLastSeen]);

  function dismissSampleNotice() {
    setSampleNoticeLastSeen(getTodayKey());
    setIsSampleNoticeOpen(false);
  }

  // ── derived ──
  const isLoading = sectionsQuery.isLoading || vocabQuery.isFetching;
  const error = sectionsQuery.error?.message || vocabQuery.error?.message || '';
  const bookLabel = currentBook?.title || t.userUploadBook;
  const sectionLabel = currentSection?.title || formatSectionName(selectedSection || '');
  const showNoData = !isLoading && !error && session.activeVocabulary.length === 0;
  const activeTab = session.mode === 'quiz' ? 'quiz' : session.mode === 'review' ? 'review' : session.mode === 'write' ? 'write' : 'flashcard';

  const isFavItem = useCallback(
    (item) => isFavorite(item, selectedBook, selectedSection),
    [isFavorite, selectedBook, selectedSection],
  );

  const onToggleFavorite = useCallback(
    (item) => toggleFavorite(item, selectedBook, bookLabel, selectedSection, sectionLabel),
    [toggleFavorite, selectedBook, bookLabel, selectedSection, sectionLabel],
  );

  function handleModeTabChange(nextTab) {
    const modeMap = { quiz: 'quiz', review: 'review', write: 'write', flashcard: 'flashcard' };
    session.setMode(modeMap[nextTab] ?? 'review');
    if (nextTab === 'flashcard') trackEvent('start_flashcards', { book_id: selectedBook, section_id: selectedSection });
    if (nextTab === 'quiz') trackEvent('start_quiz', { book_id: selectedBook, section_id: selectedSection });
  }

  // ── wrapped handlers that also mark streak ──
  function handleFlipCard() { markStudied(); session.handleFlipCard(); }
  function handleAnswer(choice) { markStudied(); session.handleAnswer(choice); }

  // ── render ──
  return (
    <>
      <StudyDeckPanel
        t={t}
        books={books}
        selectedBook={selectedBook}
        onBookChange={setSelectedBook}
        sections={sections}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
        activeTab={activeTab}
        onTabChange={handleModeTabChange}
        booksLoading={booksLoading}
      />

      {error ? (
        <Card className="shadow-soft">
          <CardContent className="p-8 text-center text-rose-600">{error}</CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="shadow-soft">
          <CardContent className="p-8 text-center text-muted-foreground">{t.loadingVocabulary}</CardContent>
        </Card>
      ) : showNoData ? (
        <Card className="shadow-soft">
          <CardContent className="p-8 text-center text-muted-foreground">{t.noData}</CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {session.mode === 'review' && (
            <Suspense fallback={null}>
              <WordListView
                vocabulary={session.vocabulary}
                isFavorite={isFavItem}
                onToggleFavorite={onToggleFavorite}
                language={selectedLanguage}
                t={t}
                bookId={selectedBook}
                sectionId={selectedSection}
              />
            </Suspense>
          )}

          {session.mode === 'flashcard' && (
            <>
              <Suspense fallback={null}>
                <Flashcard
                  item={session.currentItem}
                  flipped={session.isFlipped}
                  onFlip={handleFlipCard}
                  isFavorite={session.currentItem ? isFavItem(session.currentItem) : false}
                  onToggleFavorite={() => onToggleFavorite(session.currentItem)}
                  language={selectedLanguage}
                  canShuffle={session.deckSource === 'all' && rawVocab.length > 0}
                  isShuffled={session.isShuffled}
                  onShuffle={session.handleShuffleToggle}
                  t={t}
                />
              </Suspense>

              <Card className="border-theme-border bg-theme-surface shadow-soft">
                <CardContent className="p-4 sm:p-5">
                  {/* mobile nav */}
                  <div className="flex items-center gap-2 md:hidden">
                    <Button onClick={session.handlePrevious} disabled={session.currentIndex === 0} size="sm" variant="outline" className="order-3 min-w-0 px-3" aria-label={t.previous}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button onClick={session.handleNextFlashcard} disabled={session.currentIndex >= session.activeVocabulary.length - 1} size="sm" variant="default" className="order-4 min-w-0 px-3" aria-label={t.next}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleFlipCard} size="sm" className="order-2 flex-1" variant="secondary">{t.flipCardAction}</Button>
                    <div className="order-1 shrink-0 rounded-full bg-primary/20 px-3 py-1.5 text-sm font-semibold text-primary">
                      {session.activeVocabulary.length === 0 ? 0 : session.currentIndex + 1} / {session.activeVocabulary.length}
                    </div>
                  </div>
                  {/* desktop nav */}
                  <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
                    <Button onClick={session.handlePrevious} disabled={session.currentIndex === 0} variant="outline" className="gap-2">
                      <ArrowLeft className="h-4 w-4" />{t.previous}
                    </Button>
                    <div className="rounded-full bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">
                      {session.activeVocabulary.length === 0 ? 0 : session.currentIndex + 1} / {session.activeVocabulary.length}
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleFlipCard} variant="secondary" className="gap-2">{t.flipCardAction}</Button>
                      <Button onClick={session.handleNextFlashcard} disabled={session.currentIndex >= session.activeVocabulary.length - 1} variant="default" className="gap-2">
                        {t.next}<ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {session.mode === 'write' && (
            <Suspense fallback={null}>
              <WriteMode
                key={session.activeVocabulary.map((i) => i.id).join(',')}
                vocabulary={session.activeVocabulary}
                language={selectedLanguage}
                t={t}
              />
            </Suspense>
          )}

          {session.mode === 'quiz' && (
            <Suspense fallback={null}>
              <Quiz
                vocabulary={session.activeVocabulary}
                allChoices={session.allChoices}
                currentIndex={session.currentIndex}
                answeredQuestion={session.answeredQuestion}
                onAnswer={handleAnswer}
                onNext={session.handleNextQuestion}
                score={session.score}
                isComplete={session.quizComplete}
                wrongAnswers={session.wrongAnswers}
                onRestart={session.handleRestartQuiz}
                onRetryWrong={session.handleRetryWrongWords}
                isFavorite={session.currentItem ? isFavItem(session.currentItem) : false}
                onToggleFavorite={() => onToggleFavorite(session.currentItem)}
                language={selectedLanguage}
                deckSource={session.deckSource}
                t={t}
              />
            </Suspense>
          )}
        </div>
      )}

      {/* Verified notice modal */}
      {shouldShowSampleNotice && isSampleNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <Card role="dialog" aria-modal="true" className="w-full max-w-md border-theme-border bg-theme-surface shadow-2xl">
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Info className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">{t.sampleNoticeTitle}</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{t.sampleNoticeBody}</p>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={dismissSampleNotice}>{t.sampleNoticeAction}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
