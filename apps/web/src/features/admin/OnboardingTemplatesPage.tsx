import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { fetchOnboardingTemplates } from './admin-api';

export function OnboardingTemplatesPage(): JSX.Element {
  const { t } = useTranslation('admin');
  const templatesQuery = useQuery({ queryKey: ['admin', 'onboarding-templates'], queryFn: fetchOnboardingTemplates });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('onboarding.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('onboarding.subtitle')}</p>
      </header>

      {templatesQuery.isLoading ? <StateText>{t('states.loading')}</StateText> : null}
      {templatesQuery.isError ? <StateText danger>{t('states.error')}</StateText> : null}
      <div className="grid gap-4">
        {templatesQuery.data?.map((template) => (
          <Card key={template.id} className="rounded-lg">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{template.name}</h2>
                  <p className="text-sm text-muted-foreground">{template.role} · {template.isActive ? t('states.active') : t('states.inactive')}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {t('onboarding.daysCount', { count: template.days.length })}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {template.days.map((day) => (
                  <div key={day.id} className="rounded-md border bg-muted/20 p-3">
                    <div className="font-medium">{t('onboarding.dayNumber', { number: day.dayNumber })}: {day.title}</div>
                    <div className="text-sm text-muted-foreground">{day.estimatedMin} {t('fields.minutes')}</div>
                    <p className="mt-2 text-sm">{day.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StateText({ children, danger = false }: { children: string; danger?: boolean }): JSX.Element {
  return <div className={danger ? 'rounded-lg border p-6 text-sm text-destructive' : 'rounded-lg border p-6 text-sm text-muted-foreground'}>{children}</div>;
}
