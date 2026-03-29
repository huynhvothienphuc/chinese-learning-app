import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookHeart,
  Heart,
  RotateCcw,
  Shuffle,
  Upload,
} from 'lucide-react';
import FavoritesPanel from '@/components/FavoritesPanel';
import Flashcard from '@/components/Flashcard';
import Quiz from '@/components/Quiz';
import SectionSelector from '@/components/SectionSelector';
import UploadGuide from '@/components/UploadGuide';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatSectionName, normalizeVocabularyItems, parseVocabularyText, shuffleArray } from '@/lib/utils';
import './App.css';

const INITIAL_SCORE = { correct: 0, total: 0 };
const SESSION_UPLOADS_KEY = 'uploaded-sections';
const SESSION_SELECTED_BOOK_KEY = 'selected-book';
const SESSION_SELECTED_SECTION_KEY = 'selected-sections-by-book';
const FAVORITES_STORAGE_KEY = 'favorite-vocabulary';
const MAX_UPLOAD_BYTES = 300 * 1024;
const USER_UPLOAD_BOOK_ID = 'user-upload';
const APP_VERSION = 'v1.0.3';
const LANGUAGE_OPTIONS = [{ id: 'vi', label: '🇻🇳 Viet Nam' }];

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
          return {
            id: lesson.id || `user-upload-${index + 1}`,
            fileName: lesson.fileName || lesson.name || `upload-${index + 1}.txt`,
            title: lesson.title || (index === 0 ? 'User upload' : `User upload ${index + 1}`),
            text: lesson.text || '',
          };
        })
        .filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([fileName, text], index) => ({
        id: `user-upload-${index + 1}`,
        fileName,
        title: index === 0 ? 'User upload' : `User upload ${index + 1}`,
        text: typeof text === 'string' ? text : '',
      }));
    }

    return [];
  } catch {
    return [];
  }
}

