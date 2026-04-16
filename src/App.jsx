import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Heart, Info, LogOut, MessageSquare, Moon, Settings, Sun, Wand2 } from 'lucide-react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useStreak } from '@/hooks/useStreak';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, saveStudentSet, loadStudentSets, deleteStudentSet, trackWordStat, trackLessonStat } from '@/lib/supabase';
import { fetchJSON } from '@/lib/fetchCache';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const StaffLoginPage = lazy(() => import('@/pages/StaffLoginPage'));
const StudentDashboard = lazy(() => import('@/pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const BookEditor = lazy(() => import('@/pages/teacher/BookEditor'));
const SectionEditor = lazy(() => import('@/pages/teacher/SectionEditor'));
const SharedBookPage = lazy(() => import('@/pages/SharedBookPage'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
import StudyDeckPanel from '@/components/StudyDeckPanel';
import NotFoundPage from '@/pages/NotFoundPage';

const FavoritesPanel = lazy(() => import('@/components/FavoritesPanel'));
const Flashcard = lazy(() => import('@/components/Flashcard'));
const Quiz = lazy(() => import('@/components/Quiz'));
const WordListView = lazy(() => import('@/components/WordListView'));
const MyQuizPage = lazy(() => import('@/components/MyQuizPage'));
const WriteMode = lazy(() => import('@/components/WriteMode'));
const UploadGuide = lazy(() => import('@/components/UploadGuide'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage'));
const FeedbackReviewPage = lazy(() => import('@/pages/FeedbackReviewPage'));
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import {
  buildQuizChoices,
  cn,
  formatSectionName,
  normalizeVocabularyItems,
  parseVocabularyText,
  shuffleArray,
} from '@/lib/utils';
import { parseVocabularyWorkbook } from '@/lib/excel';
import { initGoogleAnalytics, trackEvent } from '@/lib/analytics';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { localeMap } from '@/locales';
import './App.css';

const INITIAL_SCORE = { correct: 0, total: 0 };
const UPLOADED_LESSONS_STORAGE_KEY = 'uploaded-lessons-json';
const LEGACY_SESSION_UPLOADS_KEY = 'uploaded-sections';
const SESSION_SELECTED_BOOK_KEY = 'selected-book';
const SESSION_SELECTED_SECTION_KEY = 'selected-sections-by-book';
const SESSION_LANGUAGE_KEY = 'selected-language';
const FAVORITES_STORAGE_KEY = 'favorite-vocabulary';
const MAX_UPLOAD_BYTES = 1024 * 1024;
const USER_UPLOAD_BOOK_ID = 'user-upload';
const SAMPLE_NOTICE_LAST_SEEN_KEY = 'sample-sentence-notice-last-seen';

const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
      color: '#fff',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1rem',
      }}>🔧</div>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        marginBottom: '0.75rem',
        color: '#86efac',
      }}>
        Đang bảo trì
      </h1>
      <p style={{
        fontSize: '1.25rem',
        color: '#bbf7d0',
        marginBottom: '0.5rem',
      }}>
        We'll be back soon!
      </p>
      <p style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#fff',
        background: 'rgba(134,239,172,0.15)',
        border: '1px solid rgba(134,239,172,0.3)',
        borderRadius: '0.75rem',
        padding: '0.6rem 1.5rem',
        marginTop: '0.5rem',
      }}>
        🕑 Back at <span style={{ color: '#4ade80' }}>2:00 PM</span> Vietnam Time (ICT)
      </p>
      <p style={{
        marginTop: '1.5rem',
        fontSize: '0.9rem',
        color: '#86efac',
        opacity: 0.7,
      }}>
        Xin lỗi vì sự bất tiện này. Vui lòng quay lại lúc 14:00 ICT.
      </p>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getTodayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeUploadedLessons(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);

    if (Array.isArray(parsed)) {
      return parsed
        .map((lesson, index) => {
          if (!lesson || typeof lesson !== 'object') return null;

          const items = Array.isArray(lesson.items)
            ? normalizeVocabularyItems(lesson.items)
            : typeof lesson.text === 'string'
              ? parseVocabularyText(lesson.text)
              : [];

          return {
            id: lesson.id || `user-upload-${index + 1}`,
            fileName: lesson.fileName || lesson.name || `upload-${index + 1}.xlsx`,
            title:
              lesson.title ||
              formatSectionName(lesson.fileName || lesson.name || `upload-${index + 1}.xlsx`),
            items,
            uploadedAt: lesson.uploadedAt || null,
          };
        })
        .filter((lesson) => lesson && Array.isArray(lesson.items));
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([fileName, text], index) => ({
        id: `user-upload-${index + 1}`,
        fileName,
        title: formatSectionName(fileName),
        items: typeof text === 'string' ? parseVocabularyText(text) : [],
        uploadedAt: null,
      }));
    }
  } catch {
    return [];
  }

  return [];
}

export default function App() {
  if (MAINTENANCE_MODE) return <MaintenancePage />;
  return <AppContent />;
}

