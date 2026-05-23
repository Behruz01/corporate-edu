import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Role } from '@/lib/api/types';

export function RoleGate({ allow }: { allow: Role[] }): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/home" replace />;
  return <Outlet />;
}
