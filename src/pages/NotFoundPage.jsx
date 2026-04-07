import { Button } from '@/components/ui/button';

export default function NotFoundPage({ onGoHome }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center dark:bg-slate-950">
      <img src="/logo.png" alt="Logo" className="mb-8 h-28 w-28 rounded-3xl shadow-lg" />

      <p className="text-9xl font-black tracking-tight text-[#CAE8BD] dark:text-slate-700">404</p>

      <h1 className="mt-3 text-2xl font-bold text-slate-800 dark:text-slate-100">
        Oops! This page got lost in translation 😅
      </h1>
      <p className="mt-3 max-w-sm text-base text-slate-500 dark:text-slate-400">
        Looks like this page took a wrong turn somewhere. Don't worry — your flashcards are safe!
      </p>

      <Button className="mt-8 px-6 py-2 text-base" onClick={onGoHome}>
        Take me home 🏠
      </Button>
    </div>
  );
}