function AppContent() {
  const [baseBooks, setBaseBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const saved = localStorage.getItem(SESSION_LANGUAGE_KEY);
    return saved && localeMap[saved] ? saved : 'vi';
  });
  const [vocabulary, setVocabulary] = useState([]);
  const [originalVocabulary, setOriginalVocabulary] = useState([]);
  const [uploadedLessons, setUploadedLessons] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [mode, setMode] = useState('review');
  const [deckSource, setDeckSource] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();
  const sharedMatch = location.pathname.match(/^\/shared\/([^/]+)/);
  const activeView = sharedMatch ? 'shared' : location.pathname === '/admin' ? 'admin' : location.pathname.startsWith('/teacher') ? 'teacher' : location.pathname === '/quiz' ? 'myquiz' : location.pathname === '/upload-word' ? 'upload' : location.pathname === '/info' ? 'info' : location.pathname === '/feedback' ? 'feedback' : location.pathname === '/feedback-review' ? 'feedback-review' : location.pathname === '/login' ? 'login' : location.pathname === '/staff-login' ? 'staff-login' : location.pathname === '/dashboard' ? 'dashboard' : location.pathname === '/' ? 'learn' : 'notfound';
  const { user, role, signOut, loading: authLoading } = useAuth();
  const { markStudied } = useStreak();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [favorites, setFavorites] = useLocalStorageState(FAVORITES_STORAGE_KEY, []);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [customQuizWords, setCustomQuizWords] = useState(null);
  const [customQuizPool, setCustomQuizPool] = useState(null);
  const [quizSeed, setQuizSeed] = useState(0);
  const [supabaseSets, setSupabaseSets] = useState([]);
  const [isDarkMode, setIsDarkMode] = useLocalStorageState('dark-mode', false);
  const [theme, setTheme] = useLocalStorageState('app-theme', 'green');
  const [fontSize, setFontSize] = useLocalStorageState('font-size', 'lg');
  const [sampleNoticeLastSeen, setSampleNoticeLastSeen] = useLocalStorageState(SAMPLE_NOTICE_LAST_SEEN_KEY, '');
  const [isSampleNoticeOpen, setIsSampleNoticeOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);
  const fontSizeSelectRef = useRef(null);
  const initialLoadDoneRef = useRef(false);

  const handleDismissSampleNotice = useCallback(() => {
    setSampleNoticeLastSeen(getTodayKey());
    setIsSampleNoticeOpen(false);
  }, [setSampleNoticeLastSeen]);

  const t = localeMap[selectedLanguage] || localeMap.en;

  const books = useMemo(() => {
    const nextBooks = [...baseBooks];
    if (uploadedLessons.length > 0) {
      nextBooks.push({
        id: USER_UPLOAD_BOOK_ID,
        title: t.userUploadBook,
        description: 'Saved in this browser',
      });
    }
    return nextBooks;
  }, [baseBooks, uploadedLessons, t.userUploadBook]);

  const languageOptions = useMemo(
    () => [
      { id: 'en', label: t.englishOption, flag: '🇺🇸' },
      { id: 'vi', label: t.vietnameseOption, flag: '🇻🇳' },
    ],
    [t.englishOption, t.vietnameseOption],
  );
  const selectedFlag = languageOptions.find((l) => l.id === selectedLanguage)?.flag ?? '🌐';

  function resetInteractiveState() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore(INITIAL_SCORE);
    setAnsweredQuestion(null);
    setWrongAnswers([]);
    setQuizComplete(false);
    setQuizSeed((s) => s + 1);
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!themeDropdownOpen) return undefined;
    function handleClick(e) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target)) {
        setThemeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [themeDropdownOpen]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  useEffect(() => {
    const sizeMap = { sm: '16px', md: '18px', lg: '20px', xl: '22px', xll: '24px', xxl: '26px' };
    document.documentElement.style.setProperty('--app-font-size', sizeMap[fontSize] ?? '16px');
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(SESSION_LANGUAGE_KEY, selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    // Wait for auth to resolve — avoids fetching twice on startup (once unauthenticated, once after session restores)
    if (authLoading) return;

    // On logout: strip private teacher books but keep publicly shared ones
    if (!user && initialLoadDoneRef.current) {
      setBaseBooks((prev) => prev.filter((b) => b.source !== 'teacher' || b.share_enabled));
      return;
    }

    async function loadInitialData() {
      try {
        setBooksLoading(true);
        setBooksError('');
        initialLoadDoneRef.current = true;

        const [booksData, savedUploadsRaw, teacherBooksResult, studentSetsResult] = await Promise.all([
          fetchJSON('/data/books.json'),
          Promise.resolve(localStorage.getItem(UPLOADED_LESSONS_STORAGE_KEY) || sessionStorage.getItem(LEGACY_SESSION_UPLOADS_KEY)),
          user ? supabase.rpc('list_shared_books') : Promise.resolve({ data: [] }),
          user ? loadStudentSets(user.id).catch(() => []) : Promise.resolve([]),
        ]);
        const normalizedUploads = normalizeUploadedLessons(savedUploadsRaw);
        const teacherBooks = (teacherBooksResult.data ?? []).map((b) => ({ ...b, source: 'teacher' }));

        setBaseBooks([...booksData, ...teacherBooks]);
        setUploadedLessons(normalizedUploads);
        setSupabaseSets(studentSetsResult);
        if (normalizedUploads.length > 0) {
          localStorage.setItem(UPLOADED_LESSONS_STORAGE_KEY, JSON.stringify(normalizedUploads));
        }

        const savedBook = sessionStorage.getItem(SESSION_SELECTED_BOOK_KEY);
        const availableBookIds = [
          ...booksData.map((book) => book.id),
          ...teacherBooks.map((book) => book.id),
          ...(normalizedUploads.length > 0 ? [USER_UPLOAD_BOOK_ID] : []),
        ];

        setSelectedBook(savedBook && availableBookIds.includes(savedBook) ? savedBook : availableBookIds[0] || '');
      } catch {
        setBooksError(t.uploadBooksError);
      } finally {
        setBooksLoading(false);
      }
    }

    loadInitialData();

    if (!('speechSynthesis' in window)) return undefined; // eslint-disable-line consistent-return
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [t.uploadBooksError, user, authLoading]);


  useEffect(() => {
    if (!books.length) return;
    if (!selectedBook || !books.some((book) => book.id === selectedBook)) {
      setSelectedBook(books[0].id);
    }
  }, [books, selectedBook]);

  useEffect(() => {
    if (!selectedBook) return;
    sessionStorage.setItem(SESSION_SELECTED_BOOK_KEY, selectedBook);
    trackEvent('select_book', { book_id: selectedBook });
  }, [selectedBook]);

  useEffect(() => {
    if (!selectedBook) return;

    async function loadSectionsForBook() {
      try {
        setError('');
        setIsLoading(true);

        let nextSections = [];
        const currentBook = books.find((b) => b.id === selectedBook);

        if (selectedBook === USER_UPLOAD_BOOK_ID) {
          nextSections = uploadedLessons
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              file: lesson.id,
              source: 'upload',
              enabled: true,
            }))
            .sort((a, b) => a.title.localeCompare(b.title));
        } else if (currentBook?.source === 'teacher') {
          const { data, error } = await supabase
            .from('user_sections')
            .select('id, title, order, words')
            .eq('book_id', selectedBook)
            .order('order');
          if (error) throw new Error(error.message);
          nextSections = (data ?? []).map((sec) => ({
            id: sec.id,
            file: sec.id,
            title: sec.title,
            source: 'teacher',
            enabled: true,
            _words: sec.words ?? [],
          }));
        } else {
          const data = await fetchJSON(`/data/books/${selectedBook}/sections.json`);
          nextSections = data.map((section) => ({
            ...section,
            title: section.title || formatSectionName(section.file),
            enabled: section.enabled !== false,
          }));
        }

        setSections(nextSections);

        const savedByBook = JSON.parse(sessionStorage.getItem(SESSION_SELECTED_SECTION_KEY) || '{}');
        const savedSection = savedByBook[selectedBook];
        const firstEnabledSection = nextSections.find((section) => section.enabled !== false)?.file || nextSections[0]?.file || '';

        if (savedSection && nextSections.some((section) => section.file === savedSection && section.enabled !== false)) {
          setSelectedSection(savedSection);
        } else {
          setSelectedSection(firstEnabledSection);
        }
      } catch {
        setSections([]);
        setSelectedSection('');
        setError(t.uploadSectionsError);
      } finally {
        setIsLoading(false);
      }
    }

    loadSectionsForBook();
  }, [selectedBook, uploadedLessons, t.uploadSectionsError]);

  useEffect(() => {
    if (!selectedBook || !selectedSection) return;
    const savedByBook = JSON.parse(sessionStorage.getItem(SESSION_SELECTED_SECTION_KEY) || '{}');
    savedByBook[selectedBook] = selectedSection;
    sessionStorage.setItem(SESSION_SELECTED_SECTION_KEY, JSON.stringify(savedByBook));
    trackEvent('select_section', { book_id: selectedBook, section_id: selectedSection });
  }, [selectedBook, selectedSection]);

  useEffect(() => {
    if (!selectedBook || !selectedSection) return;
    const isTeacherBook = books.find((b) => b.id === selectedBook)?.source === 'teacher';
    if (selectedBook !== USER_UPLOAD_BOOK_ID && !isTeacherBook && !sections.some((section) => section.file === selectedSection)) return;

    async function loadVocabulary() {
      try {
        setIsLoading(true);
        setError('');

        let parsed = [];
        const currentSection = sections.find((s) => s.file === selectedSection);

        if (selectedBook === USER_UPLOAD_BOOK_ID) {
          parsed = uploadedLessons.find((lesson) => lesson.id === selectedSection)?.items || [];
        } else if (currentSection?.source === 'teacher') {
          parsed = normalizeVocabularyItems(currentSection._words ?? []);
        } else {
          const data = await fetchJSON(`/data/books/${selectedBook}/${selectedSection}`);
          parsed = normalizeVocabularyItems(data?.items || data);
        }

        setOriginalVocabulary(parsed);
        setVocabulary(parsed);
        resetInteractiveState();
        setIsShuffled(false);
      } catch {
        setError(t.uploadVocabularyError);
        setOriginalVocabulary([]);
        setVocabulary([]);
        resetInteractiveState();
      } finally {
        setIsLoading(false);
      }
    }

    loadVocabulary();
  }, [selectedBook, selectedSection, uploadedLessons, sections, t.uploadVocabularyError]);

  // O(1) lookup set — avoids O(n) favorites.some() per item per render
  const favoriteKeySet = useMemo(() => new Set(favorites.map((f) => f.favoriteKey)), [favorites]);

  const favoriteVocabulary = useMemo(
    () =>
      favorites.map((favorite, index) => ({
        id: favorite.favoriteKey || `${favorite.bookId}-${favorite.section}-${favorite.chinese}-${index}`,
        chinese: favorite.chinese,
        pinyin: favorite.pinyin,
        english: favorite.english,
        vietnamese: favorite.vietnamese || favorite.english,
        sentenceChinese: favorite.sentenceChinese,
        sentencePinyin: favorite.sentencePinyin,
        sentenceEnglish: favorite.sentenceEnglish,
        sentenceVietnamese: favorite.sentenceVietnamese || favorite.sentenceEnglish,
      })),
    [favorites],
  );

  const testableVocabulary = useMemo(
    () => vocabulary.filter((item) => !item.notest),
    [vocabulary],
  );

  const activeVocabulary = customQuizWords ?? (
    deckSource === 'favorites'
      ? favoriteVocabulary
      : mode === 'review' ? vocabulary : testableVocabulary
  );

  const pool = customQuizPool ?? (deckSource === 'favorites' ? testableVocabulary : activeVocabulary);
  const allChoices = useMemo(
    () => activeVocabulary.map((item) => buildQuizChoices(pool, item)),
    [activeVocabulary, pool, quizSeed],
  );

  useEffect(() => {
    if (mode !== 'flashcard' || activeView !== 'learn') return undefined;

    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(targetTag)) return;

      const key = event.key;
      if ([' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ',', '.', '<', '>'].includes(key)) {
        event.preventDefault();
      }

      if ((key === ' ' || key === 'ArrowUp') && activeVocabulary.length > 0) {
        setIsFlipped((prev) => !prev);
      }

      if ((key === 'ArrowLeft' || key === ',' || key === '<') && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        setIsFlipped(false);
      }

      if ((key === 'ArrowRight' || key === '.' || key === '>') && currentIndex < activeVocabulary.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeView, activeVocabulary.length, currentIndex, mode]);

  const currentItem = activeVocabulary[currentIndex];
  const selectedBookMeta = useMemo(() => books.find((book) => book.id === selectedBook), [books, selectedBook]);
  const currentSectionMeta = useMemo(() => sections.find((section) => section.file === selectedSection), [sections, selectedSection]);
  const shouldShowSampleNotice = activeView === 'learn' && currentSectionMeta?.verified === false;
  const sectionLabel = currentSectionMeta?.title || formatSectionName(selectedSection || '');
  const bookLabel = selectedBookMeta?.title || t.userUploadBook;
  const showNoData = !isLoading && !error && activeView === 'learn' && activeVocabulary.length === 0;
  const activeTab = mode === 'quiz' ? 'quiz' : mode === 'review' ? 'review' : mode === 'write' ? 'write' : 'flashcard';

  useEffect(() => {
    if (!shouldShowSampleNotice) {
      setIsSampleNoticeOpen(false);
      return;
    }
    if (sampleNoticeLastSeen === getTodayKey()) return;
    setIsSampleNoticeOpen(true);
  }, [shouldShowSampleNotice, sampleNoticeLastSeen]);

  function getFavoriteKey(item, section = selectedSection) {
    return `${selectedBook}__${section}__${item.chinese}__${item.pinyin}`;
  }

  function isFavorite(item, section = selectedSection) {
    if (!item) return false;
    return favoriteKeySet.has(getFavoriteKey(item, section));
  }

  const toggleFavorite = useCallback((item) => {
    if (!item) return;

    const favoriteKey = getFavoriteKey(item);
    setFavorites((prev) => {
      const exists = prev.some((favorite) => favorite.favoriteKey === favoriteKey);
      if (exists) {
        return prev.filter((favorite) => favorite.favoriteKey !== favoriteKey);
      }

      return [
        {
          favoriteKey,
          bookId: selectedBook,
          bookLabel,
          section: selectedSection,
          sectionLabel: `${bookLabel} · ${sectionLabel}`,
          chinese: item.chinese,
          pinyin: item.pinyin,
          english: item.english,
          vietnamese: item.vietnamese || item.english,
          sentenceChinese: item.sentenceChinese,
          sentencePinyin: item.sentencePinyin,
          sentenceEnglish: item.sentenceEnglish,
          sentenceVietnamese: item.sentenceVietnamese || item.sentenceEnglish,
        },
        ...prev,
      ];
    });

    trackEvent('toggle_favorite', {
      book_id: selectedBook,
      section_id: selectedSection,
      word: item.chinese,
    });
  }, [selectedBook, selectedSection, bookLabel, sectionLabel]);

  function removeFavorite(favoriteKey) {
    setFavorites((prev) => prev.filter((favorite) => favorite.favoriteKey !== favoriteKey));
  }

  function startFlashcards() {
    navigate('/');
    setMode('flashcard');
    setDeckSource('all');
    resetInteractiveState();
    trackEvent('start_flashcards', { book_id: selectedBook, section_id: selectedSection, source: 'all' });
  }

  function startQuizFavorites() {
    if (favorites.length === 0) return;
    setIsFavoritesOpen(false);
    navigate('/');
    setMode('quiz');
    setDeckSource('favorites');
    resetInteractiveState();
    trackEvent('start_quiz', { source: 'favorites' });
  }

  function handleModeTabChange(nextTab) {
    setCustomQuizWords(null);
    setCustomQuizPool(null);

    if (nextTab === 'quiz') {
      setDeckSource('all');
      setMode('quiz');
      navigate('/');
      resetInteractiveState();
      return;
    }

    if (nextTab === 'review') {
      setMode('review');
      navigate('/');
      return;
    }

    if (nextTab === 'write') {
      setMode('write');
      navigate('/');
      resetInteractiveState();
      return;
    }

    startFlashcards();
  }

  function handleStartCustomQuiz(words, pool) {
    setCustomQuizWords(words);
    setCustomQuizPool(pool);
    navigate('/');
    setMode('quiz');
    resetInteractiveState();
  }

  function handleShuffleToggle() {
    if (originalVocabulary.length === 0 || mode !== 'flashcard' || deckSource === 'favorites') return;

    if (isShuffled) {
      setVocabulary(originalVocabulary);
      setIsShuffled(false);
    } else {
      setVocabulary(shuffleArray(originalVocabulary));
      setIsShuffled(true);
    }
    resetInteractiveState();
  }

  function handlePrevious() {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setIsFlipped(false);
  }

  function handleFlipCard() {
    markStudied();
    // Track when revealing the back (front→back only, not back→front)
    if (!isFlipped && user && role === 'member' && currentItem?.id && selectedBook && selectedSection) {
      trackWordStat(user.id, { bookId: selectedBook, sectionId: selectedSection, itemId: currentItem.id, isCorrect: null }).catch(() => {});
    }
    setIsFlipped((prev) => !prev);
  }

  function handleNextFlashcard() {
    if (currentIndex >= activeVocabulary.length - 1) return;
    setCurrentIndex((prev) => prev + 1);
    setIsFlipped(false);
  }

  function handleAnswer(choice) {
    if (!currentItem || answeredQuestion) return;
    markStudied();

    const correct = choice.id === currentItem.id;
    setAnsweredQuestion({
      selectedAnswer: choice.chinese,
      isCorrect: correct,
    });

    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));

    if (!correct) {
      setWrongAnswers((prev) => [...prev, { item: currentItem, selectedAnswer: choice.chinese }]);
    }
    // Track word stat for logged-in students
    if (user && role === 'member' && currentItem?.id && selectedBook && selectedSection) {
      trackWordStat(user.id, { bookId: selectedBook, sectionId: selectedSection, itemId: currentItem.id, isCorrect: correct }).catch(() => {});
    }
  }

  function handleNextQuestion() {
    if (currentIndex >= activeVocabulary.length - 1) {
      setQuizComplete(true);
      setAnsweredQuestion(null);
      // Track lesson stat for logged-in students
      if (user && role === 'member' && selectedBook && selectedSection && score.total > 0) {
        trackLessonStat(user.id, {
          bookId: selectedBook,
          sectionId: selectedSection,
          sectionTitle: selectedSection,
          score: score.correct,
          total: score.total,
        }).catch(() => {});
      }
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setAnsweredQuestion(null);
  }

  function handleRestartQuiz() {
    resetInteractiveState();
    setMode('quiz');
    navigate('/');
  }

  function handleRetryWrongWords() {
    const words = wrongAnswers.map((w) => w.item);
    handleStartCustomQuiz(words, words);
  }

  async function handleSignOut() {
    const wasStaff = role === 'teacher' || role === 'admin' || role === 'superadmin';
    await signOut();
    navigate(wasStaff ? '/staff-login' : '/');
  }

  async function handleUploadFile(event) {
    const file = event.target.files?.[0];

    try {
      setUploadError('');
      setError('');
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        setUploadError(t.xlsxOnly);
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`${t.maxSize}: ${formatFileSize(MAX_UPLOAD_BYTES)}.`);
        return;
      }

      setIsLoading(true);
      const rawItems = await parseVocabularyWorkbook(file);

      if (!rawItems.length) {
        setUploadError(t.uploadNeedsRows);
        return;
      }

      const MAX_WORDS = 100;
      const items = rawItems.slice(0, MAX_WORDS);
      const wasTrimmed = rawItems.length > MAX_WORDS;

      const title = formatSectionName(file.name);

      // Logged-in student: try to save to Supabase first (max 3 slots)
      if (user && supabaseSets.length < 3) {
        try {
          const saved = await saveStudentSet(user.id, { title, items });
          setSupabaseSets((prev) => [saved, ...prev]);
          if (wasTrimmed) {
            setUploadError(t.uploadTrimmedWarning.replace('{max}', MAX_WORDS).replace('{total}', rawItems.length));
            return; // stay on upload page so user sees the warning
          }
          setDeckSource('all');
          resetInteractiveState();
          navigate('/');
          setMode('flashcard');
          trackEvent('upload_lesson', { file_name: file.name, size: file.size, rows: items.length, format: 'xlsx', storage: 'supabase' });
          return;
        } catch {
          // fall through to localStorage if Supabase fails
        }
      }

      // Guest or Supabase full/failed: save to localStorage
      const nextLesson = {
        id: `user-upload-${Date.now()}`,
        fileName: file.name,
        title,
        items,
        uploadedAt: new Date().toISOString(),
      };

      const nextUploads = [nextLesson, ...uploadedLessons];
      setUploadedLessons(nextUploads);
      localStorage.setItem(UPLOADED_LESSONS_STORAGE_KEY, JSON.stringify(nextUploads));
      sessionStorage.removeItem(LEGACY_SESSION_UPLOADS_KEY);

      if (wasTrimmed) {
        setUploadError(t.uploadTrimmedWarning.replace('{max}', MAX_WORDS).replace('{total}', rawItems.length));
        return; // stay on upload page so user sees the warning
      }
      setSelectedBook(USER_UPLOAD_BOOK_ID);
      setSelectedSection(nextLesson.id);
      navigate('/');
      setMode('flashcard');
      setDeckSource('all');
      resetInteractiveState();
      trackEvent('upload_lesson', { file_name: file.name, size: file.size, rows: items.length, format: 'xlsx', storage: 'localstorage' });
    } catch {
      setUploadError(t.uploadReadError);
      setOriginalVocabulary([]);
      setVocabulary([]);
      resetInteractiveState();
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Redirect away from protected routes based on auth + role
  useEffect(() => {
    if (authLoading) return;
    if (user && activeView === 'login') {
      navigate('/');
    } else if (!user && (activeView === 'teacher' || activeView === 'admin')) {
      navigate('/staff-login');
    } else if (user && activeView === 'admin' && role !== 'admin') {
      navigate('/teacher');
    } else if (user && activeView === 'teacher' && role !== 'teacher' && role !== 'admin') {
      navigate('/');
    }
  }, [authLoading, user, role, activeView]);


  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
    </div>
  );

  if (activeView === 'shared') return <Suspense fallback={pageFallback}><SharedBookPage token={sharedMatch[1]} /></Suspense>;
  if (activeView === 'login') return <Suspense fallback={pageFallback}><LoginPage /></Suspense>;
  if (activeView === 'staff-login') return <Suspense fallback={pageFallback}><StaffLoginPage /></Suspense>;
  if (activeView === 'dashboard') return <Suspense fallback={pageFallback}><StudentDashboard /></Suspense>;
  if (activeView === 'feedback') return <Suspense fallback={pageFallback}><FeedbackPage onBack={() => navigate(-1)} /></Suspense>;
  if (activeView === 'feedback-review') {
    if (authLoading) return pageFallback;
    if (!user) return <Suspense fallback={pageFallback}><StaffLoginPage /></Suspense>;
    if (role !== 'superadmin') return <NotFoundPage onGoHome={() => navigate('/')} />;
    return <Suspense fallback={pageFallback}><FeedbackReviewPage onBack={() => navigate(-1)} /></Suspense>;
  }

  // Show spinner while auth is restoring session for protected routes
  if (authLoading && (activeView === 'teacher' || activeView === 'admin')) {
    return pageFallback;
  }

  if (activeView === 'notfound') return <NotFoundPage onGoHome={() => navigate('/')} />;
  if (activeView === 'admin') return user && role === 'admin' ? <Suspense fallback={pageFallback}><AdminDashboard /></Suspense> : null;
  if (activeView === 'teacher') {
    if (!user || (role !== 'teacher' && role !== 'admin')) return null;
    const path = location.pathname;
    const sectionMatch = path.match(/^\/teacher\/books\/([^/]+)\/sections\/([^/]+)/);
    const bookMatch = path.match(/^\/teacher\/books\/([^/]+)/);
    if (sectionMatch) return <Suspense fallback={pageFallback}><SectionEditor bookId={sectionMatch[1]} sectionId={sectionMatch[2]} /></Suspense>;
    if (bookMatch) return <Suspense fallback={pageFallback}><BookEditor bookId={bookMatch[1]} onShareChange={(updated) => setBaseBooks((prev) => updated.share_enabled ? prev.map((b) => b.id === updated.id ? { ...b, ...updated, source: 'teacher' } : b) : prev.filter((b) => b.id !== updated.id))} /></Suspense>;
    return <Suspense fallback={pageFallback}><TeacherDashboard /></Suspense>;
  }

  return (
    <>
    <Analytics />
    <SpeedInsights />
    <div className="min-h-screen bg-white px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-4 animate-float-in sm:px-6">
            <div className="flex flex-col gap-4">
              {/* Row 1: Logo + guest nav */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <button type="button" onClick={() => navigate('/')} className="flex items-center gap-4 text-left">
                  <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-3xl p-1.5" />
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{t.appTitle}</h1>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm leading-6 text-slate-500">
                      {t.appSubtitle.replace('Traditional', '').replace('Phồn thể', '').trim().replace(/\(\)/, '').trim()}
                      <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {selectedLanguage === 'vi' ? 'Phồn thể' : 'Traditional'}
                      </span>
                    </p>
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button type="button" variant={activeView === 'myquiz' ? 'default' : 'outline'} className="gap-2" onClick={() => navigate('/quiz')}>
                    <Wand2 className="h-4 w-4" />
                    <span className="text-xs font-medium sm:text-sm">{t.myQuizTitle}</span>
                  </Button>
                  <Tooltip text="Language">
                    <div className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                      <span className="pointer-events-none text-lg">{selectedFlag}</span>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        aria-label="Language"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      >
                        {languageOptions.map((l) => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </Tooltip>
                  {/* Font size — desktop only */}
                  <Tooltip text="Font size">
                  <div className="relative hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-sm lg:flex">
                    <span className="pointer-events-none text-sm font-bold leading-none">Aa</span>
                    <select
                      ref={fontSizeSelectRef}
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      aria-label={t.fontSizeLabel}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    >
                      <option value="sm">16</option>
                      <option value="md">18</option>
                      <option value="lg">20</option>
                      <option value="xl">22</option>
                      <option value="xll">24</option>
                      <option value="xxl">26</option>
                    </select>
                  </div>
                  </Tooltip>

                  {/* Theme dropdown — desktop only */}
                  <div className="relative hidden lg:block" ref={themeDropdownRef}>
                    <Tooltip text="Theme">
                      <button
                        type="button"
                        onClick={() => setThemeDropdownOpen((o) => !o)}
                        aria-label="Change theme"
                        className="flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-2.5 transition-colors hover:bg-accent"
                      >
                        {(() => {
                          const themes = { green: { color: '#ECFAE5', border: '#CAE8BD' }, orange: { color: '#FFF5E4', border: '#FF9494' }, teal: { color: '#E4F9F5', border: '#11999E' } };
                          const cur = themes[theme];
                          return <span className="h-4 w-4 rounded-full border-2" style={{ background: cur.color, borderColor: cur.border }} />;
                        })()}
                        <span className="hidden text-xs font-medium capitalize text-slate-600 dark:text-slate-300 sm:inline">{theme}</span>
                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </Tooltip>
                    {themeDropdownOpen && (
                      <div className="absolute right-0 top-11 z-50 min-w-[140px] overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
                        {[
                          { key: 'green',  label: 'Green',  color: '#ECFAE5', border: '#CAE8BD', accent: '#a8d5a2' },
                          { key: 'orange', label: 'Orange', color: '#FFF5E4', border: '#FF9494', accent: '#ffb6b6' },
                          { key: 'teal',   label: 'Teal',   color: '#E4F9F5', border: '#11999E', accent: '#30E3CA' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => { setTheme(opt.key); setThemeDropdownOpen(false); }}
                            className={cn(
                              'flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors',
                              theme === opt.key
                                ? 'bg-accent text-foreground'
                                : 'text-slate-600 hover:bg-accent dark:text-slate-300',
                            )}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" style={{ background: opt.color, borderColor: opt.border }}>
                              {theme === opt.key && (
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </span>
                            {opt.label}
                            <span className="ml-auto h-2 w-2 rounded-full" style={{ background: opt.accent }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dark mode — always visible */}
                  <Tooltip text={isDarkMode ? 'Light mode' : 'Dark mode'}>
                    <Button type="button" variant="outline" size="icon" onClick={() => setIsDarkMode((prev) => !prev)} aria-label="Toggle dark mode">
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </Tooltip>

                  {/* Feedback — desktop only */}
                  <Tooltip text={t.feedbackNav}>
                    <Button type="button" variant={activeView === 'feedback' ? 'default' : 'outline'} size="icon" className="hidden w-auto gap-1.5 px-3 lg:flex" onClick={() => navigate('/feedback')} aria-label={t.feedbackNav}>
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs">{t.feedbackNav}</span>
                    </Button>
                  </Tooltip>

                  {/* About — desktop only */}
                  {!user && (
                    <Tooltip text="About">
                      <Button type="button" variant={activeView === 'info' ? 'default' : 'outline'} size="icon" className="hidden lg:flex" onClick={() => navigate('/info')} aria-label="About">
                        <Info className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}

                  {/* Settings popover — mobile/tablet only */}
                  <div className="relative lg:hidden" ref={settingsRef}>
                    <Button
                      type="button"
                      variant={settingsOpen ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setSettingsOpen((o) => !o)}
                      aria-label="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    {settingsOpen && (
                      <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                        {/* Font size */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Font size</span>
                          <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-background">
                            <span className="pointer-events-none text-sm font-bold leading-none">Aa</span>
                            <select
                              value={fontSize}
                              onChange={(e) => setFontSize(e.target.value)}
                              aria-label={t.fontSizeLabel}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            >
                              <option value="sm">16</option>
                              <option value="md">18</option>
                              <option value="lg">20</option>
                              <option value="xl">22</option>
                              <option value="xll">24</option>
                              <option value="xxl">26</option>
                            </select>
                          </div>
                        </div>

                        {/* Theme */}
                        <div className="border-b border-border px-4 py-3">
                          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Theme</p>
                          <div className="flex gap-2">
                            {[
                              { key: 'green',  label: 'Green',  color: '#ECFAE5', border: '#CAE8BD' },
                              { key: 'orange', label: 'Orange', color: '#FFF5E4', border: '#FF9494' },
                              { key: 'teal',   label: 'Teal',   color: '#E4F9F5', border: '#11999E' },
                            ].map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setTheme(opt.key)}
                                className={cn(
                                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 py-2 text-xs font-medium transition-colors',
                                  theme === opt.key
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-slate-500 hover:border-primary/40',
                                )}
                              >
                                <span className="h-5 w-5 rounded-full border-2" style={{ background: opt.color, borderColor: opt.border }} />
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Feedback */}
                        <button
                          type="button"
                          onClick={() => { navigate('/feedback'); setSettingsOpen(false); }}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-border',
                            activeView === 'feedback'
                              ? 'bg-primary/10 text-primary'
                              : 'text-slate-600 hover:bg-accent dark:text-slate-300',
                          )}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {t.feedbackNav}
                        </button>

                        {/* About */}
                        {!user && (
                          <button
                            type="button"
                            onClick={() => { navigate('/info'); setSettingsOpen(false); }}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                              activeView === 'info'
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-600 hover:bg-accent dark:text-slate-300',
                            )}
                          >
                            <Info className="h-4 w-4" />
                            About
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Admin nav — only for logged-in users */}
              {user && (
                <div className="-mx-4 -mb-4 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-theme-border bg-theme-surface-secondary px-4 pb-3 pt-3 dark:bg-slate-900/40 sm:-mx-6 sm:-mb-4 sm:px-6">
                  {/* Left: identity — show display name for students, masked email for staff */}
                  <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {role === 'member'
                      ? (user.user_metadata?.full_name ?? user.email?.split('@')[0])
                      : user.email?.replace(/(.{2}).+(@.+)/, '$1***$2')}
                  </span>
                  {/* Right: role-based actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {role === 'superadmin' && (
                      <Button type="button" size="sm" variant={activeView === 'feedback-review' ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/feedback-review')}>
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-xs">Feedback Review</span>
                      </Button>
                    )}
                    {role === 'member' && (
                      <Button type="button" size="sm" variant={activeView === 'dashboard' ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/dashboard')}>
                        <span className="text-xs">My Dashboard</span>
                      </Button>
                    )}
                    {role === 'teacher' && (
                      <Button type="button" size="sm" variant={activeView === 'teacher' ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/teacher')}>
                        <span className="text-xs">Teacher Dashboard</span>
                      </Button>
                    )}
                    {role === 'admin' && (
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/')}>
                        <span className="text-xs">Admin Dashboard</span>
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleSignOut}>
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="text-xs">Sign out</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleUploadFile} />

        {activeView === 'info' ? (
          <Suspense fallback={null}>
            <InfoPage t={t} />
          </Suspense>
        ) : activeView === 'myquiz' ? (
          <Suspense fallback={null}>
            <MyQuizPage
              books={books}
              uploadedLessons={uploadedLessons}
              favoriteVocabulary={favoriteVocabulary}
              onBack={() => navigate('/')}
              language={selectedLanguage}
              t={t}
            />
          </Suspense>
        ) : activeView === 'upload' ? (
          <Suspense fallback={null}>
            <UploadGuide
              onBackToLearn={() => navigate('/')}
              onOpenPicker={() => fileInputRef.current?.click()}
              maxUploadLabel={formatFileSize(MAX_UPLOAD_BYTES)}
              uploadError={uploadError}
              uploadedLessons={uploadedLessons}
              onDeleteLesson={(id) => {
                const next = uploadedLessons.filter((l) => l.id !== id);
                setUploadedLessons(next);
                localStorage.setItem(UPLOADED_LESSONS_STORAGE_KEY, JSON.stringify(next));
              }}
              supabaseSets={supabaseSets}
              supabaseSlotsUsed={supabaseSets.length}
              onDeleteSupabaseSet={async (id) => {
                await deleteStudentSet(id);
                setSupabaseSets((prev) => prev.filter((s) => s.id !== id));
              }}
              t={t}
            />
          </Suspense>
        ) : (
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
                booksError={booksError}
	            />

	            {error ? (
              <Card className="shadow-soft">
                <CardContent className="p-8 text-center text-rose-600">{error}</CardContent>
              </Card>
            ) : isLoading ? (
              <Card className="shadow-soft">
                <CardContent className="p-8 text-center text-slate-600">{t.loadingVocabulary}</CardContent>
              </Card>
            ) : showNoData ? (
              <Card className="shadow-soft">
                <CardContent className="p-8 text-center text-slate-500">{t.noData}</CardContent>
              </Card>
	            ) : (
	              <div className="space-y-5">
	                {mode === 'review' ? (
	                  <Suspense fallback={null}>
                    <WordListView
                      vocabulary={vocabulary}
                      isFavorite={isFavorite}
                      onToggleFavorite={toggleFavorite}
                      language={selectedLanguage}
                      t={t}
                      bookId={selectedBook}
                      sectionId={selectedSection}
                    />
                  </Suspense>
	                ) : mode === 'flashcard' ? (
	                  <>
                    <Suspense fallback={null}>
	                    <Flashcard
	                      item={currentItem}
	                      flipped={isFlipped}
                      onFlip={handleFlipCard}
                      isFavorite={currentItem ? isFavorite(currentItem) : false}
                      onToggleFavorite={() => toggleFavorite(currentItem)}
                      language={selectedLanguage}
                      canShuffle={deckSource === 'all' && originalVocabulary.length > 0}
                      isShuffled={isShuffled}
                      onShuffle={handleShuffleToggle}
                      t={t}
                    />
                    </Suspense>

	                    <Card className="border-theme-border bg-theme-surface shadow-soft">
	                      <CardContent className="p-4 sm:p-5">
	                        <div className="md:hidden">
	                          <div className="flex items-center gap-2">
	                          <Button
	                            onClick={handlePrevious}
	                            disabled={currentIndex === 0}
	                            size="sm"
	                            className="order-3 min-w-0 px-3"
	                            variant={currentIndex === activeVocabulary.length - 1 ? 'default' : 'outline'}
	                            aria-label={t.previous}
	                            title={t.previous}
	                          >
	                            <ArrowLeft className="h-4 w-4" />
	                          </Button>
	                          <Button
	                            onClick={handleNextFlashcard}
	                            disabled={currentIndex === activeVocabulary.length - 1}
	                            size="sm"
	                            className="order-4 min-w-0 px-3"
	                            variant={currentIndex === activeVocabulary.length - 1 ? 'outline' : 'default'}
	                            aria-label={t.next}
	                            title={t.next}
	                          >
	                            <ArrowRight className="h-4 w-4" />
	                          </Button>
	                          <Button onClick={handleFlipCard} size="sm" className="order-2 flex-1" variant="secondary">
	                            {t.flipCardAction}
	                          </Button>
	                          <div className="order-1 shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700 dark:bg-slate-700 dark:text-slate-300">
	                            {activeVocabulary.length === 0 ? 0 : currentIndex + 1} / {activeVocabulary.length}
	                          </div>
	                          </div>
	                        </div>

	                        <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
	                          <Button onClick={handlePrevious} className="gap-2" disabled={currentIndex === 0} variant={currentIndex === activeVocabulary.length - 1 ? 'default' : 'outline'}>
	                            <ArrowLeft className="h-4 w-4" />
	                            {t.previous}
	                          </Button>

	                          <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 dark:bg-slate-700 dark:text-slate-300">
	                            {activeVocabulary.length === 0 ? 0 : currentIndex + 1} / {activeVocabulary.length}
	                          </div>

	                          <div className="flex gap-3">
	                            <Button onClick={handleFlipCard} className="gap-2" variant="secondary">
	                              {t.flipCardAction}
	                            </Button>
	                            <Button onClick={handleNextFlashcard} className="gap-2" disabled={currentIndex === activeVocabulary.length - 1} variant={currentIndex === activeVocabulary.length - 1 ? 'outline' : 'default'}>
	                              {t.next}
	                              <ArrowRight className="h-4 w-4" />
	                            </Button>
	                          </div>
	                        </div>

	                      </CardContent>
	                    </Card>
	                  </>
	                ) : mode === 'write' ? (
                  <Suspense fallback={null}>
                    <WriteMode
                      key={activeVocabulary.map((i) => i.id).join(',')}
                      vocabulary={activeVocabulary}
                      language={selectedLanguage}
                      t={t}
                    />
                  </Suspense>
                ) : (
                  <Suspense fallback={null}>
                  <Quiz
                    vocabulary={activeVocabulary}
                    allChoices={allChoices}
                    currentIndex={currentIndex}
                    answeredQuestion={answeredQuestion}
                    onAnswer={handleAnswer}
                    onNext={handleNextQuestion}
                    score={score}
                    isComplete={quizComplete}
                    wrongAnswers={wrongAnswers}
                    onRestart={handleRestartQuiz}
                    onRetryWrong={handleRetryWrongWords}
                    isFavorite={currentItem ? isFavorite(currentItem) : false}
                    onToggleFavorite={() => toggleFavorite(currentItem)}
                    language={selectedLanguage}
                    deckSource={deckSource}
                    t={t}
                  />
                  </Suspense>
                )}
              </div>
            )}
          </>
        )}

        {shouldShowSampleNotice && isSampleNoticeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
            <Card
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md border-theme-border bg-theme-surface shadow-2xl"
            >
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Info className="h-4 w-4 shrink-0" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                      {t.sampleNoticeTitle}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t.sampleNoticeBody}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={handleDismissSampleNotice}>
                    {t.sampleNoticeAction}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <footer className="mt-auto border-t border-slate-200/80 py-6 text-center text-sm text-slate-500/80">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Heart className="h-4 w-4 fill-green-500 text-green-500" />
            <span className="font-medium">{t.madeBy}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-xs text-slate-400">
            <span>{t.contentCompiler.split(':')[0]}:</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{t.contentCompiler.split(':')[1]}</span>
            <span>·</span>
            <span>{t.contributor.split(':')[0]}:</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{t.contributor.split(':')[1]}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="font-medium">{t.supportedBy}:</span>
            <a href="https://barkingbears.com/" target="_blank" rel="noopener noreferrer">
              <img
                src="/sponser.png"
                alt="Sponsor"
                className="h-14 w-14 rounded-full object-cover"
                loading="lazy"
              />
            </a>
          </div>
        </footer>
      </div>

      <Suspense fallback={null}>
      <FavoritesPanel
        isOpen={isFavoritesOpen}
        favorites={favorites}
        onClose={() => setIsFavoritesOpen(false)}
        onRemove={removeFavorite}
        onQuizFavorites={startQuizFavorites}
        language={selectedLanguage}
        t={t}
      />
      </Suspense>
    </div>
    </>
  );
}
