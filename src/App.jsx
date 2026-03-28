import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Shuffle,
  Sparkles,
  Upload,
    Download,
} from 'lucide-react';
import SectionSelector from '@/components/SectionSelector';
import Flashcard from '@/components/Flashcard';
import Quiz from '@/components/Quiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseVocabularyText, shuffleArray } from '@/lib/utils';
import './App.css';

const INITIAL_SCORE = { correct: 0, total: 0 };

const SESSION_UPLOADS_KEY = 'uploaded-sections';
const SESSION_SELECTED_KEY = 'selected-section';
const MAX_UPLOAD_BYTES = 300 * 1024; // 300 KB

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function App() {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [vocabulary, setVocabulary] = useState([]);
  const [originalVocabulary, setOriginalVocabulary] = useState([]);
  const [uploadedSections, setUploadedSections] = useState({});
  const [isShuffled, setIsShuffled] = useState(false);
  const [mode, setMode] = useState('flashcard');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  function resetInteractiveState() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore(INITIAL_SCORE);
    setAnsweredQuestion(null);
    setWrongAnswers([]);
    setQuizComplete(false);
  }

  useEffect(() => {
    async function loadSections() {
      try {
        setIsLoading(true);
        setError('');

        const response = await fetch('/data/sections.json');
        const data = await response.json();

        const savedUploads = sessionStorage.getItem(SESSION_UPLOADS_KEY);
        const parsedUploads = savedUploads
          ? JSON.parse(savedUploads)
          : {};

        setUploadedSections(parsedUploads);

        const uploadedNames = Object.keys(parsedUploads);
        const mergedSections = [
          ...data,
          ...uploadedNames.filter((name) => !data.includes(name)),
        ];

        setSections(mergedSections);

        const savedSelected = sessionStorage.getItem(SESSION_SELECTED_KEY);
        if (savedSelected && mergedSections.includes(savedSelected)) {
          setSelectedSection(savedSelected);
        } else if (mergedSections.length > 0) {
          setSelectedSection(mergedSections[0]);
        }
      } catch {
        setError('Unable to load sections. Please check the local data files.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSections();

    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  useEffect(() => {
    if (selectedSection) {
      sessionStorage.setItem(SESSION_SELECTED_KEY, selectedSection);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (!selectedSection) return;

    async function loadVocabulary() {
      try {
        setIsLoading(true);
        setError('');

        let text = '';

        if (uploadedSections[selectedSection]) {
          text = uploadedSections[selectedSection];
        } else {
          const response = await fetch(`/data/sections/${selectedSection}`);
          text = await response.text();
        }

        const parsed = parseVocabularyText(text);

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
  }, [selectedSection, uploadedSections]);

  useEffect(() => {
    if (mode !== 'flashcard') {
      return undefined;
    }

    const onKeyDown = (event) => {
      const target = event.target;
      const targetTag = target?.tagName ?? '';

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) {
        return;
      }

      const key = event.key;

      if ([' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ',', '.', '<', '>'].includes(key)) {
        event.preventDefault();
      }

      if ((key === ' ' || key === 'ArrowUp') && vocabulary.length > 0) {
        setIsFlipped((prev) => !prev);
      }

      if ((key === 'ArrowLeft' || key === ',' || key === '<') && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        setIsFlipped(false);
      }

      if (
        (key === 'ArrowRight' || key === '.' || key === '>') &&
        currentIndex < vocabulary.length - 1
      ) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentIndex, mode, vocabulary.length]);

  const currentItem = vocabulary[currentIndex];

  const headerScore = useMemo(() => {
    if (mode !== 'quiz') return null;
    return `${score.correct} / ${score.total}`;
  }, [mode, score.correct, score.total]);

  const showNoData = !isLoading && !error && vocabulary.length === 0;

  function handleModeChange(nextMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetInteractiveState();
  }

  function handleShuffleToggle() {
    if (originalVocabulary.length === 0) return;

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
    if (currentIndex >= vocabulary.length - 1) return;
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
      setWrongAnswers((prev) => [
        ...prev,
        {
          item: currentItem,
          selectedAnswer: choice.chinese,
        },
      ]);
    }
  }

  function handleNextQuestion() {
    if (currentIndex >= vocabulary.length - 1) {
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
  }

  async function handleUploadFile(event) {
    const file = event.target.files?.[0];

    try {
      setError('');

      if (!file) return;

      const isTxtFile = file.name.toLowerCase().endsWith('.txt');
      if (!isTxtFile) {
        setError('Only .txt files are allowed.');
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`File is too large. Maximum size is ${formatFileSize(MAX_UPLOAD_BYTES)}.`);
        return;
      }

      setIsLoading(true);

      const text = await file.text();

      const nextUploads = {
        ...uploadedSections,
        [file.name]: text,
      };

      setUploadedSections(nextUploads);
      sessionStorage.setItem(SESSION_UPLOADS_KEY, JSON.stringify(nextUploads));

      setSections((prev) => {
        if (prev.includes(file.name)) return prev;
        return [...prev, file.name];
      });

      setSelectedSection(file.name);
    } catch {
      setError('Unable to read uploaded file.');
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card className="border-white/60 bg-white/80 backdrop-blur-xl">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-fit items-center gap-2 pr-3">
                <div className="rounded-2xl bg-blue-100 p-2 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight md:text-xl">
                    中文學習卡
                  </h1>
                </div>
              </div>

              <SectionSelector
                sections={sections}
                selectedSection={selectedSection}
                onChange={setSelectedSection}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleUploadFile}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={handleUploadFile}
              />

              <Button
                type="button"
                variant="outline"
                className="min-w-fit gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload File
              </Button>

              <a
                href="/data/sections/upload-template-section.txt"
                download="upload-template-section.txt"
                className="inline-flex min-w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download Template
              </a>

              <div className="text-xs text-slate-500">
                .txt only • max {formatFileSize(MAX_UPLOAD_BYTES)}
              </div>
              <div className="flex min-w-fit items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange('flashcard')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'flashcard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Flashcard
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('quiz')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'quiz'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Multiple Choice
                </button>
              </div>

              <Button
                variant="outline"
                onClick={handleShuffleToggle}
                disabled={vocabulary.length === 0}
                className={`min-w-fit gap-2 border-0 text-white hover:text-white ${isShuffled
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-orange-500 hover:bg-orange-600'
                  }`}
              >
                {isShuffled ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}
                {isShuffled ? 'Reset Order' : 'Mix'}
              </Button>

              {headerScore && (
                <div className="min-w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 md:ml-auto">
                  Score: {headerScore}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card>
            <CardContent className="p-8 text-center text-rose-600">
              {error}
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-600">
              Loading vocabulary…
            </CardContent>
          </Card>
        ) : showNoData ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No data found in this section.
            </CardContent>
          </Card>
        ) : mode === 'flashcard' ? (
          <div className="space-y-5">
            <Flashcard
              item={currentItem}
              flipped={isFlipped}
              onFlip={() => setIsFlipped((prev) => !prev)}
            />

            <Card className="border-white/60 bg-white/85">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                  <Button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="w-full gap-2 transition-transform hover:scale-105 md:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700">
                    {vocabulary.length === 0 ? 0 : currentIndex + 1} / {vocabulary.length}
                  </div>

                  <Button
                    onClick={handleNextFlashcard}
                    disabled={currentIndex === vocabulary.length - 1}
                    className="w-full gap-2 transition-transform hover:scale-105 md:w-auto"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                  Keyboard: <span className="font-semibold">, / &lt; / ←</span> Previous •{' '}
                  <span className="font-semibold">. / &gt; / →</span> Next •{' '}
                  <span className="font-semibold">Space / ↑</span> Flip
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Quiz
            vocabulary={vocabulary}
            currentIndex={currentIndex}
            answeredQuestion={answeredQuestion}
            onAnswer={handleAnswer}
            onNext={handleNextQuestion}
            score={score}
            isComplete={quizComplete}
            wrongAnswers={wrongAnswers}
            onRestart={handleRestartQuiz}
          />
        )}
      </div>
    </div>
  );
}