import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { submitFeedback } from '@/lib/supabase';

const MAX_LENGTH = 1000;
const MIN_LENGTH = 5;

export default function FeedbackPage() {
  const navigate = useNavigate();
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
    <div className="mx-auto w-full max-w-lg animate-float-in space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <Card className="border-border bg-card shadow-soft">
        <CardHeader className="space-y-1 border-b border-border pb-4">
          <CardTitle className="text-2xl font-black">
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
              <p className="text-sm text-muted-foreground">Your feedback has been received. We really appreciate it.</p>
              <Button variant="outline" className="mt-2" onClick={() => setStatus('idle')}>
                Send another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value.slice(0, MAX_LENGTH));
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="What's on your mind? Report a bug, suggest a feature, or just say hi..."
                  rows={6}
                  maxLength={MAX_LENGTH}
                  className="px-4 py-3"
                />
                <div className="flex items-center justify-between px-1">
                  <span className={`text-xs ${trimmed.length < MIN_LENGTH && trimmed.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {trimmed.length < MIN_LENGTH && trimmed.length > 0
                      ? `At least ${MIN_LENGTH} characters required`
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
                {status === 'loading' ? 'Submitting…' : 'Submit Feedback'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Feedback is anonymous. We do not collect any personal information.
      </p>
    </div>
  );
}
