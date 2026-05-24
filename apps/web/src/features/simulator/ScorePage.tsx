import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSession } from './api';
import { RadarScore } from './RadarScore';
import { dimensionEntries } from './score-utils';
import type { SimulatorScore } from './types';

type ScoreRouteParams = {
  id?: string;
};

export function ScorePage(): JSX.Element {
  const { t } = useTranslation('simulator');
  const navigate = useNavigate();
  const { id } = useParams<ScoreRouteParams>();

  const sessionQuery = useQuery({
    queryKey: ['simulator', 'session', id],
    queryFn: () => fetchSession(id ?? ''),
    enabled: Boolean(id),
  });

  if (sessionQuery.isLoading) return <State text={t('common.loading')} />;
  if (sessionQuery.isError || !sessionQuery.data) return <State text={t('common.error')} tone="error" />;

  const score = sessionQuery.data.score;
  if (!score) {
    return (
      <div className="space-y-4">
        <State text={t('score.missing')} />
        <Button onClick={() => navigate(`/simulator/session/${id}`)}>{t('score.backToSession')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="px-0" onClick={() => navigate('/simulator')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('score.back')}
      </Button>
      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>{sessionQuery.data.scenario.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-6xl font-semibold tracking-tight">{score.overall}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('score.overall')}</div>
            <div className="mt-6 space-y-3">
              {dimensionEntries(score.dimensions).map((entry) => (
                <div key={entry.key}>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span>{t(`dimensions.${entry.key}`)}</span>
                    <span>{entry.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${entry.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>{t('score.radar')}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <RadarScore dimensions={score.dimensions} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>{t('score.feedback')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {score.feedback.map((item) => (
              <div key={`${item.dimension}-${item.comment}`} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{item.dimension}</span>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {t(`severity.${item.severity}`)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.comment}</p>
                {item.quote ? <blockquote className="mt-3 border-l-2 pl-3 text-xs italic text-muted-foreground">{item.quote}</blockquote> : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <KnowledgeBridge score={score} />
      </section>
    </div>
  );
}

function KnowledgeBridge({ score }: { score: SimulatorScore }): JSX.Element {
  const { t } = useTranslation('simulator');
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>{t('score.bridge')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {score.weakAreas.length === 0 ? <div className="text-sm text-muted-foreground">{t('score.noWeakAreas')}</div> : null}
        {score.weakAreas.map((area) => {
          const query = area.suggestKbQuery ?? area.topic;
          return (
            <div key={area.topic} className="rounded-md border p-4">
              <div className="text-sm font-medium">{area.topic}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/kb?question=${encodeURIComponent(query)}`}>
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {t('score.openKb')}
                  </Link>
                </Button>
                {area.suggestPersonaTags.map((tag) => (
                  <Button key={tag} asChild variant="ghost" size="sm">
                    <Link to={`/memory?tag=${encodeURIComponent(tag)}`}>
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                      {tag}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function State({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}
