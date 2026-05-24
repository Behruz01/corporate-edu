import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchEmployeeDetail } from './dashboard-api';
import { PercentBar, QueryState, ScoreBar, StatusChip } from './components/DashboardPrimitives';
import { formatDate } from './dashboard-format';

type RouteParams = {
  id?: string;
};

export function EmployeeDetailPage(): JSX.Element {
  const { t } = useTranslation('dashboard');
  const { id } = useParams<RouteParams>();
  const employeeQuery = useQuery({
    queryKey: ['dashboard', 'employee', id],
    queryFn: () => fetchEmployeeDetail(id ?? ''),
    enabled: Boolean(id),
  });
  const detail = employeeQuery.data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/team">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('employee.back')}
        </Link>
      </Button>

      <QueryState loading={employeeQuery.isLoading} error={employeeQuery.isError || !id} empty={!detail}>
        {detail ? (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{detail.employee.fullName}</h1>
                <p className="text-sm text-muted-foreground">
                  {detail.employee.position ?? detail.employee.role} · {detail.employee.department ?? '-'}
                </p>
              </div>
              <StatusChip status={detail.employee.statusColor} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-lg">
                <CardHeader><CardTitle>{t('team.onboarding')}</CardTitle></CardHeader>
                <CardContent><PercentBar value={detail.employee.onboardingPercent} /></CardContent>
              </Card>
              <Card className="rounded-lg">
                <CardHeader><CardTitle>{t('team.simScore')}</CardTitle></CardHeader>
                <CardContent><ScoreBar value={detail.employee.avgSimulatorScore} /></CardContent>
              </Card>
              <Card className="rounded-lg">
                <CardHeader><CardTitle>{t('team.knowledge')}</CardTitle></CardHeader>
                <CardContent className="text-3xl font-semibold tabular-nums">{detail.employee.knowledgeContributionCount}</CardContent>
              </Card>
            </div>

            <Card className="rounded-lg">
              <CardHeader><CardTitle>{t('employee.timeline')}</CardTitle></CardHeader>
              <CardContent>
                {detail.timeline.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('states.empty')}</div>
                ) : (
                  <div className="space-y-4">
                    {detail.timeline.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="grid gap-2 border-l-2 border-muted pl-4 sm:grid-cols-[150px_1fr]">
                        <div className="text-xs text-muted-foreground">{formatDate(item.occurredAt)}</div>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                          {typeof item.score === 'number' ? <div className="mt-1 text-xs tabular-nums">{t('employee.score', { score: item.score })}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-lg">
                <CardHeader><CardTitle>{t('employee.simAttempts')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {detail.simulatorSessions.length === 0 ? <div className="text-sm text-muted-foreground">{t('states.empty')}</div> : null}
                  {detail.simulatorSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{session.scenarioTitle}</div>
                        <div className="text-xs text-muted-foreground">{session.category} · {formatDate(session.startedAt)}</div>
                      </div>
                      <ScoreBar value={session.overall} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader><CardTitle>{t('employee.notes')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {detail.notes.length === 0 ? <div className="text-sm text-muted-foreground">{t('states.empty')}</div> : null}
                  {detail.notes.slice(0, 6).map((note) => (
                    <div key={note.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="font-medium">{note.project?.name ?? t('employee.personalNote')}</div>
                      <div className="line-clamp-2 text-sm text-muted-foreground">{note.prompt ?? note.text}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
