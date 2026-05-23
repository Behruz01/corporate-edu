import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RoleGate } from '@/features/auth/RoleGate';
import { EmployeeShell } from '@/components/shell/EmployeeShell';
import { ManagerShell } from '@/components/shell/ManagerShell';
import { AdminShell } from '@/components/shell/AdminShell';
import { HomePage } from '@/pages/HomePage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { useAuthStore } from '@/lib/stores/auth-store';

function RootRedirect(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'PLATFORM_ADMIN' || user.role === 'HR_ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/team" replace />;
  return <Navigate to="/home" replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <RootRedirect /> },

      {
        element: <EmployeeShell />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/onboarding', element: <PlaceholderPage title="Onboarding" /> },
          { path: '/kb', element: <PlaceholderPage title="Knowledge Base" /> },
          { path: '/simulator', element: <PlaceholderPage title="Simulator" /> },
          { path: '/memory', element: <PlaceholderPage title="Memory" /> },
        ],
      },

      {
        element: <RoleGate allow={['MANAGER', 'PLATFORM_ADMIN', 'HR_ADMIN']} />,
        children: [
          {
            element: <ManagerShell />,
            children: [{ path: '/team', element: <PlaceholderPage title="Team" /> }],
          },
        ],
      },

      {
        element: <RoleGate allow={['PLATFORM_ADMIN', 'HR_ADMIN']} />,
        children: [
          {
            element: <AdminShell />,
            children: [
              { path: '/admin', element: <PlaceholderPage title="Admin dashboard" /> },
              { path: '/admin/users', element: <PlaceholderPage title="Users" /> },
              { path: '/admin/documents', element: <PlaceholderPage title="Documents" /> },
              { path: '/admin/scenarios', element: <PlaceholderPage title="Scenarios" /> },
              { path: '/admin/onboarding', element: <PlaceholderPage title="Onboarding templates" /> },
              { path: '/admin/projects', element: <PlaceholderPage title="Projects" /> },
              { path: '/admin/settings', element: <PlaceholderPage title="Settings" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
