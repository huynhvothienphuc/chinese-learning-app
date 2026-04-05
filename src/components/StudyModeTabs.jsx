import { BookOpenText, NotebookTabs, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'flashcard', icon: BookOpenText },
  { id: 'quiz',      icon: ScrollText },
  { id: 'review',    icon: NotebookTabs },
];

export default function StudyModeTabs({ t, activeTab, onChange, embedded = false }) {
  const labels = {
    flashcard: t.flashCardTab,
    quiz:      t.quizTab,
    review:    t.reviewTab,
  };

  return (
    <div className={cn(
      'rounded-3xl border border-[#CAE8BD] bg-[#ECFAE5] p-2 dark:border-slate-700/60 dark:bg-slate-800/90',
      embedded ? 'shadow-none animate-none' : 'shadow-soft animate-float-in',
    )}>
      <div className="grid grid-cols-3 gap-2">
        {tabs.map(({ id, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-green-50/70 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {labels[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
