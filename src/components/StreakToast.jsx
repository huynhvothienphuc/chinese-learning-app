import { useEffect } from 'react';

export default function StreakToast({ streak, onDismiss, t }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-float-in">
      <div className="flex items-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-background shadow-xl">
        <span className="text-lg">🔥</span>
        <span className="text-sm font-bold">{t.streakToastTitle.replace('{n}', streak)}</span>
        <span className="text-xs opacity-60">{t.streakToastHint}</span>
      </div>
    </div>
  );
}
