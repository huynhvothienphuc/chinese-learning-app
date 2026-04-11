import { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { submitFeedback } from '@/lib/supabase';

const MAX_LENGTH = 1000;
const MIN_LENGTH = 5;

export default function FeedbackPage({ onBack }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const trimmed = message.trim();
  const remaining = MAX_LENGTH - message.length;
  const canSubmit = trimmed.length >= MIN_LENGTH && status !== 'loading';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      await submitFeedback(message);
      setStatus('success');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-12 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Card className="border-theme-border bg-white shadow-lg dark:bg-slate-800">
          <CardHeader className="space-y-1 border-b border-theme-border pb-4">
            <CardTitle className="text-2xl font-black text-slate-900 dark:text-white">
              Send Feedback
            </CardTitle>
            <CardDescription>
              Share a bug, suggestion, or anything on your mind. No account needed.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {status === 'success' ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                <span className="text-4xl">🎉</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Thank you!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your feedback has been received. We really appreciate it.</p>
                <Button variant="outline" className="mt-2" onClick={() => setStatus('idle')}>
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value.slice(0, MAX_LENGTH));
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder="What's on your mind? Report a bug, suggest a feature, or just say hi..."
                    rows={6}
                    maxLength={MAX_LENGTH}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100 dark:border-slate-600 dark:bg-slate-700/60 dark:text-white dark:placeholder-slate-400 dark:focus:border-green-500 dark:focus:bg-slate-700"
                  />
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-xs ${trimmed.length < MIN_LENGTH && trimmed.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {trimmed.length < MIN_LENGTH && trimmed.length > 0
                        ? `At least ${MIN_LENGTH} characters required`
                        : ' '}
                    </span>
                    <span className={`text-xs ${remaining < 100 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {remaining} / {MAX_LENGTH}
                    </span>
                  </div>
                </div>

                {status === 'error' && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
                    {errorMsg}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {status === 'loading' ? 'Submitting…' : 'Submit Feedback'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400">
          Feedback is anonymous. We do not collect any personal information.
        </p>
      </div>
    </div>
  );
}
