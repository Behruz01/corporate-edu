import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fetchLeaderboard } from './api';

export function LeaderboardPage(): JSX.Element {
  const { t } = useTranslation('gamification');
  const user = useAuthStore((state) => state.user);
  const leaderboardQuery = useQuery({ queryKey: ['gamification', 'leaderboard'], queryFn: fetchLeaderboard });
  const entries = leaderboardQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
          {t('points')}
        </div>
        <h1 className="text-2xl font-semibold">{t('leaderboard')}</h1>
      </header>

      {leaderboardQuery.isLoading ? <StateText text={t('states.loading')} /> : null}
      {leaderboardQuery.isError ? <StateText text={t('states.error')} tone="error" /> : null}

      {!leaderboardQuery.isLoading && !leaderboardQuery.isError ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t('leaderboard')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">{t('rank')}</th>
                    <th className="py-3 pr-4 font-medium">{t('name')}</th>
                    <th className="py-3 text-right font-medium">{t('points')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={cn('border-b last:border-0', entry.userId === user?.id ? 'bg-primary/5 text-primary' : undefined)}
                    >
                      <td className="py-3 pr-4 tabular-nums">{entry.rank}</td>
                      <td className="py-3 pr-4 font-medium">{entry.fullName}</td>
                      <td className="py-3 text-right tabular-nums">{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StateText({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}
