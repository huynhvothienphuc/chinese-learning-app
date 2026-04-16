import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function StaffLoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!email || !password) return;

    setLoading(true);
    try {
      const role = await signIn(email, password);
      if (role === 'admin' || role === 'superadmin') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else navigate('/');
    } catch (err) {
      setServerError(err.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm border-theme-border bg-theme-surface shadow-soft">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-14 w-14 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Staff Login</h1>
            <p className="text-sm text-slate-500">For teachers and administrators only</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-green-500"
                placeholder="teacher@email.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-green-500"
                placeholder="••••••••"
              />
            </div>

            {serverError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ← Back to learning
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
