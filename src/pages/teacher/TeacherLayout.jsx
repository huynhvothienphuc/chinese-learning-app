import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, BookOpen, House } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function TeacherLayout({ children, crumbs = [] }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/staff-login');
  }

  // crumbs: [{ label, path }]
  const allCrumbs = [{ label: 'Teacher Dashboard', path: '/teacher' }, ...crumbs];

  return (
    <div className="min-h-screen bg-white px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between rounded-3xl border border-theme-border bg-theme-surface px-5 py-4 shadow-soft">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2">
              <img src="/logo.svg" alt="Logo" className="h-9 w-9 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm">
              <BookOpen className="h-4 w-4 text-green-600" />
              {allCrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                  {i < allCrumbs.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => navigate(crumb.path)}
                      className="font-medium text-green-700 hover:underline dark:text-green-400"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/')}>
              <House className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
