import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Flame, Heart, LogOut, Moon, Sun, Upload, Wand2 } from 'lucide-react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useStreak } from '@/hooks/useStreak';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const TeacherDashboard = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const BookEditor = lazy(() => import('@/pages/teacher/BookEditor'));
const SectionEditor = lazy(() => import('@/pages/teacher/SectionEditor'));
const SharedBookPage = lazy(() => import('@/pages/SharedBookPage'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
import StudyDeckPanel from '@/components/StudyDeckPanel';

const FavoritesPanel = lazy(() => import('@/components/FavoritesPanel'));
const Flashcard = lazy(() => import('@/components/Flashcard'));
const Quiz = lazy(() => import('@/components/Quiz'));
const WordListView = lazy(() => import('@/components/WordListView'));
const MyQuizPage = lazy(() => import('@/components/MyQuizPage'));
const UploadGuide = lazy(() => import('@/components/UploadGuide'));
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  formatSectionName,
  normalizeVocabularyItems,
  parseVocabularyText,
  shuffleArray,
} from '@/lib/utils';
import { parseVocabularyWorkbook } from '@/lib/excel';
import { initGoogleAnalytics, trackEvent } from '@/lib/analytics';
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
const APP_VERSION = 'v1.5.0';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
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
  const [baseBooks, setBaseBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const saved = localStorage.getItem(SESSION_LANGUAGE_KEY);
    return saved && localeMap[saved] ? saved : 'en';
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
  const activeView = sharedMatch ? 'shared' : location.pathname === '/admin' ? 'admin' : location.pathname.startsWith('/teacher') ? 'teacher' : location.pathname === '/quiz' ? 'myquiz' : location.pathname === '/upload-word' ? 'upload' : location.pathname === '/login' ? 'login' : 'learn';
  const { user, role, signOut, loading: authLoading } = useAuth();
  const { streak, markStudied } = useStreak();
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
  const [lastUploadedName, setLastUploadedName] = useState('');
  const [isDarkMode, setIsDarkMode] = useLocalStorageState('dark-mode', false);
  const fileInputRef = useRef(null);
  const initialLoadDoneRef = useRef(false);

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
      { id: 'en', label: t.englishOption },
      { id: 'vi', label: t.vietnameseOption },
    ],
    [t.englishOption, t.vietnameseOption],
  );

  function resetInteractiveState() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore(INITIAL_SCORE);
    setAnsweredQuestion(null);
    setWrongAnswers([]);
    setQuizComplete(false);
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

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

        const [booksResponse, savedUploadsRaw, teacherBooksResult] = await Promise.all([
          fetch('/data/books.json'),
          Promise.resolve(localStorage.getItem(UPLOADED_LESSONS_STORAGE_KEY) || sessionStorage.getItem(LEGACY_SESSION_UPLOADS_KEY)),
          user ? supabase.rpc('list_shared_books') : Promise.resolve({ data: [] }),
        ]);

        if (!booksResponse.ok) throw new Error('Failed to load books');
        const booksData = await booksResponse.json();
        const normalizedUploads = normalizeUploadedLessons(savedUploadsRaw);
        const teacherBooks = (teacherBooksResult.data ?? []).map((b) => ({ ...b, source: 'teacher' }));

        setBaseBooks([...booksData, ...teacherBooks]);
        setUploadedLessons(normalizedUploads);
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
          const response = await fetch(`/data/books/${selectedBook}/sections.json`);
          if (!response.ok) throw new Error('Failed to load sections');
          const data = await response.json();
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
          const response = await fetch(`/data/books/${selectedBook}/${selectedSection}`);
          if (!response.ok) throw new Error('Failed to load vocabulary');
          const data = await response.json();
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

  const activeVocabulary = customQuizWords ?? (deckSource === 'favorites' ? favoriteVocabulary : vocabulary);

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
  const sectionLabel = currentSectionMeta?.title || formatSectionName(selectedSection || '');
  const bookLabel = selectedBookMeta?.title || t.userUploadBook;
  const showNoData = !isLoading && !error && activeView === 'learn' && activeVocabulary.length === 0;
  const activeTab = mode === 'quiz' ? 'quiz' : mode === 'review' ? 'review' : 'flashcard';

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

  function startQuiz() {
    navigate('/');
    setMode('quiz');
    resetInteractiveState();
    trackEvent('start_quiz', { source: deckSource, book_id: selectedBook, section_id: selectedSection });
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
  }

  function handleNextQuestion() {
    if (currentIndex >= activeVocabulary.length - 1) {
      setQuizComplete(true);
      setAnsweredQuestion(null);
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
    await signOut();
    navigate('/login');
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
      const items = await parseVocabularyWorkbook(file);

      if (!items.length) {
        setUploadError(t.uploadNeedsRows);
        return;
      }

      const nextLesson = {
        id: `user-upload-${Date.now()}`,
        fileName: file.name,
        title: formatSectionName(file.name),
        items,
        uploadedAt: new Date().toISOString(),
      };

      const nextUploads = [nextLesson, ...uploadedLessons.filter((lesson) => lesson.id !== nextLesson.id)];
      setUploadedLessons(nextUploads);
      localStorage.setItem(UPLOADED_LESSONS_STORAGE_KEY, JSON.stringify(nextUploads));
      sessionStorage.removeItem(LEGACY_SESSION_UPLOADS_KEY);

      setLastUploadedName(nextLesson.title);
      setSelectedBook(USER_UPLOAD_BOOK_ID);
      setSelectedSection(nextLesson.id);
      navigate('/');
      setMode('flashcard');
      setDeckSource('all');
      resetInteractiveState();
      trackEvent('upload_lesson', { file_name: file.name, size: file.size, rows: items.length, format: 'xlsx' });
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
    if (!user && (activeView === 'teacher' || activeView === 'admin')) {
      navigate('/login');
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

  // Show spinner while auth is restoring session for protected routes
  if (authLoading && (activeView === 'teacher' || activeView === 'admin')) {
    return pageFallback;
  }

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
    <div className="min-h-screen bg-white px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-6">
        <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft animate-float-in dark:border-slate-700/60 dark:bg-slate-800/90">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <button type="button" onClick={() => navigate('/')} className="flex items-center gap-4 text-left">
                <img src="/logo.svg" alt="Logo" className="h-12 w-12 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{t.appTitle}</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{t.appSubtitle}</p>
                </div>
              </button>
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                {streak > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-2 text-sm font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <Flame className="h-4 w-4" />
                    {streak}
                  </div>
                )}
                <Button type="button" variant={activeView === 'myquiz' ? 'default' : 'outline'} className="gap-2" onClick={() => navigate('/quiz')}>
                  <Wand2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.myQuizTitle}</span>
                </Button>
                <Button type="button" variant={activeView === 'upload' ? 'default' : 'outline'} className="gap-2" onClick={() => navigate('/upload-word')}>
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.uploadLesson}</span>
                </Button>
                <div className="w-[140px]">
                  <Select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)}>
                    {languageOptions.map((language) => (
                      <option key={language.id} value={language.id}>{language.label}</option>
                    ))}
                  </Select>
                </div>
