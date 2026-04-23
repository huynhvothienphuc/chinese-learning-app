import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Info, LogOut, MessageSquare, Moon, Search, Settings, Sun, Wand2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
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
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const themeRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!themeDropdownOpen) return undefined;
    function handler(e) {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [themeDropdownOpen]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    function handler(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  const curTheme = THEMES.find((th) => th.key === theme) ?? THEMES[0];

  return (
    <div className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-4 animate-float-in sm:px-6">
      <div className="flex flex-col gap-4">

        {/* ── Row 1: logo + controls ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-4 text-left">
            <img src="/logo.png" alt="Logo" className="h-12 w-12 rounded-3xl p-1.5" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{t.appTitle}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm leading-6 text-slate-500">
                {t.appSubtitle.replace('Traditional', '').replace('Phồn thể', '').trim().replace(/\(\)/, '').trim()}
                <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {selectedLanguage === 'vi' ? 'Phồn thể' : 'Traditional'}
                </span>
              </p>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* Create Quiz */}
            <Button type="button" variant={pathname === '/quiz' ? 'default' : 'outline'} className="gap-2" onClick={() => navigate('/quiz')}>
              <Wand2 className="h-4 w-4" />
              <span className="text-xs font-medium sm:text-sm">{t.myQuizTitle}</span>
            </Button>

            {/* Language picker */}
            <Tooltip text="Language">
              <div className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-sm">
                <span className="pointer-events-none text-lg">{selectedFlag}</span>
                <select value={selectedLanguage} onChange={(e) => onLanguageChange(e.target.value)} aria-label="Language" className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                  {languageOptions.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
            </Tooltip>

            {/* Font size — desktop only */}
            <Tooltip text="Font size">
              <div className="relative hidden h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-sm lg:flex">
                <span className="pointer-events-none text-sm font-bold leading-none">Aa</span>
                <select value={fontSize} onChange={(e) => onFontSizeChange(e.target.value)} aria-label={t.fontSizeLabel} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                  <option value="sm">16</option><option value="md">18</option><option value="lg">20</option>
                  <option value="xl">22</option><option value="xll">24</option><option value="xxl">26</option>
                </select>
              </div>
            </Tooltip>

            {/* Theme — desktop only */}
            <div className="relative hidden lg:block" ref={themeRef}>
              <Tooltip text="Theme">
                <button type="button" onClick={() => setThemeDropdownOpen((o) => !o)} aria-label="Change theme" className="flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-2.5 transition-colors hover:bg-accent">
                  <span className="h-4 w-4 rounded-full border-2" style={{ background: curTheme.color, borderColor: curTheme.border }} />
                  <span className="hidden text-xs font-medium capitalize text-slate-600 dark:text-slate-300 sm:inline">{theme}</span>
                  <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </Tooltip>
              {themeDropdownOpen && (
                <div className="absolute right-0 top-11 z-50 min-w-[140px] overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
                  {THEMES.map((opt) => (
                    <button key={opt.key} type="button" onClick={() => { onThemeChange(opt.key); setThemeDropdownOpen(false); }}
                      className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors', theme === opt.key ? 'bg-accent text-foreground' : 'text-slate-600 hover:bg-accent dark:text-slate-300')}>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" style={{ background: opt.color, borderColor: opt.border }}>
                        {theme === opt.key && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      {opt.label}
                      <span className="ml-auto h-2 w-2 rounded-full" style={{ background: opt.accent }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Global search */}
            <Tooltip text="Search all lessons">
              <Button type="button" variant="outline" size="icon" onClick={onSearchOpen} aria-label="Search all lessons">
                <Search className="h-4 w-4" />
              </Button>
            </Tooltip>

            {/* Dark mode */}
            <Tooltip text={isDarkMode ? 'Light mode' : 'Dark mode'}>
              <Button type="button" variant="outline" size="icon" onClick={onDarkModeToggle} aria-label="Toggle dark mode">
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </Tooltip>

            {/* Feedback — desktop */}
            <Tooltip text={t.feedbackNav}>
              <Button type="button" variant={pathname === '/feedback' ? 'default' : 'outline'} size="icon" className="hidden w-auto gap-1.5 px-3 lg:flex" onClick={() => navigate('/feedback')}>
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">{t.feedbackNav}</span>
              </Button>
            </Tooltip>

            {/* About — desktop, guest only */}
            {!user && (
              <Tooltip text="About">
                <Button type="button" variant={pathname === '/info' ? 'default' : 'outline'} size="icon" className="hidden lg:flex" onClick={() => navigate('/info')} aria-label="About">
                  <Info className="h-4 w-4" />
                </Button>
              </Tooltip>
            )}

            {/* Settings popover — mobile */}
            <div className="relative lg:hidden" ref={settingsRef}>
              <Button type="button" variant={settingsOpen ? 'default' : 'outline'} size="icon" onClick={() => setSettingsOpen((o) => !o)} aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
              {settingsOpen && (
                <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Font size</span>
                    <div className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-background">
                      <span className="pointer-events-none text-sm font-bold leading-none">Aa</span>
                      <select value={fontSize} onChange={(e) => onFontSizeChange(e.target.value)} aria-label={t.fontSizeLabel} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                        <option value="sm">16</option><option value="md">18</option><option value="lg">20</option>
                        <option value="xl">22</option><option value="xll">24</option><option value="xxl">26</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-b border-border px-4 py-3">
                    <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">Theme</p>
                    <div className="flex gap-2">
                      {THEMES.map((opt) => (
                        <button key={opt.key} type="button" onClick={() => onThemeChange(opt.key)}
                          className={cn('flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 py-2 text-xs font-medium transition-colors', theme === opt.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-slate-500 hover:border-primary/40')}>
                          <span className="h-5 w-5 rounded-full border-2" style={{ background: opt.color, borderColor: opt.border }} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={() => { navigate('/feedback'); setSettingsOpen(false); }}
                    className={cn('flex w-full items-center gap-3 border-b border-border px-4 py-3 text-sm font-medium transition-colors', pathname === '/feedback' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-accent dark:text-slate-300')}>
                    <MessageSquare className="h-4 w-4" />{t.feedbackNav}
                  </button>
                  {!user && (
                    <button type="button" onClick={() => { navigate('/info'); setSettingsOpen(false); }}
                      className={cn('flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors', pathname === '/info' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-accent dark:text-slate-300')}>
                      <Info className="h-4 w-4" />About
                    </button>
                  )}
                </div>
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
              <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                {role === 'member' || user.app_metadata?.provider === 'google'
                  ? (user.user_metadata?.full_name ?? user.email?.split('@')[0])
                  : user.email?.replace(/(.{2}).+(@.+)/, '$1***$2')}
              </span>
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
