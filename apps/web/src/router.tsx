import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RoleGate } from '@/features/auth/RoleGate';
import { EmployeeShell } from '@/components/shell/EmployeeShell';
import { ManagerShell } from '@/components/shell/ManagerShell';
import { AdminShell } from '@/components/shell/AdminShell';
import { KbChatPage } from '@/features/kb/KbChatPage';
import { ScenarioBriefPage } from '@/features/simulator/ScenarioBriefPage';
import { ScenarioLibraryPage } from '@/features/simulator/ScenarioLibraryPage';
import { ScorePage } from '@/features/simulator/ScorePage';
import { SessionPage } from '@/features/simulator/SessionPage';
import { MemoryHubPage } from '@/features/memory/MemoryHubPage';
import { ProjectsPage } from '@/features/memory/ProjectsPage';
import { ProjectDetailPage } from '@/features/memory/ProjectDetailPage';
import { PersonaAskPage } from '@/features/memory/PersonaAskPage';
import { WhoKnowsPage } from '@/features/memory/WhoKnowsPage';
import { OffboardingPage } from '@/features/memory/OffboardingPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { OnboardingHistoryPage } from '@/features/onboarding/OnboardingHistoryPage';
import { TeamOverviewPage } from '@/features/dashboard/TeamOverviewPage';
import { EmployeeDetailPage } from '@/features/dashboard/EmployeeDetailPage';
import { ReportsPage } from '@/features/dashboard/ReportsPage';
import { AdminDashboardPage } from '@/features/dashboard/AdminDashboardPage';
import { AdminAnalyticsPage } from '@/features/dashboard/AdminAnalyticsPage';
import { LeaderboardPage } from '@/features/gamification/LeaderboardPage';
import { UsersPage as AdminUsersPage } from '@/features/admin/UsersPage';
import { DocumentsPage as AdminDocumentsPage } from '@/features/admin/DocumentsPage';
import { ScenariosPage as AdminScenariosPage } from '@/features/admin/ScenariosPage';
import { OnboardingTemplatesPage as AdminOnboardingTemplatesPage } from '@/features/admin/OnboardingTemplatesPage';
import { ProjectsPage as AdminProjectsPage } from '@/features/admin/ProjectsPage';
import { SettingsPage as AdminSettingsPage } from '@/features/admin/SettingsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { HomePage } from '@/pages/HomePage';
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
          { path: '/onboarding', element: <OnboardingPage /> },
          { path: '/onboarding/history', element: <OnboardingHistoryPage /> },
          { path: '/kb', element: <KbChatPage /> },
          { path: '/kb/c/:id', element: <KbChatPage /> },
          { path: '/simulator', element: <ScenarioLibraryPage /> },
          { path: '/simulator/:scenarioId', element: <ScenarioBriefPage /> },
          { path: '/simulator/session/:id', element: <SessionPage /> },
          { path: '/simulator/session/:id/score', element: <ScorePage /> },
          { path: '/memory', element: <MemoryHubPage /> },
          { path: '/memory/projects', element: <ProjectsPage /> },
          { path: '/memory/projects/:id', element: <ProjectDetailPage /> },
          { path: '/memory/personas/:id', element: <PersonaAskPage /> },
          { path: '/memory/who-knows', element: <WhoKnowsPage /> },
          { path: '/memory/offboarding', element: <OffboardingPage /> },
          { path: '/leaderboard', element: <LeaderboardPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },

      {
        element: <RoleGate allow={['MANAGER', 'PLATFORM_ADMIN', 'HR_ADMIN']} />,
        children: [
          {
            element: <ManagerShell />,
            children: [
              { path: '/team', element: <TeamOverviewPage /> },
              { path: '/team/reports', element: <ReportsPage /> },
              { path: '/team/employee/:id', element: <EmployeeDetailPage /> },
            ],
          },
        ],
      },

      {
        element: <RoleGate allow={['PLATFORM_ADMIN', 'HR_ADMIN']} />,
        children: [
          {
            element: <AdminShell />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/analytics', element: <AdminAnalyticsPage /> },
              { path: '/admin/users', element: <AdminUsersPage /> },
              { path: '/admin/documents', element: <AdminDocumentsPage /> },
              { path: '/admin/scenarios', element: <AdminScenariosPage /> },
              { path: '/admin/onboarding', element: <AdminOnboardingTemplatesPage /> },
              { path: '/admin/projects', element: <AdminProjectsPage /> },
              { path: '/admin/settings', element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
