import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Heart, X } from 'lucide-react';

const BANNER_DISMISSED_KEY = 'banner-dismissed-date';
const ANNOUNCEMENTS = [
  {
    guestOnly: true,
    vi: '🔥 Đăng nhập để giữ streak! Làm quiz hoặc học và xem 10 thẻ mỗi ngày là đủ rồi 💪',
    en: '🔥 Log in to keep your streak! Complete a Quiz or study and view 10 flashcards each day and you\'re good 💪',
  },
];
import { useAuthStore } from '@/store/authStore';
import { useBooks } from '@/hooks/useVocabData';
import { useStudentSets } from '@/hooks/useStudentData';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { localeMap } from '@/locales';
import {
  USER_UPLOAD_BOOK_ID,
  FAVORITES_KEY,
  LANGUAGE_KEY,
} from '@/lib/constants';
import Navbar from '@/components/layout/Navbar';
import { syncUserCountry } from '@/lib/supabase';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const FavoritesPanel = lazy(() => import('@/components/FavoritesPanel'));
const GlobalSearchModal = lazy(() => import('@/components/GlobalSearchModal'));

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [bannerOpen, setBannerOpen] = useState(() => {
    return localStorage.getItem(BANNER_DISMISSED_KEY) !== today;
  });

  function dismissBanner() {
    localStorage.setItem(BANNER_DISMISSED_KEY, today);
    setBannerOpen(false);
  }

  const visibleAnnouncements = ANNOUNCEMENTS.filter(a => !a.guestOnly || !user);
  const activeBanner = bannerOpen && visibleAnnouncements.length > 0
    ? visibleAnnouncements[new Date().getDate() % visibleAnnouncements.length]
    : null;

  // ── server state ──
  const booksQuery = useBooks(user?.id, authReady);
  const booksData = booksQuery.data ?? [];
  const booksLoading = !authReady || booksQuery.isLoading;
  const { data: supabaseSets = [] } = useStudentSets(user?.id);

  // ── CSS side-effects ──
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => {
    const sizeMap = { sm: '16px', md: '18px', lg: '20px', xl: '22px', xll: '24px', xxl: '26px' };
    document.documentElement.style.setProperty('--app-font-size', sizeMap[fontSize] ?? '16px');
  }, [fontSize]);

  // ── Country sync (once per user, only if not yet set) ──
  useEffect(() => {
    if (authReady && user?.id) syncUserCountry(user.id);
  }, [authReady, user?.id]);

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
    if (supabaseSets.length > 0) {
      base.push({ id: USER_UPLOAD_BOOK_ID, title: t.userUploadBook, description: 'Saved uploads' });
    }
    return base;
  }, [booksData, supabaseSets, t.userUploadBook]);

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
            onSearchOpen={() => setIsSearchOpen(true)}
            theme={theme}
            onThemeChange={setTheme}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            onSignOut={handleSignOut}
          />

          {activeBanner && (
            <div className="animate-gradient-border hidden sm:block rounded-2xl p-[3px]">
              <div className="flex items-center gap-3 rounded-[14px] bg-amber-50 px-4 py-2.5 dark:bg-slate-900">
                <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                  {selectedLanguage === 'vi' ? activeBanner.vi : activeBanner.en}
                </p>
                <button type="button" onClick={dismissBanner} className="shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

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
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={(bookId, lessonTitle) => navigate('/', { state: { selectBook: bookId, selectSectionTitle: lessonTitle } })}
          language={selectedLanguage}
          t={t}
        />
      </Suspense>

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
