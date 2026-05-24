import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bot, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchScenarios } from './api';
import type { Difficulty, Scenario } from './types';

const difficultyOptions: Difficulty[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED'];

export function ScenarioLibraryPage(): JSX.Element {
  const { t } = useTranslation('simulator');
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');

  const scenariosQuery = useQuery({
    queryKey: ['simulator', 'scenarios', category, difficulty],
    queryFn: () => fetchScenarios({ category: category || undefined, difficulty: difficulty || undefined }),
  });

  const allCategories = useMemo(() => categoriesFrom(scenariosQuery.data ?? []), [scenariosQuery.data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            {t('library.eyebrow')}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('library.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('library.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-md border bg-background p-2">
          <Filter className="mt-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={category}
            aria-label={t('library.category')}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">{t('library.allCategories')}</option>
            {allCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={difficulty}
            aria-label={t('library.difficulty')}
            onChange={(event) => setDifficulty(event.target.value as Difficulty | '')}
          >
            <option value="">{t('library.allDifficulties')}</option>
            {difficultyOptions.map((item) => (
              <option key={item} value={item}>
                {t(`difficulty.${item}`)}
              </option>
            ))}
          </select>
        </div>
      </header>

      {scenariosQuery.isLoading ? <StateText text={t('common.loading')} /> : null}
      {scenariosQuery.isError ? <StateText text={t('common.error')} tone="error" /> : null}
      {!scenariosQuery.isLoading && !scenariosQuery.isError && (scenariosQuery.data ?? []).length === 0 ? (
        <StateText text={t('library.empty')} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(scenariosQuery.data ?? []).map((scenario) => (
          <Card key={scenario.id} className="flex min-h-64 flex-col rounded-md">
            <CardHeader>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge>{scenario.category}</Badge>
                <Badge>{t(`difficulty.${scenario.difficulty}`)}</Badge>
              </div>
              <CardTitle className="leading-snug">{scenario.title}</CardTitle>
              <CardDescription className="line-clamp-4">{scenario.brief}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => navigate(`/simulator/${scenario.id}`)}>
                {t('library.start')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }): JSX.Element {
  return <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{children}</span>;
}

function StateText({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}

function categoriesFrom(scenarios: Scenario[]): string[] {
  return [...new Set(scenarios.map((scenario) => scenario.category))].sort((a, b) => a.localeCompare(b));
}
