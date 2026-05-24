import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  FileText,
  Drama,
  GraduationCap,
  FolderKanban,
  Settings,
  LogOut,
} from 'lucide-react';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logout } from '@/lib/api/auth';
import { Sidebar, SidebarNav, Topbar } from './shell-parts';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/documents', label: 'Documents', icon: FileText },
  { to: '/admin/scenarios', label: 'Scenarios', icon: Drama },
  { to: '/admin/onboarding', label: 'Onboarding', icon: GraduationCap },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell(): JSX.Element {
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
      <Sidebar brandSubtitle="Admin">
        <SidebarNav items={NAV} />
      </Sidebar>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={user?.fullName ?? ''}
          subtitle="Administration"
          right={
            <>
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
