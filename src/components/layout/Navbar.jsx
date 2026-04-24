import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, MessageSquare, Moon, Search, Settings, Sun, Wand2 } from 'lucide-react';
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
  languageOptions,
  selectedFlag,
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
  const isMember = role === 'member' || user?.app_metadata?.provider === 'google';
  const { streak } = useStreak({ userId: user?.id, isMember });
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    function handler(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  return (
    <div className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-4 animate-float-in sm:px-6">
      <div className="flex flex-col gap-4">

        {/* ── Row 1: logo + controls ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-4 text-left">
            <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-3xl p-1.5" />
            <div>
              <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                {t.appTitle}
                <span className="inline-flex items-center rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-sm sm:hidden">
                  {selectedLanguage === 'vi' ? 'Phồn thể' : 'Traditional'}
                </span>
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm leading-6 text-muted-foreground">
                {t.appSubtitle.replace('Traditional', '').replace('Phồn thể', '').trim().replace(/\(\)/, '').trim()}
                <span className="hidden items-center rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-sm sm:inline-flex">
                  {selectedLanguage === 'vi' ? 'Phồn thể' : 'Traditional'}
                </span>
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Create Quiz */}
            <Button type="button" variant={pathname === '/quiz' ? 'default' : 'outline'} className="gap-2" onClick={() => navigate('/quiz')}>
              <Wand2 className="h-4 w-4" />
              <span className="text-xs font-medium sm:text-sm">{t.myQuizTitle}</span>
            </Button>

            {/* Search */}
            <Tooltip text="Search all lessons">
              <Button type="button" variant="outline" size="icon" onClick={onSearchOpen} aria-label="Search all lessons">
                <Search className="h-4 w-4" />
              </Button>
            </Tooltip>

            {/* Language */}
            <Tooltip text="Language">
              <div className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                <span className="pointer-events-none text-lg">{selectedFlag}</span>
                <select value={selectedLanguage} onChange={(e) => onLanguageChange(e.target.value)} aria-label="Language" className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                  {languageOptions.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </Tooltip>

            {/* Feedback */}
            <Tooltip text={t.feedbackNav}>
              <Button type="button" variant={pathname === '/feedback' ? 'default' : 'outline'} size="icon" className="gap-1.5 px-3 w-auto" onClick={() => navigate('/feedback')}>
                <MessageSquare className="h-4 w-4" />
                <span className="hidden text-xs sm:inline">{t.feedbackNav}</span>
              </Button>
            </Tooltip>

            {/* Settings */}
            <div className="relative" ref={settingsRef}>
              <Tooltip text="Settings">
                <Button type="button" variant={settingsOpen ? 'default' : 'outline'} size="icon" onClick={() => setSettingsOpen((o) => !o)} aria-label="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </Tooltip>
              {settingsOpen && (
                <>
                  {/* Backdrop — mobile only */}
                  <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" onClick={() => setSettingsOpen(false)} />

                  <div className={cn(
                    'z-50 overflow-hidden border border-border bg-background shadow-xl',
                    'fixed bottom-0 left-0 right-0 rounded-t-3xl',
                    'sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-11 sm:w-72 sm:rounded-2xl',
                  )}>
                    {/* Drag handle — mobile only */}
                    <div className="flex justify-center pb-1 pt-3 sm:hidden">
                      <div className="h-1 w-10 rounded-full bg-border" />
                    </div>

                    {/* Font size */}
                    <div className="border-b border-border px-4 py-3">
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Font size</p>
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
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme</p>
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
          </div>
        </div>

        {/* ── Row 2: auth strip (signed-in users only) ── */}
        {user && (
          <div className="-mx-4 -mb-4 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-theme-border bg-theme-surface-secondary px-4 pb-3 pt-3 dark:bg-slate-900/40 sm:-mx-6 sm:-mb-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full" />
              )}
              <span className="truncate text-xs font-medium text-muted-foreground">
                {isMember
                  ? (user.user_metadata?.full_name ?? user.email?.split('@')[0])
                  : user.email?.replace(/(.{2}).+(@.+)/, '$1***$2')}
              </span>
              {isMember && streak > 0 && (
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-sm font-bold text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">🔥 {streak}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {role === 'superadmin' && (
                <Button type="button" size="sm" variant={pathname === '/feedback-review' ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/feedback-review')}>
                  <MessageSquare className="h-3.5 w-3.5" /><span className="text-xs">Feedback Review</span>
                </Button>
              )}
              {(role === 'member' || user.app_metadata?.provider === 'google') && (
                <Button type="button" size="sm" variant={pathname === '/dashboard' ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/dashboard')}>
                  <span className="text-xs">📊 My Dashboard</span>
                </Button>
              )}
              {role === 'teacher' && (
                <Button type="button" size="sm" variant={pathname.startsWith('/teacher') ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/teacher')}>
                  <span className="text-xs">Teacher Dashboard</span>
                </Button>
              )}
              {role === 'admin' && (
                <Button type="button" size="sm" variant={pathname === '/admin' ? 'default' : 'outline'} className="gap-1.5" onClick={() => navigate('/admin')}>
                  <span className="text-xs">Admin Dashboard</span>
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onSignOut}>
                <LogOut className="h-3.5 w-3.5" /><span className="text-xs">Sign out</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
