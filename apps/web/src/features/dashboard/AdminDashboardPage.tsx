import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, MessageSquare, UsersRound, Workflow } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminAnalyticsOverview } from './dashboard-api';
import { QueryState } from './components/DashboardPrimitives';

export function AdminDashboardPage(): JSX.Element {
  const { t } = useTranslation('dashboard');
  const analyticsQuery = useQuery({ queryKey: ['dashboard', 'admin-analytics-overview'], queryFn: fetchAdminAnalyticsOverview });
  const data = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
      </div>

      <QueryState loading={analyticsQuery.isLoading} error={analyticsQuery.isError} empty={!data}>
        {data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard icon={<UsersRound className="h-5 w-5" aria-hidden="true" />} label={t('admin.users')} value={data.users} />
            <MetricCard icon={<FileText className="h-5 w-5" aria-hidden="true" />} label={t('admin.documents')} value={data.documents} />
            <MetricCard icon={<Workflow className="h-5 w-5" aria-hidden="true" />} label={t('admin.simulatorSessions')} value={data.simulatorSessions} />
            <MetricCard icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />} label={t('admin.messages')} value={data.messages} />
            <MetricCard icon={<BookOpen className="h-5 w-5" aria-hidden="true" />} label={t('admin.knowledgeNotes')} value={data.knowledgeNotes} />
            <MetricCard
              icon={<Workflow className="h-5 w-5" aria-hidden="true" />}
              label={t('admin.completionRate')}
              value={data.onboardingCompletionRate === null ? '-' : `${data.onboardingCompletionRate}%`}
            />
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }): JSX.Element {
  return (
    <Card className="rounded-lg">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
