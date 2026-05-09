import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/useLocale';

export default function LoginPrompt({ icon: Icon = BookOpen }) {
  const navigate = useNavigate();
  const t = useLocale();

  return (
    <Card className="shadow-soft">
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <Icon className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t.loginToLearnBody}</p>
        <Button onClick={() => navigate('/login')}>{t.signIn ?? 'Sign In'}</Button>
      </CardContent>
    </Card>
  );
}
