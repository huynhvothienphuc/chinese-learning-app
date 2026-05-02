import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, MessageSquare, Moon, Search, Settings, Sun, Trophy, Wand2, BarChart2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useStreak } from '@/hooks/useStreak';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import ToggleSwitch from '@/components/ToggleSwitch';
import { cn } from '@/lib/utils';

const THEMES = [
  { key: 'green',  label: 'Green',  color: '#ECFAE5', border: '#CAE8BD', accent: '#a8d5a2' },
  { key: 'orange', label: 'Orange', color: '#FFF5E4', border: '#FF9494', accent: '#ffb6b6' },
  { key: 'teal',   label: 'Teal',   color: '#E4F9F5', border: '#11999E', accent: '#30E3CA' },
];

export default function Navbar({
  t,
  selectedLanguage,
  onLanguageChange,
  isDarkMode,
  onDarkModeToggle,
  onSearchOpen,
  theme,
  onThemeChange,
  fontSize,
  onFontSizeChange,
  onSignOut,
}) {
  const { user, role } = useAuthStore();
  const isMember = ['member', 'teacher', 'admin', 'superadmin'].includes(role);
  const { streak } = useStreak({ userId: user?.id, isMember });
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [showSignIn] = useState(true);
  const [showLeaderboard] = useState(false);
  const showFeedback = true;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);
  const avatarTimeout = useRef(null);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    function handler(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  useEffect(() => {
    if (!avatarOpen) return undefined;
    function handler(e) {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarOpen]);

  function onAvatarEnter() {
    clearTimeout(avatarTimeout.current);
    setAvatarOpen(true);
  }
  function onAvatarLeave() {
    avatarTimeout.current = setTimeout(() => setAvatarOpen(false), 150);
  }

  return (
    <div className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 sm:px-6 sm:py-4">
      <div>

        {/* ── Single row: logo | search | buttons ── */}
        <div className="flex items-center justify-between gap-3">

          {/* Logo */}
          <button type="button" onClick={() => navigate('/')} className="flex shrink-0 items-center gap-3 text-left">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-2xl p-1" />
            <div className="hidden sm:block">
              <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
                {t.appTitle}
                <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {selectedLanguage === 'vi' ? 'Phồn thể' : 'Traditional'}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.appSubtitle.replace('Traditional', '').replace('Phồn thể', '').trim().replace(/\(\)/, '').trim()}
              </p>
            </div>
          </button>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">

            <button
              type="button"
              onClick={onSearchOpen}
              aria-label="Search all lessons"
              className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-muted min-w-[200px]"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span>{t.globalSearchPlaceholder}</span>
            </button>
            <Button type="button" variant="outline" size="icon" onClick={onSearchOpen} aria-label="Search" className="sm:hidden">
              <Search className="h-4 w-4" />
            </Button>

            {/* Create Quiz */}
            <Tooltip text={t.myQuizTitle}>
              <Button type="button" variant={pathname === '/quiz' ? 'default' : 'outline'} size="icon" className="w-auto gap-1.5 px-3" onClick={() => navigate('/quiz')}>
                <Wand2 className="h-4 w-4 shrink-0" />
                <span className="hidden text-xs sm:inline">{t.myQuizTitle}</span>
              </Button>
            </Tooltip>

            {/* Leaderboard */}
            {showLeaderboard && (
              <Tooltip text={t.labelLeaderboard}>
                <Button type="button" variant={pathname === '/leaderboard' ? 'default' : 'outline'} size="icon" className="w-auto gap-1.5 px-3" onClick={() => navigate('/leaderboard')}>
                  <Trophy className="h-4 w-4 shrink-0" />
                  <span className="hidden text-xs sm:inline">{t.labelLeaderboard}</span>
                </Button>
              </Tooltip>
            )}

            {/* Feedback */}
            {showFeedback && (
              <Tooltip text={t.feedbackNav}>
                <Button type="button" variant={pathname === '/feedback' ? 'default' : 'outline'} size="icon" className="w-auto gap-1.5 px-3" onClick={() => navigate('/feedback')}>
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="hidden text-xs sm:inline">{t.feedbackNav}</span>
                </Button>
              </Tooltip>
            )}

            {/* Settings */}
            <div className="relative" ref={settingsRef}>
              <Tooltip text={t.settingsLabel}>
                <Button type="button" variant={settingsOpen ? 'default' : 'outline'} size="icon" onClick={() => setSettingsOpen((o) => !o)} aria-label={t.settingsLabel}>
                  <Settings className="h-4 w-4" />
                </Button>
              </Tooltip>
              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setSettingsOpen(false)} />

                  <div className={cn(
                    'z-50 overflow-hidden border border-border bg-background shadow-xl',
                    'fixed bottom-0 left-0 right-0 rounded-t-3xl',
                    'sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-11 sm:w-72 sm:rounded-2xl',
                  )}>
                    <div className="flex justify-center pb-1 pt-3 sm:hidden">
                      <div className="h-1 w-10 rounded-full bg-border" />
                    </div>

                    <div className="border-b border-border px-4 py-3">
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.fontSizeLabel}</p>
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-1">
                        {[{ v: 'sm', label: '16' }, { v: 'md', label: '18' }, { v: 'lg', label: '20' }, { v: 'xl', label: '22' }, { v: 'xll', label: '24' }, { v: 'xxl', label: '26' }].map(({ v, label }) => (
                          <button key={v} type="button" onClick={() => onFontSizeChange(v)}
                            className={cn('flex items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-colors sm:py-1.5 sm:text-xs',
                              fontSize === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground')}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Theme */}
                    <div className="border-b border-border px-4 py-3">
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.themeLabel}</p>
                      <div className="flex gap-2">
                        {THEMES.map((opt) => (
                          <button key={opt.key} type="button" onClick={() => onThemeChange(opt.key)}
                            className={cn('relative flex flex-1 flex-col overflow-hidden rounded-xl border-2 transition-all',
                              theme === opt.key ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40')}>
                            <span className="block h-10 w-full sm:h-8" style={{ background: `linear-gradient(135deg, ${opt.color}, ${opt.border})` }} />
                            <span className={cn('block py-2 text-center text-xs font-semibold transition-colors sm:py-1.5',
                              theme === opt.key ? 'text-primary' : 'text-muted-foreground')}>
                              {opt.label}
                            </span>
                            {theme === opt.key && (
                              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                      <span className="text-sm font-medium text-foreground">{t.languageLabel}</span>
                      <div className="flex items-center rounded-full bg-muted p-0.5">
                        {[{ id: 'vi', label: 'VI' }, { id: 'en', label: 'EN' }].map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onLanguageChange(id)}
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-bold transition-colors',
                              selectedLanguage === id
                                ? 'bg-foreground text-background shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dark mode */}
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        {isDarkMode ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                        <span>Dark mode</span>
                      </div>
                      <ToggleSwitch checked={isDarkMode} onChange={onDarkModeToggle} />
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* ── Avatar / Sign In ── */}
            {user ? (
              <div
                className="relative"
                ref={avatarRef}
                onMouseEnter={onAvatarEnter}
                onMouseLeave={onAvatarLeave}
              >
                <button
                  type="button"
                  onClick={() => setAvatarOpen((o) => !o)}
                  className="relative flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-theme-border hover:ring-primary transition-all overflow-visible"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
                        {(user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  {streak > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 text-sm leading-none">🔥</span>
                  )}
                </button>

                {avatarOpen && (
                  <div
                    className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-border bg-background shadow-xl"
                    onMouseEnter={onAvatarEnter}
                    onMouseLeave={onAvatarLeave}
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {streak > 0 && (
                        <p className="mt-1.5 text-xs font-semibold text-orange-500">🔥 {t.streakLabel?.replace('{n}', streak)}</p>
                      )}
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      {isMember && (
                        <button type="button" onClick={() => { navigate('/dashboard'); setAvatarOpen(false); }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                          📊 {t.myDashboard}
                        </button>
                      )}
                      {role === 'teacher' && (
                        <button type="button" onClick={() => { navigate('/teacher'); setAvatarOpen(false); }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                          🎓 Teacher Dashboard
                        </button>
                      )}
                      {role === 'admin' && (
                        <button type="button" onClick={() => { navigate('/admin'); setAvatarOpen(false); }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                          🛠 Admin Dashboard
                        </button>
                      )}
                      {role === 'superadmin' && (
                        <>
                          <button type="button" onClick={() => { navigate('/feedback-review'); setAvatarOpen(false); }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                            <MessageSquare className="h-3.5 w-3.5" /> Feedback Review
                          </button>
                          <button type="button" onClick={() => { navigate('/superadmin'); setAvatarOpen(false); }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                            <BarChart2 className="h-3.5 w-3.5" /> Analytics Dashboard
                          </button>
                        </>
                      )}
                      <div className="my-1 border-t border-border" />
                      <button type="button" onClick={() => { onSignOut(); setAvatarOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left">
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : showSignIn ? (
              <Button type="button" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            ) : null}

          </div>
        </div>

      </div>

    </div>
  );
}
