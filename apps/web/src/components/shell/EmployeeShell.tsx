import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, GraduationCap, BookOpen, Drama, Brain, Trophy, LogOut } from 'lucide-react';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { Button } from '@/components/ui/button';
import { PointsPill } from '@/features/gamification/PointsPill';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logout } from '@/lib/api/auth';
import { Sidebar, SidebarNav, Topbar } from './shell-parts';

const NAV = [
  { to: '/home', key: 'home', icon: Home },
  { to: '/onboarding', key: 'onboarding', icon: GraduationCap },
  { to: '/kb', key: 'kb', icon: BookOpen },
  { to: '/simulator', key: 'simulator', icon: Drama },
  { to: '/memory', key: 'memory', icon: Brain },
  { to: '/leaderboard', key: 'leaderboard', icon: Trophy },
] as const;

export function EmployeeShell(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const nav = useNavigate();

  async function onLogout(): Promise<void> {
    await logout().catch(() => {});
    clear();
    nav('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarNav items={NAV.map((n) => ({ to: n.to, label: t(`nav.${n.key}`), icon: n.icon }))} />
      </Sidebar>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={user?.fullName ?? ''}
          right={
            <>
              <PointsPill />
              <NotificationBell />
              <LangSwitcher />
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => void onLogout()}>
                <LogOut className="h-4 w-4" />
                {t('actions.logout')}
              </Button>
            </>
          }
        />
        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-6xl animate-rise">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
