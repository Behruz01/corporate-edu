import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { searchWhoKnows } from './api';

export function WhoKnowsPage(): JSX.Element {
  const { t } = useTranslation('memory');
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const activeQuery = searchParams.get('query') ?? '';

  const resultsQuery = useQuery({
    queryKey: ['memory', 'who-knows', activeQuery],
    queryFn: () => searchWhoKnows(activeQuery),
    enabled: activeQuery.trim().length >= 2,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setSearchParams({ query: trimmed });
  }

  const results = resultsQuery.data ?? [];
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/memory">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('whoKnows.back')}
        </Link>
      </Button>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('whoKnows.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('whoKnows.subtitle')}</p>
      </header>

      <form className="flex gap-2 rounded-md border bg-background p-3" onSubmit={onSubmit}>
        <input
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
          value={query}
          placeholder={t('whoKnows.placeholder')}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" disabled={query.trim().length < 2}>
          <Search className="h-4 w-4" aria-hidden="true" />
          {t('whoKnows.search')}
        </Button>
      </form>

      {resultsQuery.isLoading ? <State text={t('common.loading')} /> : null}
      {resultsQuery.isError ? <State text={t('common.error')} tone="error" /> : null}
      {activeQuery && !resultsQuery.isLoading && !resultsQuery.isError && results.length === 0 ? <State text={t('common.empty')} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((result) => (
          <Card key={result.personaId} className="rounded-md">
            <CardHeader>
              <CardTitle>{result.fullName}</CardTitle>
              <CardDescription>{result.position ?? result.department ?? '-'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm font-medium">{t('whoKnows.score', { score: result.score })}</div>
              <TagRow tags={result.matchedTags.length > 0 ? result.matchedTags : result.expertiseTags} />
              <Button asChild className="w-full">
                <Link to={`/memory/personas/${result.personaId}`}>{t('personas.ask')}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function TagRow({ tags }: { tags: string[] }): JSX.Element {
  if (tags.length === 0) return <div className="text-xs text-muted-foreground">-</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          {tag}
        </span>
      ))}
    </div>
  );
}

function State({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}
