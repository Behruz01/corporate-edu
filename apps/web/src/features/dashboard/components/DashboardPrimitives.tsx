import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { DashboardStatusColor } from '../dashboard-api';

const STATUS_STYLES: Record<DashboardStatusColor, string> = {
  on_track: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  behind: 'border-amber-200 bg-amber-50 text-amber-700',
  at_risk: 'border-red-200 bg-red-50 text-red-700',
};

export function StatusChip({ status }: { status: DashboardStatusColor }): JSX.Element {
  const { t } = useTranslation('dashboard');
  const Icon = status === 'on_track' ? CheckCircle2 : status === 'behind' ? Clock3 : AlertCircle;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium', STATUS_STYLES[status])}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}

export function PercentBar({ value }: { value: number | null }): JSX.Element {
  const safeValue = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-[150px] items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${safeValue}%` }} />
      </div>
      <span className="w-12 text-right text-sm tabular-nums">{value === null ? '-' : `${safeValue}%`}</span>
    </div>
  );
}

export function ScoreBar({ value }: { value: number | null }): JSX.Element {
  const safeValue = value === null ? 0 : Math.max(0, Math.min(100, value));
  const color = safeValue < 60 ? 'bg-red-500' : safeValue < 75 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className="flex min-w-[150px] items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${safeValue}%` }} />
      </div>
      <span className="w-12 text-right text-sm tabular-nums">{value === null ? '-' : safeValue}</span>
    </div>
  );
}

export function QueryState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  children: ReactNode;
}): JSX.Element {
  const { t } = useTranslation('dashboard');
  if (loading) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t('states.loading')}</div>;
  if (error) return <div className="rounded-lg border border-destructive/30 bg-card p-6 text-sm text-destructive">{t('states.error')}</div>;
  if (empty) return <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{t('states.empty')}</div>;
  return <>{children}</>;
}
