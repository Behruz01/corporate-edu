import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Play, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  answerOffboardingQuestion,
  completeOffboardingInterview,
  fetchMyOffboardingInterview,
  startOffboardingInterview,
} from './api';

export function OffboardingPage(): JSX.Element {
  const { t } = useTranslation('memory');
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const interviewQuery = useQuery({
    queryKey: ['memory', 'offboarding', 'mine'],
    queryFn: fetchMyOffboardingInterview,
  });

  const interview = interviewQuery.data ?? null;
  const answeredCount = useMemo(() => interview?.questions.filter((question) => question.answerText).length ?? 0, [interview]);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['memory', 'offboarding', 'mine'] });
    await queryClient.invalidateQueries({ queryKey: ['memory', 'personas'] });
  };

  const startMutation = useMutation({
    mutationFn: startOffboardingInterview,
    onSuccess: refresh,
    onError: () => toast.error(t('common.error')),
  });
  const answerMutation = useMutation({
    mutationFn: answerOffboardingQuestion,
    onSuccess: async (_question, input) => {
      setDrafts((current) => {
        const next = { ...current };
        delete next[input.qaId];
        return next;
      });
      await refresh();
    },
    onError: () => toast.error(t('common.error')),
  });
  const completeMutation = useMutation({
    mutationFn: completeOffboardingInterview,
    onSuccess: refresh,
    onError: () => toast.error(t('common.error')),
  });

  if (interviewQuery.isLoading) return <State text={t('common.loading')} />;
  if (interviewQuery.isError) return <State text={t('common.error')} tone="error" />;
  if (!interview) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link to="/memory">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('offboarding.back')}
          </Link>
        </Button>
        <State text={t('offboarding.none')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/memory">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('offboarding.back')}
        </Link>
      </Button>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('offboarding.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t('offboarding.progress', { answered: answeredCount, total: interview.questions.length })}
          </p>
        </div>
        <div className="flex gap-2">
          {interview.status === 'SCHEDULED' ? (
            <Button disabled={startMutation.isPending} onClick={() => startMutation.mutate(interview.id)}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {t('offboarding.start')}
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={completeMutation.isPending || answeredCount === 0 || interview.status === 'COMPLETED'}
            onClick={() => completeMutation.mutate(interview.id)}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('offboarding.complete')}
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        {interview.questions.map((question) => {
          const draft = drafts[question.id] ?? question.answerText ?? '';
          return (
            <Card key={question.id} className="rounded-md">
              <CardHeader>
                <CardTitle className="text-base">
                  {question.order}. {question.questionText}
                </CardTitle>
                <CardDescription>{question.questionKind}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="min-h-28 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6"
                  value={draft}
                  disabled={interview.status === 'COMPLETED'}
                  placeholder={t('offboarding.answerPlaceholder')}
                  onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: event.target.value }))}
                />
                <Button
                  variant="outline"
                  disabled={answerMutation.isPending || draft.trim().length < 2 || interview.status === 'COMPLETED'}
                  onClick={() => answerMutation.mutate({ interviewId: interview.id, qaId: question.id, text: draft.trim() })}
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {t('offboarding.save')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

function State({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}