<Button type="button" variant="outline" size="icon" onClick={() => setIsDarkMode((prev) => !prev)} aria-label="Toggle dark mode">
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {user && (
                  <>
                    {role === 'admin' && (
                      <Button type="button" variant="outline" className="gap-2" onClick={() => navigate('/admin')}>
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    )}
                    {(role === 'teacher' || role === 'admin') && (
                      <Button type="button" variant="outline" className="gap-2" onClick={() => navigate('/teacher')}>
                        <span className="hidden sm:inline">Dashboard</span>
                      </Button>
                    )}
                    <Button type="button" variant="outline" className="gap-2" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">Sign out</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleUploadFile} />

        {activeView === 'myquiz' ? (
          <Suspense fallback={null}>
            <MyQuizPage
              books={books}
              uploadedLessons={uploadedLessons}
              favoriteVocabulary={favoriteVocabulary}
              onStart={handleStartCustomQuiz}
              onBack={() => navigate('/')}
              t={t}
            />
          </Suspense>
        ) : activeView === 'upload' ? (
          <Suspense fallback={null}>
            <UploadGuide
              onBackToLearn={() => navigate('/')}
              onOpenPicker={() => fileInputRef.current?.click()}
              maxUploadLabel={formatFileSize(MAX_UPLOAD_BYTES)}
              lastUploadedName={lastUploadedName}
              uploadError={uploadError}
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

	                    <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
	                      <CardContent className="p-4 sm:p-5">
	                        <div className="md:hidden">
	                          <div className="flex items-center gap-2">
	                          <Button
	                            onClick={handlePrevious}
	                            disabled={currentIndex === 0}
	                            size="sm"
	                            className="min-w-0 px-3"
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
	                            className="min-w-0 px-3"
	                            variant={currentIndex === activeVocabulary.length - 1 ? 'outline' : 'default'}
	                            aria-label={t.next}
	                            title={t.next}
	                          >
	                            <ArrowRight className="h-4 w-4" />
	                          </Button>
	                          <Button onClick={handleFlipCard} size="sm" className="flex-1" variant="secondary">
	                            {t.flipCardAction}
	                          </Button>
	                          <div className="shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700 dark:bg-slate-700 dark:text-slate-300">
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
	                ) : (
                  <Suspense fallback={null}>
                  <Quiz
                    vocabulary={activeVocabulary}
                    choicePool={customQuizPool ?? (deckSource === 'favorites' ? vocabulary : undefined)}
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

        <footer className="mt-auto border-t border-slate-200/80 py-6 text-center text-sm text-slate-500 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Heart className="h-4 w-4 fill-green-500 text-green-500" />
            <span className="font-medium">{t.madeBy}</span>
            <span className="text-slate-400">·</span>
            <span>{APP_VERSION}</span>
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
  );
}