export default function App() {
  const [baseBooks, setBaseBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('vi');
  const [vocabulary, setVocabulary] = useState([]);
  const [originalVocabulary, setOriginalVocabulary] = useState([]);
  const [uploadedLessons, setUploadedLessons] = useState([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [mode, setMode] = useState('flashcard');
  const [quizSource, setQuizSource] = useState('all');
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
  const [favorites, setFavorites] = useState([]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [lastUploadedName, setLastUploadedName] = useState('');
  const fileInputRef = useRef(null);

  const books = useMemo(() => {
    const nextBooks = [...baseBooks];
    if (uploadedLessons.length > 0) {
      nextBooks.push({
        id: USER_UPLOAD_BOOK_ID,
        title: 'User upload',
        description: 'Session-only uploaded lessons',
      });
    }
    return nextBooks;
  }, [baseBooks, uploadedLessons]);

  function resetInteractiveState() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore(INITIAL_SCORE);
    setAnsweredQuestion(null);
    setWrongAnswers([]);
    setQuizComplete(false);
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setError('');

        const [booksResponse, savedUploadsRaw] = await Promise.all([
          fetch('/data/books.json'),
          Promise.resolve(sessionStorage.getItem(SESSION_UPLOADS_KEY)),
        ]);

        const booksData = await booksResponse.json();
        const normalizedUploads = normalizeUploadedLessons(savedUploadsRaw);

        setBaseBooks(booksData);
        setUploadedLessons(normalizedUploads);

        const savedBook = sessionStorage.getItem(SESSION_SELECTED_BOOK_KEY);
        const availableBookIds = [
          ...booksData.map((book) => book.id),
          ...(normalizedUploads.length > 0 ? [USER_UPLOAD_BOOK_ID] : []),
        ];
        const nextBook =
          savedBook && availableBookIds.includes(savedBook) ? savedBook : availableBookIds[0] || '';
        setSelectedBook(nextBook);
      } catch {
        setError('Unable to load books. Please check the local data files.');
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();

    if (!('speechSynthesis' in window)) return undefined;
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore localStorage write errors
    }
  }, [favorites]);

  useEffect(() => {
    if (!books.length) return;
    if (!selectedBook || !books.some((book) => book.id === selectedBook)) {
      setSelectedBook(books[0].id);
    }
  }, [books, selectedBook]);

  useEffect(() => {
    if (selectedBook) {
      sessionStorage.setItem(SESSION_SELECTED_BOOK_KEY, selectedBook);
    }
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
        setError('Unable to load sections for this book.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSectionsForBook();
  }, [selectedBook, uploadedLessons]);

  useEffect(() => {
    if (!selectedBook || !selectedSection) return;
    const savedByBook = JSON.parse(sessionStorage.getItem(SESSION_SELECTED_SECTION_KEY) || '{}');
    savedByBook[selectedBook] = selectedSection;
    sessionStorage.setItem(SESSION_SELECTED_SECTION_KEY, JSON.stringify(savedByBook));
  }, [selectedBook, selectedSection]);

  useEffect(() => {
    if (!selectedBook || !selectedSection) return;
    if (selectedBook !== USER_UPLOAD_BOOK_ID && !sections.some((section) => section.file === selectedSection)) {
      return;
    }

    async function loadVocabulary() {
      try {
        setIsLoading(true);
        setError('');

        let parsed = [];
        if (selectedBook === USER_UPLOAD_BOOK_ID) {
          const text = uploadedLessons.find((lesson) => lesson.id === selectedSection)?.text || '';
          parsed = parseVocabularyText(text);
        } else {
          const response = await fetch(`/data/books/${selectedBook}/${selectedSection}`);
          const data = await response.json();
          parsed = normalizeVocabularyItems(data?.items || data);
        }

        setOriginalVocabulary(parsed);
        setVocabulary(parsed);
        resetInteractiveState();
        setIsShuffled(false);
      } catch {
        setError('Unable to load vocabulary. Please verify the selected file.');
        setOriginalVocabulary([]);
        setVocabulary([]);
        resetInteractiveState();
      } finally {
        setIsLoading(false);
      }
    }

    loadVocabulary();
  }, [selectedBook, selectedSection, uploadedLessons, sections]);

  const favoriteVocabulary = useMemo(
    () =>
      favorites.map((favorite, index) => ({
        id: favorite.favoriteKey || `${favorite.bookId}-${favorite.section}-${favorite.chinese}-${index}`,
        chinese: favorite.chinese,
        pinyin: favorite.pinyin,
        english: favorite.english,
        sentenceChinese: favorite.sentenceChinese,
        sentencePinyin: favorite.sentencePinyin,
        sentenceEnglish: favorite.sentenceEnglish,
      })),
    [favorites],
  );

  const activeVocabulary = mode === 'quiz' && quizSource === 'favorites' ? favoriteVocabulary : vocabulary;

  useEffect(() => {
    if (mode !== 'flashcard' || activeView !== 'learn') return undefined;

    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return;

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
  const selectedBookMeta = books.find((book) => book.id === selectedBook);
  const currentSectionMeta = sections.find((section) => section.file === selectedSection);
  const sectionLabel = currentSectionMeta?.title || formatSectionName(selectedSection || '');
  const bookLabel = selectedBookMeta?.title || 'User upload';
  const showNoData = !isLoading && !error && activeView === 'learn' && activeVocabulary.length === 0;

  const headerScore = useMemo(() => {
    if (mode !== 'quiz' || activeView !== 'learn') return null;
    return `${score.correct} / ${score.total}`;
  }, [activeView, mode, score.correct, score.total]);

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
          sentenceChinese: item.sentenceChinese,
          sentencePinyin: item.sentencePinyin,
          sentenceEnglish: item.sentenceEnglish,
        },
        ...prev,
      ];
    });
  }

  function removeFavorite(favoriteKey) {
    setFavorites((prev) => prev.filter((favorite) => favorite.favoriteKey !== favoriteKey));
  }

  function startFlashcards() {
    setMode('flashcard');
    setQuizSource('all');
    resetInteractiveState();
  }

  function startQuizAll() {
    setMode('quiz');
    setQuizSource('all');
    resetInteractiveState();
  }

  function startQuizFavorites() {
    if (favorites.length === 0) return;
    setMode('quiz');
    setQuizSource('favorites');
    resetInteractiveState();
  }

  function handleShuffleToggle() {
    if (originalVocabulary.length === 0 || mode !== 'flashcard') return;

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

      if (!file.name.toLowerCase().endsWith('.txt')) {
        setUploadError('Only .txt files are allowed.');
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`File is too large. Maximum size is ${formatFileSize(MAX_UPLOAD_BYTES)}.`);
        return;
      }

      setIsLoading(true);
      const text = await file.text();
      const nextIndex = uploadedLessons.length + 1;
      const nextLesson = {
        id: `user-upload-${Date.now()}`,
        fileName: file.name,
        title: nextIndex === 1 ? 'User upload' : `User upload ${nextIndex}`,
        text,
      };

      const nextUploads = [...uploadedLessons, nextLesson];
      setUploadedLessons(nextUploads);
      sessionStorage.setItem(SESSION_UPLOADS_KEY, JSON.stringify(nextUploads));

      setLastUploadedName(nextLesson.title);
      setSelectedBook(USER_UPLOAD_BOOK_ID);
      setSelectedSection(nextLesson.id);
      setActiveView('learn');
      startFlashcards();
    } catch {
      setUploadError('Unable to read uploaded file.');
      setOriginalVocabulary([]);
      setVocabulary([]);
      resetInteractiveState();
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-3 py-4 text-slate-900 sm:px-4 sm:py-6 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-6">
        <Card className="overflow-hidden border-white/60 bg-white/80 shadow-soft backdrop-blur-xl">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <img
                  src="/favicon.svg"
                  alt="Raccoon logo"
                  className="h-12 w-12 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm"
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Raccoon Chinese Cards</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Learn, test, and review your favorite list.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start lg:justify-end">
                <Button
                  type="button"
                  variant={activeView === 'learn' ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setActiveView('learn')}
                >
                  Learn
                </Button>
                <Button
                  type="button"
                  variant={activeView === 'upload' ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={() => setActiveView('upload')}
                >
                  <Upload className="h-4 w-4" />
                  Upload Lesson
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => setIsFavoritesOpen(true)}>
                  <BookHeart className="h-4 w-4" />
                  Favorite List ({favorites.length})
                </Button>
                <Select
                  className="w-[160px] min-w-[160px]"
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.label}
                    </option>
                  ))}
                </Select>
                {headerScore ? (
                  <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">Score: {headerScore}</div>
                ) : null}
              </div>
            </div>

            {activeView === 'learn' ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(170px,0.85fr)_minmax(220px,1fr)_auto_auto] xl:items-center">
                <Select className="w-full min-w-0" value={selectedBook} onChange={(event) => setSelectedBook(event.target.value)}>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                    </option>
                  ))}
                </Select>

                <SectionSelector sections={sections} selectedSection={selectedSection} onChange={setSelectedSection} />

                <div className="flex flex-wrap items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={startFlashcards}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      mode === 'flashcard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Learn
                  </button>
                  <button
                    type="button"
                    onClick={startQuizAll}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      mode === 'quiz' && quizSource === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={startQuizFavorites}
                    disabled={favorites.length === 0}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      mode === 'quiz' && quizSource === 'favorites'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : favorites.length === 0
                          ? 'cursor-not-allowed text-slate-300'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Test Favorites
                  </button>
                </div>

                <Button
                  variant="outline"
                  onClick={handleShuffleToggle}
                  disabled={activeVocabulary.length === 0 || mode !== 'flashcard'}
                  className={`min-w-fit gap-2 border-0 text-white hover:text-white ${
                    isShuffled ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {isShuffled ? <RotateCcw className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
                  {isShuffled ? 'Reset Order' : 'Mix'}
                </Button>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Upload custom lesson files for this browser session. Uploaded lessons will appear under the book named User upload.
              </div>
            )}
          </CardContent>
        </Card>

        <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleUploadFile} />

        {activeView === 'upload' ? (
          <UploadGuide
            onBackToLearn={() => setActiveView('learn')}
            onOpenPicker={() => fileInputRef.current?.click()}
            maxUploadLabel={formatFileSize(MAX_UPLOAD_BYTES)}
            lastUploadedName={lastUploadedName}
            uploadError={uploadError}
          />
        ) : error ? (
          <Card className="shadow-soft">
            <CardContent className="p-8 text-center text-rose-600">{error}</CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="shadow-soft">
            <CardContent className="p-8 text-center text-slate-600">Loading vocabulary…</CardContent>
          </Card>
        ) : showNoData ? (
          <Card className="shadow-soft">
            <CardContent className="p-8 text-center text-slate-500">No data found in this section.</CardContent>
          </Card>
        ) : mode === 'flashcard' ? (
          <div className="space-y-5">
            <Flashcard
              item={currentItem}
              flipped={isFlipped}
              onFlip={() => setIsFlipped((prev) => !prev)}
              isFavorite={currentItem ? isFavorite(currentItem) : false}
              onToggleFavorite={() => toggleFavorite(currentItem)}
            />

            <Card className="border-white/60 bg-white/85 shadow-soft">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                  <Button onClick={handlePrevious} disabled={currentIndex === 0} className="w-full gap-2 md:w-auto">
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700">
                    {activeVocabulary.length === 0 ? 0 : currentIndex + 1} / {activeVocabulary.length}
                  </div>

                  <Button
                    onClick={handleNextFlashcard}
                    disabled={currentIndex === activeVocabulary.length - 1}
                    className="w-full gap-2 md:w-auto"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                  {'['} Previous <span className="font-semibold px-2">←</span> {']'}
                  {'['} Next <span className="font-semibold px-2">→</span> {']'}
                  {'['} Flip <span className="font-semibold px-2">↑</span> {']'}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Quiz
            vocabulary={activeVocabulary}
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
          />
        )}

        <footer className="mt-auto border-t border-slate-200/80 py-6 text-center text-sm text-slate-500">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Heart className="h-4 w-4 fill-green-500 text-green-500" />
            <span className="font-medium">Made by Phuc Huynh - 黃武天福</span>
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
      />
    </div>
  );
}
