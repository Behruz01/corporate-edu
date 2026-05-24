import { useQuery } from '@tanstack/react-query';
import { BarChart3, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchTeamOverview } from './dashboard-api';
import { PercentBar, QueryState, ScoreBar, StatusChip } from './components/DashboardPrimitives';

export function TeamOverviewPage(): JSX.Element {
  const { t } = useTranslation('dashboard');
  const overviewQuery = useQuery({ queryKey: ['dashboard', 'team-overview'], queryFn: fetchTeamOverview });
  const reports = overviewQuery.data?.reports ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('team.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('team.subtitle')}</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/team/reports">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {t('team.reports')}
          </Link>
        </Button>
      </div>

      <QueryState loading={overviewQuery.isLoading} error={overviewQuery.isError} empty={reports.length === 0}>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t('team.reportsTable')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">{t('team.employee')}</th>
                    <th className="py-3 pr-4 font-medium">{t('team.department')}</th>
                    <th className="py-3 pr-4 font-medium">{t('team.onboarding')}</th>
                    <th className="py-3 pr-4 font-medium">{t('team.simScore')}</th>
                    <th className="py-3 pr-4 font-medium">{t('team.knowledge')}</th>
                    <th className="py-3 pr-4 font-medium">{t('team.status')}</th>
                    <th className="py-3 text-right font-medium">{t('team.open')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{report.fullName}</div>
                        <div className="text-xs text-muted-foreground">{report.position ?? report.email}</div>
                      </td>
                      <td className="py-3 pr-4">{report.department ?? '-'}</td>
                      <td className="py-3 pr-4"><PercentBar value={report.onboardingPercent} /></td>
                      <td className="py-3 pr-4"><ScoreBar value={report.avgSimulatorScore} /></td>
                      <td className="py-3 pr-4 tabular-nums">{report.knowledgeContributionCount}</td>
                      <td className="py-3 pr-4"><StatusChip status={report.statusColor} /></td>
                      <td className="py-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/team/employee/${report.id}`} aria-label={t('team.openEmployee', { name: report.fullName })}>
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </QueryState>
    </div>
  );
}
