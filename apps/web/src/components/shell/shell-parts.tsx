import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function BrandMark({ subtitle }: { subtitle?: string | undefined }): JSX.Element {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-display text-base font-bold text-[hsl(185_47%_9%)] shadow-[0_4px_14px_hsl(38_92%_50%/0.35)]">
        CM
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-bold tracking-tight text-sidebar-foreground">
          {t('appName')}
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-muted">
          {subtitle ?? 'Corporate'}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ children, brandSubtitle }: { children: ReactNode; brandSubtitle?: string | undefined }): JSX.Element {
  return (
    <aside className="bg-grain hidden w-64 shrink-0 flex-col gap-6 bg-sidebar px-4 py-6 text-sidebar-foreground md:flex">
      <BrandMark subtitle={brandSubtitle} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean | undefined };

export function SidebarNav({ items, label }: { items: NavItem[]; label?: string | undefined }): JSX.Element {
  return (
    <nav className="flex flex-col gap-1">
      {label ? (
        <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
          {label}
        </div>
      ) : null}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-white/10 font-semibold text-white ring-1 ring-inset ring-white/10'
                  : 'font-medium text-sidebar-foreground/70 hover:bg-white/[0.06] hover:text-white',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-all',
                    isActive ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                />
                <Icon className={isActive ? 'h-[18px] w-[18px] text-brand' : 'h-[18px] w-[18px]'} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Topbar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string | undefined;
  right: ReactNode;
}): JSX.Element {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-6 backdrop-blur-xl lg:px-10">
      <div className="min-w-0">
        <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">{title}</div>
        {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
