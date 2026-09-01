import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronRight, Link2, Shuffle, TextCursorInput } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function ExerciseHubPage() {
  const { t } = useOutletContext();
  const navigate = useNavigate();

  const modes = [
    { key: 'sentence-order', icon: Shuffle, title: t.exercisesSentenceOrderTitle, desc: t.exercisesSentenceOrderDesc },
    { key: 'fill-blank', icon: TextCursorInput, title: t.exercisesFillBlankTitle, desc: t.exercisesFillBlankDesc },
    { key: 'matching', icon: Link2, title: t.exercisesMatchingTitle, desc: t.exercisesMatchingDesc },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <Badge variant="badge-01">{t.exercisesTitle}</Badge>

      {modes.map(({ key, icon: Icon, title, desc }) => (
        <button
          key={key}
          type="button"
          onClick={() => navigate(`/exercise/${key}`)}
          className="block w-full text-left"
        >
          <Card className="border-theme-border bg-theme-surface shadow-soft transition-transform active:scale-[0.98]">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-foreground">{title}</p>
                <p className="truncate text-sm text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
