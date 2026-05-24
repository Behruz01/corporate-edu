import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createProject, fetchProjects } from './api';

export function ProjectsPage(): JSX.Element {
  const { t } = useTranslation('memory');
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const projectsQuery = useQuery({ queryKey: ['memory', 'projects'], queryFn: fetchProjects });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setName('');
      setDepartment('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: ['memory', 'projects'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (name.trim().length < 2) return;
    createMutation.mutate({
      name: name.trim(),
      ...(department.trim() ? { department: department.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('projects.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('projects.subtitle')}</p>
      </header>

      <section className="rounded-md border bg-background p-4">
        <form className="grid gap-3 lg:grid-cols-[1fr_0.8fr_1.2fr_auto]" onSubmit={onSubmit}>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" value={name} placeholder={t('projects.name')} onChange={(event) => setName(event.target.value)} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" value={department} placeholder={t('projects.department')} onChange={(event) => setDepartment(event.target.value)} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" value={description} placeholder={t('projects.description')} onChange={(event) => setDescription(event.target.value)} />
          <Button type="submit" disabled={createMutation.isPending || name.trim().length < 2}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('projects.create')}
          </Button>
        </form>
      </section>

      <State loading={projectsQuery.isLoading} error={projectsQuery.isError} empty={!projectsQuery.isLoading && (projectsQuery.data ?? []).length === 0} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(projectsQuery.data ?? []).map((project) => (
          <Card key={project.id} className="rounded-md">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.department ?? project.status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-3 min-h-12 text-sm leading-6 text-muted-foreground">{project.description ?? t('projects.noDescription')}</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{t('projects.members', { count: project._count?.members ?? 0 })}</span>
                <span>{t('projects.notes', { count: project._count?.notes ?? 0 })}</span>
              </div>
              <Button asChild className="w-full">
                <Link to={`/memory/projects/${project.id}`}>
                  {t('projects.open')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function State({ loading, error, empty }: { loading: boolean; error: boolean; empty: boolean }): JSX.Element | null {
  const { t } = useTranslation('memory');
  if (loading) return <div className="text-sm text-muted-foreground">{t('common.loading')}</div>;
  if (error) return <div className="text-sm text-destructive">{t('common.error')}</div>;
  if (empty) return <div className="text-sm text-muted-foreground">{t('common.empty')}</div>;
  return null;
}
