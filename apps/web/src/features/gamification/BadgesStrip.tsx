import { useQuery } from '@tanstack/react-query';
import { Award, LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { fetchMyBadges, type BadgeCode } from './api';

const BADGE_KEYS: Record<BadgeCode, string> = {
  DAY_5: 'badges.labels.DAY_5',
  FIRST_SIM: 'badges.labels.FIRST_SIM',
  KNOWLEDGE_CONTRIBUTOR: 'badges.labels.KNOWLEDGE_CONTRIBUTOR',
  TOP_SCORER: 'badges.labels.TOP_SCORER',
};

export function BadgesStrip(): JSX.Element {
  const { t } = useTranslation('gamification');
  const badgesQuery = useQuery({ queryKey: ['gamification', 'me', 'badges'], queryFn: fetchMyBadges });
  const badges = badgesQuery.data?.badges ?? [];

  if (badgesQuery.isLoading) {
    return <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{t('loadingBadges')}</div>;
  }

  if (badgesQuery.isError) {
    return <div className="rounded-lg border border-destructive/30 bg-card p-4 text-sm text-destructive">{t('badgesError')}</div>;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('badges.title')}</h2>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const Icon = badge.earned ? Award : LockKeyhole;
          return (
            <span
              key={badge.code}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium',
                badge.earned ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(BADGE_KEYS[badge.code])}
            </span>
          );
        })}
      </div>
    </section>
  );
}
