import { useState } from 'react';
import { Link, Copy, Lock, Globe, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ShareControls({ book, onBookChange }) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const shareUrl = `${window.location.origin}/shared/${book.share_token}`;
  const isEnabled = book.share_enabled;
  const isPrivate = book.share_type === 'private';

  async function toggleShare() {
    setSaving(true);
    const next = !isEnabled;
    const { error } = await supabase
      .from('user_books')
      .update({ share_enabled: next })
      .eq('id', book.id);
    if (!error) onBookChange({ ...book, share_enabled: next });
    setSaving(false);
  }

  async function setShareType(type) {
    setSaving(true);
    const { error } = await supabase
      .from('user_books')
      .update({ share_type: type })
      .eq('id', book.id);
    if (!error) onBookChange({ ...book, share_type: type });
    setSaving(false);
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!password.trim()) return;
    setSavingPassword(true);
    await supabase.rpc('set_share_password', { p_book_id: book.id, p_password: password });
    setPassword('');
    setPasswordSaved(true);
    setSavingPassword(false);
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className={isEnabled
      ? 'border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10'
      : 'border-slate-200 dark:border-slate-700'
    }>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">

          {/* Header + toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-slate-800 dark:text-white">Share this book</span>
              {isEnabled && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  Active
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant={isEnabled ? 'default' : 'outline'}
              disabled={saving}
              onClick={toggleShare}
              className="min-w-[80px] gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {isEnabled && (
            <>
              {/* Public / Private toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShareType('public')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition-all ${
                    !isPrivate
                      ? 'border-green-400 bg-green-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('private')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition-all ${
                    isPrivate
                      ? 'border-green-400 bg-green-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" /> Private
                </button>
              </div>

              {/* Password form (private only) */}
              {isPrivate && (
                <form onSubmit={savePassword} className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500">Set a password — guests must enter it to access.</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <Button type="submit" size="sm" disabled={savingPassword || !password.trim()} className="gap-1.5 min-w-[90px]">
                      {savingPassword
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : passwordSaved
                          ? <Check className="h-3.5 w-3.5" />
                          : null}
                      {passwordSaved ? 'Saved!' : 'Set password'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Share link */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
                <span className="flex-1 truncate text-xs text-slate-500">{shareUrl}</span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 text-slate-400 transition-colors hover:text-green-600"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
