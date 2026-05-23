import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fetchMe } from '@/lib/api/auth';

export function ProtectedRoute(): JSX.Element {
  const { user, status, setUser, setStatus } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (status === 'idle') {
      setStatus('loading');
      fetchMe()
        .then((u) => setUser(u))
        .catch(() => setUser(null));
    }
  }, [status, setStatus, setUser]);

  if (status === 'idle' || status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
