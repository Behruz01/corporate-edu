import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DIFFICULTIES, type ScenarioDifficulty, createScenario, fetchScenarios } from './admin-api';

export function ScenariosPage(): JSX.Element {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState<ScenarioDifficulty>('BASIC');
  const [brief, setBrief] = useState('');
  const [personaDesc, setPersonaDesc] = useState('');

  const scenariosQuery = useQuery({ queryKey: ['admin', 'scenarios'], queryFn: fetchScenarios });
  const createMutation = useMutation({
    mutationFn: createScenario,
    onSuccess: async () => {
      setTitle('');
      setCategory('');
      setDifficulty('BASIC');
      setBrief('');
      setPersonaDesc('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'scenarios'] });
      toast.success(t('messages.saved'));
    },
    onError: () => toast.error(t('messages.failed')),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    createMutation.mutate({
      title: title.trim(),
      category: category.trim(),
      difficulty,
      brief: brief.trim(),
      personaDesc: personaDesc.trim(),
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('scenarios.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('scenarios.subtitle')}</p>
      </header>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('scenarios.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <Field label={t('fields.title')} htmlFor="scenario-title">
              <Input id="scenario-title" value={title} required minLength={3} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label={t('fields.category')} htmlFor="scenario-category">
              <Input id="scenario-category" value={category} required minLength={2} onChange={(event) => setCategory(event.target.value)} />
            </Field>
            <Field label={t('fields.difficulty')} htmlFor="scenario-difficulty">
              <select
                id="scenario-difficulty"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as ScenarioDifficulty)}
              >
                {DIFFICULTIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label={t('fields.brief')} htmlFor="scenario-brief">
                <textarea
                  id="scenario-brief"
                  className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={brief}
                  required
                  minLength={10}
                  onChange={(event) => setBrief(event.target.value)}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label={t('fields.personaDesc')} htmlFor="scenario-persona">
                <textarea
                  id="scenario-persona"
                  className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={personaDesc}
                  required
                  minLength={10}
                  onChange={(event) => setPersonaDesc(event.target.value)}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending || !title.trim() || !category.trim() || brief.trim().length < 10 || personaDesc.trim().length < 10}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {createMutation.isPending ? t('actions.saving') : t('actions.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {scenariosQuery.isLoading ? <StateText>{t('states.loading')}</StateText> : null}
        {scenariosQuery.isError ? <StateText danger>{t('states.error')}</StateText> : null}
        {scenariosQuery.data?.map((scenario) => (
          <Card key={scenario.id} className="rounded-lg">
            <CardContent className="grid gap-2 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <div className="font-medium">{scenario.title}</div>
                <div className="text-sm text-muted-foreground">{scenario.category} · {scenario.difficulty}</div>
                <p className="mt-2 line-clamp-2 text-sm">{scenario.brief}</p>
              </div>
              <span className="text-sm text-muted-foreground">{scenario.active ? t('states.active') : t('states.inactive')}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function StateText({ children, danger = false }: { children: string; danger?: boolean }): JSX.Element {
  return <div className={danger ? 'rounded-lg border p-6 text-sm text-destructive' : 'rounded-lg border p-6 text-sm text-muted-foreground'}>{children}</div>;
}
