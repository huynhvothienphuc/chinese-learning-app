import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { normalizeVocabularyItems, buildQuizChoices, shuffleArray } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Flashcard from '@/components/Flashcard';
import Quiz from '@/components/Quiz';
import { localeMap } from '@/locales';

const SESSION_LANGUAGE_KEY = 'selected-language';
const INITIAL_SCORE = { correct: 0, total: 0 };

export default function SharedBookPage({ token }) {
  const navigate = useNavigate();
  const language = (() => {
    const saved = localStorage.getItem(SESSION_LANGUAGE_KEY);
    return saved && localeMap[saved] ? saved : 'en';
  })();
  const t = localeMap[language];

  const [status, setStatus] = useState('loading'); // loading | password | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [bookData, setBookData] = useState(null);   // { id, title, description, sections[] }
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Study state
  const [selectedSection, setSelectedSection] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [mode, setMode] = useState('flashcard');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [answeredQuestion, setAnsweredQuestion] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => { tryPublic(); }, []);

  async function tryPublic() {
    setStatus('loading');
    const { data, error } = await supabase.rpc('get_shared_book', { p_token: token });
    if (error) { setStatus('error'); setErrorMsg('Failed to load shared book.'); return; }
    if (data) { loadBook(data); return; }
    // null = either private or doesn't exist — show password form
    setStatus('password');
  }

  async function tryPassword(e) {
    e.preventDefault();
    setPasswordError('');
    setVerifying(true);
    const { data, error } = await supabase.rpc('verify_shared_book', { p_token: token, p_password: password });
    setVerifying(false);
    if (error || !data) { setPasswordError('Incorrect password or invalid link.'); return; }
    loadBook(data);
  }

  function loadBook(data) {
    setBookData(data);
    const first = data.sections?.[0] ?? null;
    setSelectedSection(first);
    if (first) loadWords(first);
    setStatus('ready');
  }

  function loadWords(section) {
    const words = normalizeVocabularyItems(section.words ?? []);
    setVocabulary(words);
    resetStudy();
  }

  function resetStudy() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore(INITIAL_SCORE);
    setAnsweredQuestion(null);
    setWrongAnswers([]);
    setIsComplete(false);
  }

  function handleSectionChange(section) {
    setSelectedSection(section);
    loadWords(section);
    resetStudy();
  }

  function handleModeChange(next) {
    setMode(next);
    resetStudy();
  }

  // Flashcard nav
  function handlePrev() { setCurrentIndex((i) => Math.max(0, i - 1)); setIsFlipped(false); }
  function handleNext() { setCurrentIndex((i) => Math.min(vocabulary.length - 1, i + 1)); setIsFlipped(false); }

  // Quiz handlers
  function handleAnswer(choice) {
    const current = vocabulary[currentIndex];
    const isCorrect = choice === current.chinese;
    setAnsweredQuestion(choice);
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    if (!isCorrect) setWrongAnswers((w) => [...w, { item: current, selectedAnswer: choice }]);
  }
  function handleNext_quiz() {
    if (currentIndex >= vocabulary.length - 1) { setIsComplete(true); return; }
    setCurrentIndex((i) => i + 1);
    setAnsweredQuestion(null);
  }
  function handleRestart() {
    setVocabulary(shuffleArray(vocabulary));
    resetStudy();
  }

  // ── Render states ──────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-green-500" />
    </div>
  );

  if (status === 'error') return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 dark:bg-slate-950">
      <p className="text-slate-600">{errorMsg}</p>
      <Button variant="outline" onClick={() => navigate('/')}>← Back to home</Button>
    </div>
  );

  if (status === 'password') return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
        <CardContent className="p-6">
          <div className="mb-5 flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40">
              <Lock className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Private Book</h1>
            <p className="text-center text-sm text-slate-500">Enter the password to access this shared book.</p>
          </div>
          <form onSubmit={tryPassword} className="flex flex-col gap-3">
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            {passwordError && <p className="text-sm text-rose-500">{passwordError}</p>}
            <Button type="submit" disabled={verifying} className="gap-2">
              {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {verifying ? 'Verifying…' : 'Access book'}
            </Button>
            <button type="button" onClick={() => navigate('/')} className="text-center text-sm text-slate-500 hover:text-slate-700">
              ← Back to home
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  // ── Study view ─────────────────────────────────────────────────
  const sections = bookData?.sections ?? [];
  const wordCount = vocabulary.length;

  return (
    <div className="min-h-screen bg-white px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl flex-col gap-6">

        {/* Header */}
        <Card className="border-[#CAE8BD] bg-[#ECFAE5] shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigate('/')}>
                  <img src="/logo.svg" alt="Logo" className="h-10 w-10 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
                </button>
                <div>
                  <h1 className="font-black text-slate-900 dark:text-white">{bookData.title}</h1>
                  {bookData.description && <p className="text-sm text-slate-500">{bookData.description}</p>}
                  {bookData.teacher_email && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      by <span className="font-medium text-green-700 dark:text-green-400">{bookData.teacher_email.split('@')[0]}</span>
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate('/')}>
                <ArrowLeft className="h-3.5 w-3.5" /> Home
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section selector + mode tabs */}
        <Card className="shadow-soft">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Section picker */}
            {sections.length > 1 && (
              <select
                value={selectedSection?.id ?? ''}
                onChange={(e) => handleSectionChange(sections.find((s) => s.id === e.target.value))}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} ({(s.words ?? []).length} words)</option>
                ))}
              </select>
            )}

            {/* Mode tabs */}
            <div className="flex gap-2 shrink-0">
              {['flashcard', 'quiz'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${
                    mode === m
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {m === 'flashcard' ? t.learn ?? 'Flashcard' : t.test ?? 'Quiz'}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Study area */}
        {wordCount === 0 ? (
          <Card><CardContent className="p-10 text-center text-slate-500">No words in this section yet.</CardContent></Card>
        ) : mode === 'flashcard' ? (
          <>
            <Flashcard
              item={vocabulary[currentIndex]}
              flipped={isFlipped}
              onFlip={() => setIsFlipped((v) => !v)}
              language={language}
              t={t}
            />
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> {t.prev ?? 'Prev'}
              </Button>
              <span className="text-sm text-slate-500">{currentIndex + 1} / {wordCount}</span>
              <Button variant="outline" onClick={handleNext} disabled={currentIndex === wordCount - 1} className="gap-2">
                {t.next ?? 'Next'} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Quiz
            vocabulary={vocabulary}
            choicePool={vocabulary}
            currentIndex={currentIndex}
            answeredQuestion={answeredQuestion}
            onAnswer={handleAnswer}
            onNext={handleNext_quiz}
            score={score}
            isComplete={isComplete}
            wrongAnswers={wrongAnswers}
            onRestart={handleRestart}
            language={language}
            deckSource="all"
            t={t}
          />
        )}
      </div>
    </div>
  );
}
