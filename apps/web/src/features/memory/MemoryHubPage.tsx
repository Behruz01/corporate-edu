import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenText, Network, Search, Trash2, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createNote, deleteNote, fetchMyNotes, fetchMyOffboardingInterview, fetchPersonas } from './api';
import type { NoteKind, NoteVisibility } from './types';

const noteKinds: NoteKind[] = ['PROJECT_REFLECTION', 'DECISION', 'PROCESS', 'LESSON'];
const visibilities: NoteVisibility[] = ['PRIVATE', 'TEAM', 'ALL'];

export function MemoryHubPage(): JSX.Element {
  const { t } = useTranslation('memory');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'notes' | 'personas'>('notes');
  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<NoteKind>('LESSON');
  const [visibility, setVisibility] = useState<NoteVisibility>('PRIVATE');
  const [tags, setTags] = useState('');

  const notesQuery = useQuery({ queryKey: ['memory', 'notes'], queryFn: fetchMyNotes });
  const personasQuery = useQuery({ queryKey: ['memory', 'personas'], queryFn: fetchPersonas });
  const interviewQuery = useQuery({ queryKey: ['memory', 'offboarding', 'mine'], queryFn: fetchMyOffboardingInterview });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      setNoteText('');
      setTags('');
      await queryClient.invalidateQueries({ queryKey: ['memory'] });
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['memory', 'notes'] }),
    onError: () => toast.error(t('common.error')),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const text = noteText.trim();
    if (text.length < 5) return;
    createMutation.mutate({
      kind: noteKind,
      text,
      visibility,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('hub.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('hub.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/memory/projects')}>
            <Network className="h-4 w-4" aria-hidden="true" />
            {t('hub.projects')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/memory/who-knows')}>
            <Search className="h-4 w-4" aria-hidden="true" />
            {t('hub.whoKnows')}
          </Button>
        </div>
      </header>

      {interviewQuery.data ? (
        <section className="flex flex-col gap-3 rounded-md border bg-background p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium">{t('hub.offboardingTitle')}</div>
            <p className="text-sm text-muted-foreground">{t('hub.offboardingBody')}</p>
          </div>
          <Button onClick={() => navigate('/memory/offboarding')}>{t('hub.continueInterview')}</Button>
        </section>
      ) : null}

      <div className="flex gap-2 rounded-md border bg-background p-1">
        <Button variant={tab === 'notes' ? 'default' : 'ghost'} onClick={() => setTab('notes')}>
          <BookOpenText className="h-4 w-4" aria-hidden="true" />
          {t('hub.notes')}
        </Button>
        <Button variant={tab === 'personas' ? 'default' : 'ghost'} onClick={() => setTab('personas')}>
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {t('hub.personas')}
        </Button>
      </div>

      {tab === 'notes' ? (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>{t('notes.new')}</CardTitle>
              <CardDescription>{t('notes.newBody')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onSubmit}>
                <div className="grid gap-2 md:grid-cols-2">
                  <select className="h-10 rounded-md border bg-background px-3 text-sm" value={noteKind} onChange={(event) => setNoteKind(event.target.value as NoteKind)}>
                    {noteKinds.map((kind) => <option key={kind} value={kind}>{t(`noteKind.${kind}`)}</option>)}
                  </select>
                  <select className="h-10 rounded-md border bg-background px-3 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as NoteVisibility)}>
                    {visibilities.map((item) => <option key={item} value={item}>{t(`visibility.${item}`)}</option>)}
                  </select>
                </div>
                <input className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={tags} placeholder={t('notes.tags')} onChange={(event) => setTags(event.target.value)} />
                <textarea className="min-h-36 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-6" value={noteText} placeholder={t('notes.placeholder')} onChange={(event) => setNoteText(event.target.value)} />
                <Button type="submit" disabled={createMutation.isPending || noteText.trim().length < 5}>{t('notes.save')}</Button>
              </form>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <State loading={notesQuery.isLoading} error={notesQuery.isError} empty={!notesQuery.isLoading && (notesQuery.data ?? []).length === 0} kind="notes" />
            {(notesQuery.data ?? []).map((note) => (
              <Card key={note.id} className="rounded-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{t(`noteKind.${note.kind}`)}</CardTitle>
                      <CardDescription>{new Date(note.createdAt).toLocaleDateString()}</CardDescription>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(note.id)} aria-label={t('notes.delete')}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-6">{note.text}</p>
                  <TagRow tags={note.tags} />
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <State loading={personasQuery.isLoading} error={personasQuery.isError} empty={!personasQuery.isLoading && (personasQuery.data ?? []).length === 0} kind="personas" />
          {(personasQuery.data ?? []).map((persona) => (
            <Card key={persona.id} className="rounded-md">
              <CardHeader>
                <CardTitle>{persona.user.fullName}</CardTitle>
                <CardDescription>{persona.user.position ?? persona.user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TagRow tags={persona.expertiseTags} />
                <Button asChild className="w-full">
                  <Link to={`/memory/personas/${persona.id}`}>{t('personas.ask')}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function TagRow({ tags }: { tags: string[] }): JSX.Element {
  if (tags.length === 0) return <div className="text-xs text-muted-foreground">-</div>;
  return <div className="flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{tag}</span>)}</div>;
}

function State({
  loading,
  error,
  empty,
  kind,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  kind: 'notes' | 'personas';
}): JSX.Element | null {
  const { t } = useTranslation('memory');
  if (loading) return <div className="text-sm text-muted-foreground">{t('common.loading')}</div>;
  if (error) return <div className="text-sm text-destructive">{t('common.error')}</div>;
  if (empty) {
    const Icon = kind === 'notes' ? BookOpenText : UserRound;
    const wrapperClassName = kind === 'personas' ? 'md:col-span-2 xl:col-span-3' : '';

    return (
      <div className={wrapperClassName}>
        <div className="animate-rise flex flex-col items-center justify-center rounded-md border border-dashed bg-background/80 px-6 py-10 text-center shadow-soft">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-accent/20 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{t(`${kind}.empty`)}</p>
        </div>
      </div>
    );
  }
  return null;
}
