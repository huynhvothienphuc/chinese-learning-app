import { useEffect, useMemo, useRef, useState } from 'react';
import { buildQuizChoices, shuffleArray } from '@/lib/utils';

const INITIAL_SCORE = { correct: 0, total: 0 };

/**
 * Owns all study-mode state: mode, deck, navigation, quiz answers, write answers.
 * @param {Object} opts
 * @param {Array}    opts.rawVocab          - Canonical vocabulary for the current section.
 * @param {Array}    opts.favoriteVocabulary - Derived favorites list for the favorites deck.
 * @param {Function} opts.onQuizComplete     - Called with final score when quiz finishes.
 */
export function useStudySession({ rawVocab = [], favoriteVocabulary = [], onQuizComplete } = {}) {
  const [mode, setModeInternal] = useState('review');
  const [deckSource, setDeckSource] = useState('all');
  const [isShuffled, setIsShuffled] = useState(false);
  const [vocabulary, setVocabulary] = useState([]);
  const [originalVocabulary, setOriginalVocabulary] = useState([]);
  // null = use normal deck; array = override (retry-wrong set)
  const [overrideVocab, setOverrideVocab] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);
  // Bumped on restart to force allChoices rebuild even when vocabulary hasn't changed
  const [quizSeed, setQuizSeed] = useState(0);

  // Tracks score synchronously for the onQuizComplete callback
  const scoreRef = useRef(INITIAL_SCORE);

  // Reset everything when the raw vocab changes (new section selected)
  useEffect(() => {
    setOriginalVocabulary(rawVocab);
    setVocabulary(rawVocab);
    setOverrideVocab(null);
    setIsShuffled(false);
    resetState();
  }, [rawVocab]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetState() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore(INITIAL_SCORE);
    scoreRef.current = INITIAL_SCORE;
    setAnsweredQuestion(null);
    setWrongAnswers([]);
    setQuizComplete(false);
    setQuizSeed((s) => s + 1);
  }

  const testableVocabulary = useMemo(
    () => vocabulary.filter((item) => !item.notest),
    [vocabulary],
  );

  const activeVocabulary = useMemo(() => {
    if (overrideVocab !== null) return overrideVocab;
    if (deckSource === 'favorites') return favoriteVocabulary;
    return mode === 'review' ? vocabulary : testableVocabulary;
  }, [overrideVocab, deckSource, favoriteVocabulary, vocabulary, testableVocabulary, mode]);

  const pool = useMemo(() => {
    if (overrideVocab !== null) return overrideVocab;
    return deckSource === 'favorites' ? testableVocabulary : activeVocabulary;
  }, [overrideVocab, deckSource, testableVocabulary, activeVocabulary]);

  const allChoices = useMemo(
    () => activeVocabulary.map((item) => buildQuizChoices(pool, item)),
    [activeVocabulary, pool, quizSeed], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const currentItem = activeVocabulary[currentIndex] ?? null;

  // ── public setters ────────────────────────────────────────────────────────

  function setMode(nextMode) {
    setModeInternal(nextMode);
    setDeckSource('all');
    setOverrideVocab(null);
    resetState();
  }

  // ── flashcard handlers ────────────────────────────────────────────────────

  function handleFlipCard() {
    setIsFlipped((prev) => !prev);
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

  function handleShuffleToggle() {
    if (originalVocabulary.length === 0 || mode !== 'flashcard' || deckSource === 'favorites') return;
    if (isShuffled) {
      setVocabulary(originalVocabulary);
      setIsShuffled(false);
    } else {
      setVocabulary(shuffleArray([...originalVocabulary]));
      setIsShuffled(true);
    }
    resetState();
  }

  // ── quiz handlers ─────────────────────────────────────────────────────────

  function handleAnswer(choice) {
    if (!currentItem || answeredQuestion) return;
    const correct = choice.id === currentItem.id;
    const newScore = {
      correct: scoreRef.current.correct + (correct ? 1 : 0),
      total: scoreRef.current.total + 1,
    };
    scoreRef.current = newScore;
    setScore(newScore);
    setAnsweredQuestion({ selectedAnswer: choice.chinese, isCorrect: correct });
    if (!correct) {
      setWrongAnswers((prev) => [...prev, { item: currentItem, selectedAnswer: choice.chinese }]);
    }
  }

  function handleNextQuestion() {
    if (currentIndex >= activeVocabulary.length - 1) {
      setQuizComplete(true);
      setAnsweredQuestion(null);
      onQuizComplete?.(scoreRef.current);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setAnsweredQuestion(null);
  }

  function handleRestartQuiz() {
    setOverrideVocab(null);
    setModeInternal('quiz');
    setDeckSource('all');
    resetState();
  }

  function handleRetryWrongWords() {
    const words = wrongAnswers.map((w) => w.item);
    setOverrideVocab(words);
    resetState();
  }

  // ── favorites quiz ────────────────────────────────────────────────────────

  function startFavorites() {
    setDeckSource('favorites');
    setModeInternal('quiz');
    setOverrideVocab(null);
    resetState();
  }

  return {
    // state
    mode,
    deckSource,
    isShuffled,
    vocabulary,
    activeVocabulary,
    currentIndex,
    currentItem,
    isFlipped,
    score,
    answeredQuestion,
    wrongAnswers,
    quizComplete,
    allChoices,
    // setters / handlers
    setMode,
    handleFlipCard,
    handlePrevious,
    handleNextFlashcard,
    handleShuffleToggle,
    handleAnswer,
    handleNextQuestion,
    handleRestartQuiz,
    handleRetryWrongWords,
    startFavorites,
    resetInteractiveState: resetState,
  };
}
