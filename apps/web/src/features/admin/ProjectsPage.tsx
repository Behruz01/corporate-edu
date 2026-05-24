import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createProject, fetchProjects } from './admin-api';

export function ProjectsPage(): JSX.Element {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');

  const projectsQuery = useQuery({ queryKey: ['admin', 'projects'], queryFn: fetchProjects });
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setName('');
      setDepartment('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      toast.success(t('messages.saved'));
    },
    onError: () => toast.error(t('messages.failed')),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    createMutation.mutate({
      name: name.trim(),
      ...(department.trim() ? { department: department.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('projects.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('projects.subtitle')}</p>
      </header>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('projects.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <Field label={t('fields.name')} htmlFor="project-name">
              <Input id="project-name" value={name} required minLength={2} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label={t('fields.department')} htmlFor="project-department">
              <Input id="project-department" value={department} onChange={(event) => setDepartment(event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label={t('fields.description')} htmlFor="project-description">
                <textarea
                  id="project-description"
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {createMutation.isPending ? t('actions.saving') : t('actions.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {projectsQuery.isLoading ? <StateText>{t('states.loading')}</StateText> : null}
        {projectsQuery.isError ? <StateText danger>{t('states.error')}</StateText> : null}
        {projectsQuery.data?.map((project) => (
          <Card key={project.id} className="rounded-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{project.name}</h2>
                  <p className="text-sm text-muted-foreground">{project.department ?? t('fields.noDepartment')}</p>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs">{project.status}</span>
              </div>
              {project.description ? <p className="mt-3 line-clamp-3 text-sm">{project.description}</p> : null}
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <span>{t('projects.members', { count: project._count?.members ?? 0 })}</span>
                <span>{t('projects.notes', { count: project._count?.notes ?? 0 })}</span>
              </div>
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
