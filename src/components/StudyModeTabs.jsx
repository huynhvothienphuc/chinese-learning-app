import { BookOpenText, NotebookTabs, PencilLine, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'review',    icon: NotebookTabs },
  { id: 'flashcard', icon: BookOpenText },
  { id: 'quiz',      icon: ScrollText },
  { id: 'write',     icon: PencilLine },
];

export default function StudyModeTabs({ t, activeTab, onChange, embedded = false, disabledTabs = [] }) {
  const labels = {
    flashcard: t.flashCardTab,
    quiz:      t.quizTab,
    review:    t.reviewTab,
    write:     t.writeTab,
  };

  return (
    <div className={cn(
      'rounded-3xl border border-theme-border bg-theme-surface p-2',
      embedded ? 'shadow-none animate-none' : 'shadow-soft animate-float-in',
    )}>
      <div className="grid grid-cols-4 gap-2">
        {tabs.map(({ id, icon: Icon }) => {
          const active = activeTab === id;
          const disabled = disabledTabs.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(id)}
              title={disabled ? t.needMoreWords ?? 'Need at least 4 words' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-sm font-semibold transition-all duration-200 sm:flex-row sm:gap-2 sm:px-4 sm:py-3',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">{labels[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
