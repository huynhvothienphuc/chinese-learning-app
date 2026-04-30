import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
    </div>
  );
}

/**
 * Requires the user's role to be in `allowed`.
 * Redirects to /login if not signed in, or to / if signed in but wrong role.
 */
export default function RoleRoute({ allowed = [] }) {
  const { user, role, roleReady } = useAuthStore();
  if (!roleReady) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
