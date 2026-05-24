import { useQuery } from '@tanstack/react-query';
import { CalendarCheck2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchOnboardingHistory } from './api';

export function OnboardingHistoryPage(): JSX.Element {
  const { t } = useTranslation('onboarding');
  const historyQuery = useQuery({
    queryKey: ['onboarding', 'history'],
    queryFn: fetchOnboardingHistory,
  });

  if (historyQuery.isLoading) {
    return <HistoryState title={t('historyTitle')} message={t('loading')} />;
  }

  if (historyQuery.isError) {
    return <HistoryState title={t('historyTitle')} message={t('error')} />;
  }

  const history = historyQuery.data ?? [];
  if (history.length === 0) {
    return <HistoryState title={t('historyTitle')} message={t('historyEmpty')} />;
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t('historyTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('historySubtitle')}</p>
      </div>
      <div className="space-y-3">
        {history.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3 text-base">
                <span>Day {item.dayNumber}: {item.title}</span>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-sm text-primary">{item.quizScore ?? 0}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{item.description}</p>
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : t('notCompleted')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistoryState({ title, message }: { title: string; message: string }): JSX.Element {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
