import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, MessageSquareWarning, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchKnowledgeRisk, fetchMostAsked, fetchSkillGap } from './dashboard-api';
import { QueryState, ScoreBar } from './components/DashboardPrimitives';
import { formatDate } from './dashboard-format';

export function ReportsPage(): JSX.Element {
  const { t } = useTranslation('dashboard');
  const skillGapQuery = useQuery({ queryKey: ['dashboard', 'skill-gap'], queryFn: fetchSkillGap });
  const knowledgeRiskQuery = useQuery({ queryKey: ['dashboard', 'knowledge-risk'], queryFn: fetchKnowledgeRisk });
  const mostAskedQuery = useQuery({ queryKey: ['dashboard', 'most-asked'], queryFn: fetchMostAsked });
  const loading = skillGapQuery.isLoading || knowledgeRiskQuery.isLoading || mostAskedQuery.isLoading;
  const error = skillGapQuery.isError || knowledgeRiskQuery.isError || mostAskedQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0">
            <Link to="/team">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('employee.back')}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{t('reports.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
      </div>

      <QueryState loading={loading} error={error} empty={false}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                {t('reports.skillGap')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(skillGapQuery.data?.categories ?? []).length === 0 ? <div className="text-sm text-muted-foreground">{t('states.empty')}</div> : null}
              {skillGapQuery.data?.categories.map((category) => (
                <div key={category.category} className="space-y-3 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{category.category}</div>
                    <ScoreBar value={category.avgScore} />
                  </div>
                  <div className="space-y-2">
                    {category.dimensions.map((dimension) => (
                      <div key={dimension.dimension} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{dimension.dimension}</span>
                        <span className="tabular-nums">{dimension.avgScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" aria-hidden="true" />
                {t('reports.knowledgeRisk')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <h2 className="text-sm font-medium">{t('reports.departing')}</h2>
                {(knowledgeRiskQuery.data?.departingWithIncompleteOffboarding ?? []).length === 0 ? (
                  <KnowledgeRiskEmpty text={t('reports.emptyDeparting')} />
                ) : null}
                {knowledgeRiskQuery.data?.departingWithIncompleteOffboarding.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div>
                      <div className="font-medium">{user.fullName}</div>
                      <div className="text-muted-foreground">{user.department ?? '-'} · {formatDate(user.departingAt)}</div>
                    </div>
                    <span className="tabular-nums">{user.unansweredQuestions}</span>
                  </div>
                ))}
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-medium">{t('reports.highContribution')}</h2>
                {(knowledgeRiskQuery.data?.highContributionUsers ?? []).length === 0 ? (
                  <KnowledgeRiskEmpty text={t('reports.emptyHighContribution')} />
                ) : null}
                {knowledgeRiskQuery.data?.highContributionUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{user.fullName}</span>
                    <span className="tabular-nums">{user.contributionCount}</span>
                  </div>
                ))}
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-medium">{t('reports.projectsNoNotes')}</h2>
                {(knowledgeRiskQuery.data?.projectsWithNoNotes ?? []).length === 0 ? (
                  <KnowledgeRiskEmpty text={t('reports.emptyProjectsNoNotes')} />
                ) : null}
                {knowledgeRiskQuery.data?.projectsWithNoNotes.slice(0, 5).map((project) => (
                  <div key={project.id} className="text-sm">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-muted-foreground"> · {project.department ?? project.status}</span>
                  </div>
                ))}
              </section>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5 text-sky-700" aria-hidden="true" />
                {t('reports.mostAsked')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <div className="text-muted-foreground">{t('reports.unansweredTotal')}</div>
                <div className="text-3xl font-semibold tabular-nums">{mostAskedQuery.data?.unansweredTotal ?? 0}</div>
              </div>
              {(mostAskedQuery.data?.topQuestions ?? []).length === 0 ? <div className="text-sm text-muted-foreground">{t('states.empty')}</div> : null}
              {mostAskedQuery.data?.topQuestions.map((question) => (
                <div key={question.question} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                  <div className="line-clamp-2 text-sm font-medium">{question.question}</div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('reports.asked', { count: question.count })}</span>
                    <span>{t('reports.unanswered', { count: question.unansweredCount })}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}

function KnowledgeRiskEmpty({ text }: { text: string }): JSX.Element {
  return (
    <div className="animate-rise flex items-start gap-3 rounded-md border border-dashed bg-muted/35 px-3 py-4 text-sm text-muted-foreground">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="leading-6">{text}</span>
    </div>
  );
}
