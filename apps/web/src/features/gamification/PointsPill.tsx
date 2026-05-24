import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { fetchMyPoints } from './api';

export function PointsPill(): JSX.Element {
  const { t } = useTranslation('gamification');
  const pointsQuery = useQuery({ queryKey: ['gamification', 'me', 'points'], queryFn: fetchMyPoints });
  const total = pointsQuery.data?.total;

  return (
    <Link
      to="/leaderboard"
      className={cn(
        'inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium',
        'bg-amber-50 text-amber-800 hover:bg-amber-100',
      )}
      aria-label={t('points')}
    >
      <Trophy className="h-4 w-4" aria-hidden="true" />
      <span className="tabular-nums">{total ?? '-'}</span>
    </Link>
  );
}
