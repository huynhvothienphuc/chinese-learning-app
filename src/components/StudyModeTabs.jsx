import { BookOpenText, NotebookTabs, PencilLine, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'review',    icon: NotebookTabs },
  { id: 'flashcard', icon: BookOpenText },
  { id: 'quiz',      icon: ScrollText },
  { id: 'write',     icon: PencilLine },
];

export default function StudyModeTabs({ t, activeTab, onChange, embedded = false }) {
  const labels = {
    flashcard: t.flashCardTab,
    quiz:      t.quizTab,
    review:    t.reviewTab,
    write:     t.writeTab,
  };

  return (
    <div className={cn(
      'rounded-3xl border border-[#CAE8BD] bg-[#ECFAE5] p-2 dark:border-slate-700/60 dark:bg-slate-800/90',
      embedded ? 'shadow-none animate-none' : 'shadow-soft animate-float-in',
    )}>
      <div className="grid grid-cols-4 gap-2">
        {tabs.map(({ id, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-sm font-semibold transition-all duration-200 sm:flex-row sm:gap-2 sm:px-4 sm:py-3',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-green-50/70 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white',
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
