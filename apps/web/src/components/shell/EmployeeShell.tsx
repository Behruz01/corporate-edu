import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from '@/components/feature/LangSwitcher';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logout } from '@/lib/api/auth';

const NAV = [
  { to: '/home', key: 'home' },
  { to: '/onboarding', key: 'onboarding' },
  { to: '/kb', key: 'kb' },
  { to: '/simulator', key: 'simulator' },
  { to: '/memory', key: 'memory' },
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
      <aside className="hidden md:flex w-60 border-r p-4 flex-col gap-1 bg-muted/30">
        <div className="text-lg font-semibold px-3 py-2">{t('appName')}</div>
        {NAV.map((n) => (
          <NavLink
            key={n.key}
            to={n.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`
            }
          >
            {t(`nav.${n.key}`)}
          </NavLink>
        ))}
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4 gap-3">
          <span className="font-medium text-sm">{user?.fullName}</span>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Button variant="ghost" size="sm" onClick={() => void onLogout()}>{t('actions.logout')}</Button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-background"><Outlet /></main>
      </div>
    </div>
  );
}
