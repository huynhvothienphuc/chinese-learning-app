import { BookOpenText, Heart, NotebookTabs, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'flashcard', icon: BookOpenText },
  { id: 'quiz', icon: ScrollText },
  { id: 'review', icon: NotebookTabs },
  { id: 'favorites', icon: Heart },
];

export default function StudyModeTabs({ t, activeTab, onChange }) {
  const labels = {
    flashcard: t.flashCardTab,
    quiz: t.quizTab,
    review: t.reviewTab,
    favorites: t.favoritesTab,
  };

  return (
    <div className="rounded-3xl border border-white/60 bg-white/90 p-2 shadow-soft animate-float-in dark:border-slate-700/60 dark:bg-slate-800/90">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
                  : 'bg-violet-50/70 text-violet-600 hover:bg-violet-100 hover:text-violet-800 dark:bg-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white',
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
