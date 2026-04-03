import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, Moon, Sun, Upload, Wand2 } from 'lucide-react';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import FavoritesPanel from '@/components/FavoritesPanel';
import Flashcard from '@/components/Flashcard';
import Quiz from '@/components/Quiz';
import WordListView from '@/components/WordListView';
import MyQuizPage from '@/components/MyQuizPage';
import UploadGuide from '@/components/UploadGuide';
import StudyDeckPanel from '@/components/StudyDeckPanel';
import StudyModeTabs from '@/components/StudyModeTabs';
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
const APP_VERSION = 'v1.3.2';

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
  const [mode, setMode] = useState('flashcard');
  const [deckSource, setDeckSource] = useState('all');
  const [activeView, setActiveView] = useState('learn');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [favorites, setFavorites] = useLocalStorageState(FAVORITES_STORAGE_KEY, []);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [customQuizWords, setCustomQuizWords] = useState(null);
  const [customQuizPool, setCustomQuizPool] = useState(null);
  const [lastUploadedName, setLastUploadedName] = useState('');
  const [isDarkMode, setIsDarkMode] = useLocalStorageState('dark-mode', false);
  const fileInputRef = useRef(null);

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
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setError('');

        const [booksResponse, savedUploadsRaw] = await Promise.all([
          fetch('/data/books.json'),
          Promise.resolve(localStorage.getItem(UPLOADED_LESSONS_STORAGE_KEY) || sessionStorage.getItem(LEGACY_SESSION_UPLOADS_KEY)),
        ]);

        if (!booksResponse.ok) throw new Error('Failed to load books');
        const booksData = await booksResponse.json();
        const normalizedUploads = normalizeUploadedLessons(savedUploadsRaw);

        setBaseBooks(booksData);
        setUploadedLessons(normalizedUploads);
        if (normalizedUploads.length > 0) {
          localStorage.setItem(UPLOADED_LESSONS_STORAGE_KEY, JSON.stringify(normalizedUploads));
        }

        const savedBook = sessionStorage.getItem(SESSION_SELECTED_BOOK_KEY);
        const availableBookIds = [
          ...booksData.map((book) => book.id),
          ...(normalizedUploads.length > 0 ? [USER_UPLOAD_BOOK_ID] : []),
        ];

        setSelectedBook(savedBook && availableBookIds.includes(savedBook) ? savedBook : availableBookIds[0] || '');
      } catch {
        setError(t.uploadBooksError);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();

    if (!('speechSynthesis' in window)) return undefined;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [t.uploadBooksError]);


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
    if (selectedBook !== USER_UPLOAD_BOOK_ID && !sections.some((section) => section.file === selectedSection)) return;

    async function loadVocabulary() {
      try {
        setIsLoading(true);
        setError('');

        let parsed = [];
        if (selectedBook === USER_UPLOAD_BOOK_ID) {
          parsed = uploadedLessons.find((lesson) => lesson.id === selectedSection)?.items || [];
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
  const favoriteCount = favorites.length;
  const activeTab = mode === 'quiz' ? 'quiz' : mode === 'review' ? 'review' : 'flashcard';

  function getFavoriteKey(item, section = selectedSection) {
    return `${selectedBook}__${section}__${item.chinese}__${item.pinyin}`;
  }

  function isFavorite(item, section = selectedSection) {
    if (!item) return false;
    const key = getFavoriteKey(item, section);
    return favorites.some((favorite) => favorite.favoriteKey === key);
  }

  function toggleFavorite(item) {
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
  }

  function removeFavorite(favoriteKey) {
    setFavorites((prev) => prev.filter((favorite) => favorite.favoriteKey !== favoriteKey));
  }

  function startFlashcards() {
    setActiveView('learn');
    setMode('flashcard');
    setDeckSource('all');
    resetInteractiveState();
    trackEvent('start_flashcards', { book_id: selectedBook, section_id: selectedSection, source: 'all' });
  }

  function startQuiz() {
    setActiveView('learn');
    setMode('quiz');
    resetInteractiveState();
    trackEvent('start_quiz', { source: deckSource, book_id: selectedBook, section_id: selectedSection });
  }

  function startQuizFavorites() {
    if (favorites.length === 0) return;
    setIsFavoritesOpen(false);
    setActiveView('learn');
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
      setActiveView('learn');
      resetInteractiveState();
      return;
    }

    if (nextTab === 'review') {
      setMode('review');
      setActiveView('learn');
      return;
    }

    startFlashcards();
  }

  function handleStartCustomQuiz(words, pool) {
    setCustomQuizWords(words);
    setCustomQuizPool(pool);
    setActiveView('learn');
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

  function handleNextFlashcard() {
    if (currentIndex >= activeVocabulary.length - 1) return;
    setCurrentIndex((prev) => prev + 1);
    setIsFlipped(false);
  }

  function handleAnswer(choice) {
    if (!currentItem || answeredQuestion) return;

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
    setActiveView('learn');
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
      setActiveView('learn');
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

  return (
    <div className="min-h-screen bg-white px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-6">
        <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft animate-float-in dark:border-slate-700/60 dark:bg-slate-800/90">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <button type="button" onClick={() => setActiveView('learn')} className="flex items-center gap-4 text-left">
                <img src="/favicon.svg" alt="Raccoon logo" className="h-12 w-12 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{t.appTitle}</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{t.appSubtitle}</p>
                </div>
              </button>
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                <Button type="button" variant={activeView === 'myquiz' ? 'default' : 'outline'} className="gap-2" onClick={() => setActiveView('myquiz')}>
                  <Wand2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.myQuizTitle}</span>
                </Button>
                <Button type="button" variant={activeView === 'upload' ? 'default' : 'outline'} className="gap-2" onClick={() => setActiveView('upload')}>
                  <Upload className="h-4 w-4" />
                  {t.uploadLesson}
                </Button>
                <div className="min-w-[170px]">
                  <Select className="w-[170px] min-w-[170px]" value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)}>
                    {languageOptions.map((language) => (
                      <option key={language.id} value={language.id}>{language.label}</option>
                    ))}
                  </Select>
                </div>
                <Button type="button" variant="outline" className="gap-2" onClick={() => setIsFavoritesOpen(true)}>
                  <Heart className="h-4 w-4" />
                  {favoriteCount > 0 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">{favoriteCount}</span>}
                  <span className="hidden sm:inline">{t.favoriteList}</span>
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsDarkMode((prev) => !prev)} aria-label="Toggle dark mode">
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleUploadFile} />

        {activeView === 'myquiz' ? (
          <MyQuizPage
            books={books}
            uploadedLessons={uploadedLessons}
            favoriteVocabulary={favoriteVocabulary}
            onStart={handleStartCustomQuiz}
            onBack={() => setActiveView('learn')}
            t={t}
          />
        ) : activeView === 'upload' ? (
          <UploadGuide
            onBackToLearn={() => setActiveView('learn')}
            onOpenPicker={() => fileInputRef.current?.click()}
            maxUploadLabel={formatFileSize(MAX_UPLOAD_BYTES)}
            lastUploadedName={lastUploadedName}
            uploadError={uploadError}
            t={t}
          />
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
              lessonCount={vocabulary.length}
              favoriteCount={favoriteCount}
            />

            <StudyModeTabs t={t} activeTab={activeTab} onChange={handleModeTabChange} />

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
                  <WordListView
                    vocabulary={vocabulary}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    language={selectedLanguage}
                    t={t}
                  />
                ) : mode === 'flashcard' ? (
                  <>
                    <Flashcard
                      item={currentItem}
                      flipped={isFlipped}
                      onFlip={() => setIsFlipped((prev) => !prev)}
                      isFavorite={currentItem ? isFavorite(currentItem) : false}
                      onToggleFavorite={() => toggleFavorite(currentItem)}
                      language={selectedLanguage}
                      canShuffle={deckSource === 'all' && originalVocabulary.length > 0}
                      isShuffled={isShuffled}
                      onShuffle={handleShuffleToggle}
                      t={t}
                    />

                    <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
                      <CardContent className="space-y-4 p-4 sm:p-5">
                        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                          <Button onClick={handlePrevious} disabled={currentIndex === 0} className="w-full gap-2 md:w-auto" variant={currentIndex === activeVocabulary.length - 1 ? 'default' : 'outline'}>
                            <ArrowLeft className="h-4 w-4" />
                            {t.previous}
                          </Button>

                          <div className="rounded-full bg-green-100 px-5 py-2 text-sm font-semibold text-green-700 dark:bg-slate-700 dark:text-slate-300">
                            {activeVocabulary.length === 0 ? 0 : currentIndex + 1} / {activeVocabulary.length}
                          </div>

                          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                            <Button onClick={() => setIsFlipped((prev) => !prev)} className="w-full gap-2 md:w-auto" variant="secondary">
                              {t.flipCardAction}
                            </Button>
                            <Button onClick={handleNextFlashcard} disabled={currentIndex === activeVocabulary.length - 1} className="w-full gap-2 md:w-auto" variant={currentIndex === activeVocabulary.length - 1 ? 'outline' : 'default'}>
                              {t.next}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="hidden md:block rounded-3xl border border-dashed border-green-200 bg-green-50/50 px-4 py-3 text-center text-sm text-green-600 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-400">
                          {'['} {t.previous}<span className="font-semibold px-2">←</span> {']'}
                          {'['} {t.next} <span className="font-semibold px-2">→</span>{']'}
                          {'['} {t.flipLabel} <span className="font-semibold px-2">↑</span>{']'}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
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
                    isFavorite={currentItem ? isFavorite(currentItem) : false}
                    onToggleFavorite={() => toggleFavorite(currentItem)}
                    language={selectedLanguage}
                    deckSource={deckSource}
                    t={t}
                  />
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

      <FavoritesPanel
        isOpen={isFavoritesOpen}
        favorites={favorites}
        onClose={() => setIsFavoritesOpen(false)}
        onRemove={removeFavorite}
        onQuizFavorites={startQuizFavorites}
        language={selectedLanguage}
        t={t}
      />
    </div>
  );
}
