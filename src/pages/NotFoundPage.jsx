import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <img src="/logo.png" alt="Logo" className="mb-8 h-28 w-28 rounded-3xl shadow-lg" />

      <p className="text-9xl font-black tracking-tight text-[#CAE8BD] dark:text-foreground">404</p>

      <h1 className="mt-3 text-2xl font-bold text-foreground">
        Oops! This page got lost in translation 😅
      </h1>
      <p className="mt-3 max-w-sm text-base text-muted-foreground">
        Looks like this page took a wrong turn somewhere. Don't worry — your flashcards are safe!
      </p>

      <Button className="mt-8 px-6 py-2 text-base" onClick={() => navigate('/')}>
        Take me home 🏠
      </Button>
    </div>
  );
}
