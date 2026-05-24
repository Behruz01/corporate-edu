import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSession, fetchScenario } from './api';

type ScenarioRouteParams = {
  scenarioId?: string;
};

export function ScenarioBriefPage(): JSX.Element {
  const { t } = useTranslation('simulator');
  const navigate = useNavigate();
  const { scenarioId } = useParams<ScenarioRouteParams>();

  const scenarioQuery = useQuery({
    queryKey: ['simulator', 'scenario', scenarioId],
    queryFn: () => fetchScenario(scenarioId ?? ''),
    enabled: Boolean(scenarioId),
  });

  const startMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (payload) => navigate(`/simulator/session/${payload.sessionId}`),
    onError: () => toast.error(t('brief.startError')),
  });

  if (scenarioQuery.isLoading) return <State text={t('common.loading')} />;
  if (scenarioQuery.isError || !scenarioQuery.data) return <State text={t('common.error')} tone="error" />;

  const scenario = scenarioQuery.data;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" className="px-0" onClick={() => navigate('/simulator')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('brief.back')}
      </Button>
      <section className="rounded-md border bg-background p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{scenario.category}</span>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {t(`difficulty.${scenario.difficulty}`)}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{scenario.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{scenario.brief}</p>
        <Button
          className="mt-6"
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate(scenario.id)}
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {t('brief.begin')}
        </Button>
      </section>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>{t('brief.persona')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">{scenario.personaDesc}</CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>{t('brief.criteria')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenario.criteria.map((criterion) => (
              <div key={criterion.id} className="rounded-md border p-3">
                <div className="text-sm font-medium">{criterion.dimension}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{criterion.rubric}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function State({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}
