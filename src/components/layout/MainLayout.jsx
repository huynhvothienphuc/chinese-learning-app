import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useBooks } from '@/hooks/useVocabData';
import { useStudentSets } from '@/hooks/useStudentData';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { localeMap } from '@/locales';
import { normalizeVocabularyItems, formatSectionName } from '@/lib/utils';
import {
  USER_UPLOAD_BOOK_ID,
  UPLOADED_LESSONS_KEY,
  FAVORITES_KEY,
  LANGUAGE_KEY,
} from '@/lib/constants';
import Navbar from '@/components/layout/Navbar';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const FavoritesPanel = lazy(() => import('@/components/FavoritesPanel'));

// ── helpers ──────────────────────────────────────────────────────────────────

function parseVocabularyText(text) {
  if (!text) return [];
  return text.split('\n').filter(Boolean).map((line) => {
    const [chinese = '', pinyin = '', english = '', vietnamese = ''] = line.split('\t');
    return { id: chinese, chinese, pinyin, english, vietnamese };
  }).filter((i) => i.chinese);
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
            title: lesson.title || formatSectionName(lesson.fileName || lesson.name || `upload-${index + 1}.xlsx`),
            items,
            uploadedAt: lesson.uploadedAt || null,
          };
        })
        .filter((l) => l && Array.isArray(l.items));
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
  } catch { /* ignore */ }
  return [];
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MainLayout() {
  const { user, role, authReady, signOut } = useAuthStore();
  const navigate = useNavigate();

  // ── settings (all localStorage-persisted) ──
  const [selectedLanguage, setSelectedLanguage] = useLocalStorageState(LANGUAGE_KEY, 'vi');
  const [isDarkMode, setIsDarkMode] = useLocalStorageState('dark-mode', false);
  const [theme, setTheme] = useLocalStorageState('app-theme', 'green');
  const [fontSize, setFontSize] = useLocalStorageState('font-size', 'lg');

  // ── favorites ──
  const [favorites, setFavorites] = useLocalStorageState(FAVORITES_KEY, []);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // ── uploaded lessons (localStorage) ──
  const [uploadedLessons, setUploadedLessons] = useState(() => {
    try {
      return normalizeUploadedLessons(localStorage.getItem(UPLOADED_LESSONS_KEY));
    } catch { return []; }
  });

  // ── server state ──
  const booksQuery = useBooks(user?.id, authReady);
  const booksData = booksQuery.data ?? [];
  const booksLoading = booksQuery.isLoading;
  const { data: supabaseSets = [] } = useStudentSets(user?.id);

  // ── CSS side-effects ──
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => {
    const sizeMap = { sm: '16px', md: '18px', lg: '20px', xl: '22px', xll: '24px', xxl: '26px' };
    document.documentElement.style.setProperty('--app-font-size', sizeMap[fontSize] ?? '16px');
  }, [fontSize]);

  // ── Speech synthesis warm-up ──
  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  // ── derived ──
  const t = localeMap[selectedLanguage] || localeMap.en;

  const books = useMemo(() => {
    const base = [...booksData];
    if (uploadedLessons.length > 0) {
      base.push({ id: USER_UPLOAD_BOOK_ID, title: t.userUploadBook, description: 'Saved in this browser' });
    }
    return base;
  }, [booksData, uploadedLessons, t.userUploadBook]);

  const languageOptions = useMemo(() => [
    { id: 'en', label: t.englishOption, flag: '🇺🇸' },
    { id: 'vi', label: t.vietnameseOption, flag: '🇻🇳' },
  ], [t.englishOption, t.vietnameseOption]);

  const selectedFlag = languageOptions.find((l) => l.id === selectedLanguage)?.flag ?? '🌐';

  const favoriteKeySet = useMemo(() => new Set(favorites.map((f) => f.favoriteKey)), [favorites]);

  const favoriteVocabulary = useMemo(
    () => favorites.map((fav, index) => ({
      id: fav.favoriteKey || `${fav.bookId}-${fav.section}-${fav.chinese}-${index}`,
      chinese: fav.chinese,
      pinyin: fav.pinyin,
      english: fav.english,
      vietnamese: fav.vietnamese || fav.english,
      sentenceChinese: fav.sentenceChinese,
      sentencePinyin: fav.sentencePinyin,
      sentenceEnglish: fav.sentenceEnglish,
      sentenceVietnamese: fav.sentenceVietnamese || fav.sentenceEnglish,
    })),
    [favorites],
  );

  function toggleFavorite(item, bookId, bookLabel, sectionId, sectionLabel) {
    if (!item) return;
    const favoriteKey = `${bookId}__${sectionId}__${item.chinese}__${item.pinyin}`;
    setFavorites((prev) => {
      if (prev.some((f) => f.favoriteKey === favoriteKey)) {
        return prev.filter((f) => f.favoriteKey !== favoriteKey);
      }
      return [{
        favoriteKey, bookId, bookLabel, section: sectionId,
        sectionLabel: `${bookLabel} · ${sectionLabel}`,
        chinese: item.chinese, pinyin: item.pinyin,
        english: item.english, vietnamese: item.vietnamese || item.english,
        sentenceChinese: item.sentenceChinese, sentencePinyin: item.sentencePinyin,
        sentenceEnglish: item.sentenceEnglish, sentenceVietnamese: item.sentenceVietnamese || item.sentenceEnglish,
      }, ...prev];
    });
  }

  function removeFavorite(favoriteKey) {
    setFavorites((prev) => prev.filter((f) => f.favoriteKey !== favoriteKey));
  }

  function isFavorite(item, bookId, sectionId) {
    if (!item) return false;
    return favoriteKeySet.has(`${bookId}__${sectionId}__${item.chinese}__${item.pinyin}`);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  function startQuizFavorites() {
    if (favorites.length === 0) return;
    setIsFavoritesOpen(false);
    navigate('/', { state: { quizFavorites: true }, replace: true });
  }

  // ── outlet context (everything child pages might need) ──
  const ctx = {
    t, selectedLanguage,
    books, booksLoading,
    favorites, favoriteVocabulary, favoriteKeySet,
    toggleFavorite, removeFavorite, isFavorite,
    isFavoritesOpen, setIsFavoritesOpen,
    uploadedLessons, setUploadedLessons,
    supabaseSets,
    role, user,
  };

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <div className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-6">

          <Navbar
            t={t}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            languageOptions={languageOptions}
            selectedFlag={selectedFlag}
            isDarkMode={isDarkMode}
            onDarkModeToggle={() => setIsDarkMode((p) => !p)}
            theme={theme}
            onThemeChange={setTheme}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            onSignOut={handleSignOut}
          />

          <Outlet context={ctx} />

          <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Heart className="h-4 w-4 fill-primary text-primary" />
              <span className="font-medium">{t.madeBy}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
              <span>{t.contentCompiler.split(':')[0]}:</span>
              <span className="font-medium text-foreground/70">{t.contentCompiler.split(':')[1]}</span>
              <span>·</span>
              <span>{t.contributor.split(':')[0]}:</span>
              <span className="font-medium text-foreground/70">{t.contributor.split(':')[1]}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{t.supportedBy}:</span>
              <a href="https://barkingbears.com/" target="_blank" rel="noopener noreferrer">
                <img src="/sponser.png" alt="Sponsor" className="h-14 w-14 rounded-full object-cover" loading="lazy" />
              </a>
            </div>
          </footer>
        </div>
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
    </>
  );
}
