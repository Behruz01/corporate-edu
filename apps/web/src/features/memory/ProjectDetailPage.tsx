import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addProjectMember, fetchProject } from './api';

type ProjectRouteParams = {
  id?: string;
};

export function ProjectDetailPage(): JSX.Element {
  const { t } = useTranslation('memory');
  const { id } = useParams<ProjectRouteParams>();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const projectQuery = useQuery({
    queryKey: ['memory', 'projects', id],
    queryFn: () => fetchProject(id ?? ''),
    enabled: Boolean(id),
  });

  const memberMutation = useMutation({
    mutationFn: addProjectMember,
    onSuccess: async () => {
      setUserId('');
      setRole('');
      await queryClient.invalidateQueries({ queryKey: ['memory', 'projects', id] });
    },
    onError: () => toast.error(t('common.error')),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!id || userId.trim().length < 5 || role.trim().length < 2) return;
    memberMutation.mutate({ projectId: id, userId: userId.trim(), role: role.trim() });
  }

  if (projectQuery.isLoading) return <State text={t('common.loading')} />;
  if (projectQuery.isError || !projectQuery.data) return <State text={t('common.error')} tone="error" />;

  const project = projectQuery.data;
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/memory/projects">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('projects.back')}
        </Link>
      </Button>

      <header className="rounded-md border bg-background p-5">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{project.description ?? t('projects.noDescription')}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-4">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>{t('projects.addMember')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onSubmit}>
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={userId} placeholder={t('projects.userId')} onChange={(event) => setUserId(event.target.value)} />
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={role} placeholder={t('projects.role')} onChange={(event) => setRole(event.target.value)} />
                <Button type="submit" disabled={memberMutation.isPending || userId.trim().length < 5 || role.trim().length < 2}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {t('projects.add')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>{t('projects.membersTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.members.length === 0 ? <State text={t('common.empty')} /> : null}
              {project.members.map((member) => (
                <div key={member.id} className="rounded-md border p-3">
                  <div className="text-sm font-medium">{member.user.fullName}</div>
                  <div className="text-xs text-muted-foreground">{member.role} - {member.user.position ?? member.user.email}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>{t('projects.notesTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.notes.length === 0 ? <State text={t('common.empty')} /> : null}
            {project.notes.map((note) => (
              <article key={note.id} className="rounded-md border p-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{t(`noteKind.${note.kind}`)}</span>
                  <span>{note.author?.fullName}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{note.text}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function State({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}
