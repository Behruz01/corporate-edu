import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, BookOpenCheck, Sparkles, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgesStrip } from '@/features/gamification/BadgesStrip';
import { fetchMyBadges, fetchMyPoints } from '@/features/gamification/api';
import { fetchOnboarding } from '@/features/onboarding/api';
import { useAuthStore } from '@/lib/stores/auth-store';

export function HomePage(): JSX.Element {
  const { t } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const firstName = getFirstName(user?.fullName, t('home.fallbackName'));
  const pointsQuery = useQuery({
    queryKey: ['gamification', 'me', 'points'],
    queryFn: fetchMyPoints,
  });
  const onboardingQuery = useQuery({ queryKey: ['onboarding', 'me'], queryFn: fetchOnboarding });
  const badgesQuery = useQuery({
    queryKey: ['gamification', 'me', 'badges'],
    queryFn: fetchMyBadges,
  });

  const onboardingLabel = onboardingQuery.data?.assignment
    ? t('home.stats.dayProgress', {
        current: onboardingQuery.data.assignment.currentDay,
        total: onboardingQuery.data.assignment.totalDays,
      })
    : t('home.stats.notStarted');
  const earnedBadges = badgesQuery.data?.badges.filter((badge) => badge.earned).length;

  return (
    <div className="space-y-6">
      <section className="animate-rise overflow-hidden rounded-2xl border bg-primary px-6 py-7 text-primary-foreground shadow-glow md:px-8 md:py-9">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground/85">
              <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {t('home.eyebrow')}
            </span>
            {user?.role ? (
              <span className="inline-flex items-center rounded-md bg-brand px-2.5 py-1 text-xs font-semibold text-[hsl(185_47%_9%)]">
                {roleLabel(user.role)}
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {t('home.welcome', { name: firstName })}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 md:text-base">
            {t('home.subtitle')}
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className="animate-rise-1"
          icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
          label={t('home.stats.points')}
          value={
            pointsQuery.isLoading
              ? '...'
              : pointsQuery.isError
                ? t('home.stats.unavailable')
                : String(pointsQuery.data?.total ?? 0)
          }
          description={t('home.stats.pointsDescription')}
        />
        <StatCard
          className="animate-rise-2"
          icon={<BookOpenCheck className="h-5 w-5" aria-hidden="true" />}
          label={t('home.stats.onboarding')}
          value={
            onboardingQuery.isLoading
              ? '...'
              : onboardingQuery.isError
                ? t('home.stats.unavailable')
                : onboardingLabel
          }
          description={t('home.stats.onboardingDescription')}
        />
        <StatCard
          className="animate-rise-3"
          icon={<Award className="h-5 w-5" aria-hidden="true" />}
          label={t('home.stats.badges')}
          value={
            badgesQuery.isLoading
              ? '...'
              : badgesQuery.isError
                ? t('home.stats.unavailable')
                : String(earnedBadges ?? 0)
          }
          description={t('home.stats.badgesDescription')}
        />
        <Card className="animate-rise-3 overflow-hidden rounded-lg border-primary/15 bg-card shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
              {t('home.stats.nextStep')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('home.stats.nextStepDescription')}
            </p>
            <Link
              to="/onboarding"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('home.stats.nextStepAction')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <BadgesStrip />
    </div>
  );
}

function StatCard({
  className,
  description,
  icon,
  label,
  value,
}: {
  className: string;
  description: string;
  icon: ReactNode;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <Card className={`${className} rounded-lg shadow-soft`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function getFirstName(fullName: string | undefined, fallback: string): string {
  const [firstName] = fullName?.trim().split(/\s+/) ?? [];
  return firstName && firstName.length > 0 ? firstName : fallback;
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    EMPLOYEE: 'Xodim',
    MANAGER: 'Menejer',
    HR_ADMIN: 'HR Admin',
    PLATFORM_ADMIN: 'Platforma admini',
    KNOWLEDGE_CURATOR: 'Bilim kuratori',
  };
  return map[role] ?? role;
}
