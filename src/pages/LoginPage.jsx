import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function validateUsername(value) {
  if (!value) return 'Username is required.';
  if (value.length < 3) return 'At least 3 characters.';
  if (value.length > 20) return 'At most 20 characters.';
  if (!USERNAME_REGEX.test(value)) return 'Letters, numbers and _ only. No spaces.';
  return '';
}

function validatePassword(value, isRegister) {
  if (!value) return 'Password is required.';
  if (isRegister && value.length < 6) return 'At least 6 characters.';
  return '';
}

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function switchTab(next) {
    setTab(next);
    setUsernameError('');
    setPasswordError('');
    setServerError('');
    setSuccess('');
  }

  function handleUsernameChange(e) {
    const val = e.target.value;
    setUsername(val);
    if (usernameError) setUsernameError(validateUsername(val));
  }

  function handlePasswordChange(e) {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) setPasswordError(validatePassword(val, tab === 'register'));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setSuccess('');

    // For login tab, allow email too (teachers) — skip username validation if @ present
    const isEmailLogin = tab === 'login' && username.includes('@');
    const uErr = isEmailLogin ? '' : validateUsername(username);
    const pErr = validatePassword(password, tab === 'register');
    setUsernameError(uErr);
    setPasswordError(pErr);
    if (uErr || pErr) return;

    setLoading(true);
    try {
      if (tab === 'register') {
        await signUp(username, password);
        setSuccess('Account created! You can now sign in.');
        setPassword('');
        switchTab('login');
      } else {
        const role = await signIn(username, password);
        if (role === 'admin') navigate('/admin');
        else if (role === 'teacher') navigate('/teacher');
        else navigate('/');
      }
    } catch (err) {
      setServerError(err.message ?? (tab === 'register' ? 'Registration failed.' : 'Login failed.'));
    } finally {
      setLoading(false);
    }
  }

  const isRegister = tab === 'register';

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
      <Card className="w-full max-w-sm border-theme-border bg-theme-surface shadow-soft">
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-14 w-14 rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Chinese EZ Cards</h1>
            <p className="text-sm text-slate-500">{isRegister ? 'Create a free member account' : 'Sign in to continue'}</p>
          </div>

          {/* Tab toggle */}
          <div className="mb-5 flex rounded-xl border border-theme-border bg-white p-1 dark:border-slate-600 dark:bg-slate-700">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username field */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isRegister ? 'Username' : 'Username or email'}
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={handleUsernameChange}
                className={`rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                  usernameError
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-700'
                    : 'border-slate-200 focus:border-green-400 focus:ring-green-100 dark:border-slate-600 dark:focus:border-green-500'
                }`}
                placeholder={isRegister ? 'e.g. hoa_nguyen' : 'username or teacher@email.com'}
              />
              {usernameError && <p className="text-xs text-rose-500">{usernameError}</p>}
              {isRegister && !usernameError && (
                <p className="text-xs text-slate-400">3–20 characters · letters, numbers, _ only</p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={handlePasswordChange}
                className={`rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-slate-700 dark:text-white ${
                  passwordError
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-700'
                    : 'border-slate-200 focus:border-green-400 focus:ring-green-100 dark:border-slate-600 dark:focus:border-green-500'
                }`}
                placeholder="••••••••"
              />
              {passwordError && <p className="text-xs text-rose-500">{passwordError}</p>}
              {isRegister && !passwordError && (
                <p className="text-xs text-slate-400">Minimum 6 characters</p>
              )}
            </div>

            {serverError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                {serverError}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {success}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? (isRegister ? 'Creating account…' : 'Signing in…')
                : (isRegister ? 'Create account' : 'Sign in')}
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
