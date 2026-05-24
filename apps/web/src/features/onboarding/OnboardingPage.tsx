import { useState } from 'react';
import type React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  completeOnboardingDay,
  fetchOnboarding,
  startOnboardingDay,
  type CompleteDayResponse,
  type QuizAnswers,
} from './api';
import { CompanionChat } from './components/CompanionChat';
import { DayView } from './components/DayView';
import { QuizRunner } from './components/QuizRunner';

const onboardingKey = ['onboarding', 'me'] as const;

export function OnboardingPage(): JSX.Element {
  const { t } = useTranslation('onboarding');
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<CompleteDayResponse | null>(null);

  const onboardingQuery = useQuery({
    queryKey: onboardingKey,
    queryFn: fetchOnboarding,
  });

  const startMutation = useMutation({
    mutationFn: startOnboardingDay,
    onSuccess: () => toast.success(t('started')),
    onError: () => toast.error(t('error')),
  });

  const completeMutation = useMutation({
    mutationFn: completeOnboardingDay,
    onSuccess: async (result) => {
      setLastResult(result);
      if (result.passed) {
        await queryClient.invalidateQueries({ queryKey: onboardingKey });
      }
    },
    onError: () => toast.error(t('error')),
  });

  if (onboardingQuery.isLoading) {
    return <StateCard title={t('title')} message={t('loading')} />;
  }

  if (onboardingQuery.isError) {
    return <StateCard title={t('title')} message={t('error')} />;
  }

  const data = onboardingQuery.data;
  if (!data?.assignment) {
    return <StateCard title={t('title')} message={t('empty')} />;
  }

  if (data.assignment.status === 'COMPLETED') {
    return (
      <StateCard
        title={t('title')}
        message={t('completedProgram')}
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
      />
    );
  }

  if (!data.currentDay) {
    return <StateCard title={t('title')} message={t('locked')} icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />} />;
  }
  const currentDay = data.currentDay;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 space-y-5">
        <DayView
          assignment={data.assignment}
          day={currentDay}
          startPending={startMutation.isPending}
          onStart={() => startMutation.mutate(currentDay.id)}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('quizTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuizRunner
                questions={currentDay.quiz?.questions ?? []}
                pending={completeMutation.isPending}
                result={lastResult}
                onSubmit={(quizAnswers: QuizAnswers) => completeMutation.mutate({ dayId: currentDay.id, quizAnswers })}
              />
            </CardContent>
          </Card>
        </DayView>

        {lastResult?.passed ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            {lastResult.completed
              ? t('programUnlocked')
              : t('dayUnlocked', { day: lastResult.nextDay ?? data.assignment.currentDay + 1, points: lastResult.pointsAwarded })}
          </div>
        ) : null}
      </section>

      <CompanionChat />
    </div>
  );
}

function StateCard({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: React.ReactNode;
}): JSX.Element {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
