import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
    </div>
  );
}

/** Requires any authenticated user. Redirects to /login if not signed in. */
export default function ProtectedRoute() {
  const { user, authReady } = useAuthStore();
  if (!authReady) return <Spinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
