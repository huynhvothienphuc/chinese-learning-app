import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { submitFeedback } from '@/lib/supabase';

const MAX_LENGTH = 1000;
const MIN_LENGTH = 5;

export default function FeedbackPage({ onBack, t }) {
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
      setErrorMsg(err.message ?? t.feedbackSubmitError);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-theme-surface to-background px-4 py-12">
      <div className="w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-muted-foreground dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </button>

        <Card className="border-theme-border bg-theme-surface shadow-lg">
          <CardHeader className="space-y-1 border-b border-theme-border pb-4">
            <CardTitle className="text-2xl font-black text-foreground">
              {t.feedbackTitle}
            </CardTitle>
            <CardDescription>
              {t.feedbackDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {status === 'success' ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
                <span className="text-4xl">🎉</span>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{t.feedbackSuccessTitle}</p>
                <p className="text-sm text-muted-foreground">{t.feedbackSuccessBody}</p>
                <Button variant="outline" className="mt-2" onClick={() => setStatus('idle')}>
                  {t.feedbackSendAnother}
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
                    placeholder={t.feedbackPlaceholder}
                    rows={6}
                    maxLength={MAX_LENGTH}
                    className="w-full resize-none rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-xs ${trimmed.length < MIN_LENGTH && trimmed.length > 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>
                      {trimmed.length < MIN_LENGTH && trimmed.length > 0
                        ? t.feedbackMinLength.replace('{count}', MIN_LENGTH)
                        : ' '}
                    </span>
                    <span className={`text-xs ${remaining < 100 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {remaining} / {MAX_LENGTH}
                    </span>
                  </div>
                </div>

              {status === 'error' && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {errorMsg}
                </p>
              )}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full gap-2"
                >
                  <Send className="h-4 w-4" />
                  {status === 'loading' ? t.feedbackSubmitting : t.feedbackSubmit}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t.feedbackAnonymous}
        </p>
      </div>
    </div>
  );
}
