import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { endSession, fetchSession, streamSimulatorTurn } from './api';
import type { SimulatorTurn } from './types';

type SessionRouteParams = {
  id?: string;
};

export function SessionPage(): JSX.Element {
  const { t } = useTranslation('simulator');
  const { id } = useParams<SessionRouteParams>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [streamingTurns, setStreamingTurns] = useState<SimulatorTurn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const sessionQuery = useQuery({
    queryKey: ['simulator', 'session', id],
    queryFn: () => fetchSession(id ?? ''),
    enabled: Boolean(id),
  });

  const endMutation = useMutation({
    mutationFn: () => endSession(id ?? ''),
    onSuccess: () => navigate(`/simulator/session/${id}/score`),
    onError: () => toast.error(t('session.endError')),
  });

  const turns = useMemo(() => {
    return [...(sessionQuery.data?.turns ?? []), ...streamingTurns];
  }, [sessionQuery.data?.turns, streamingTurns]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!id || streaming) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;

    abortRef.current?.();
    setText('');
    setStreaming(true);
    const localEmployee = makeLocalTurn(id, turns.length, 'EMPLOYEE', trimmed);
    const localAi = makeLocalTurn(id, turns.length + 1, 'AI_PERSONA', '');
    setStreamingTurns([localEmployee, localAi]);

    abortRef.current = streamSimulatorTurn(id, trimmed, {
      onToken: (token) => setStreamingTurns((current) => appendAiToken(current, token)),
      onDone: (payload) => {
        setStreaming(false);
        setStreamingTurns((current) => finalizeAiTurn(current, payload.turnId));
        void queryClient.invalidateQueries({ queryKey: ['simulator', 'session', id] });
        window.setTimeout(() => setStreamingTurns([]), 500);
      },
      onError: (error) => {
        setStreaming(false);
        toast.error(error.message);
      },
    });
  }

  if (sessionQuery.isLoading) return <State text={t('common.loading')} />;
  if (sessionQuery.isError || !sessionQuery.data) return <State text={t('common.error')} tone="error" />;

  const session = sessionQuery.data;
  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[600px] flex-col overflow-hidden rounded-md border bg-background">
      <header className="border-b px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Button variant="ghost" className="mb-2 h-auto px-0 py-0 text-muted-foreground" onClick={() => navigate('/simulator')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('session.back')}
            </Button>
            <h1 className="text-xl font-semibold">{session.scenario.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{session.scenario.brief}</p>
          </div>
          <Button
            variant="outline"
            disabled={streaming || endMutation.isPending || turns.length === 0}
            onClick={() => endMutation.mutate()}
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            {t('session.end')}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {turns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            {t('session.empty')}
          </div>
        ) : null}
        <div className="space-y-4">
          {turns.map((turn) => (
            <div key={turn.id} className={turn.speaker === 'EMPLOYEE' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  turn.speaker === 'EMPLOYEE'
                    ? 'max-w-[78%] rounded-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground'
                    : 'max-w-[78%] rounded-md border bg-card px-4 py-3 text-sm leading-6'
                }
              >
                <div className="mb-1 text-xs font-medium opacity-70">
                  {turn.speaker === 'EMPLOYEE' ? t('session.employee') : t('session.persona')}
                </div>
                {turn.text || <span className="text-muted-foreground">{t('session.typing')}</span>}
              </div>
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <form className="flex gap-2 border-t p-4" onSubmit={(event) => void onSubmit(event)}>
        <textarea
          className="min-h-11 max-h-32 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t('session.placeholder')}
          value={text}
          disabled={streaming || session.status !== 'IN_PROGRESS'}
          rows={1}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={streaming || text.trim().length === 0 || session.status !== 'IN_PROGRESS'}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {t('session.send')}
        </Button>
      </form>
    </div>
  );
}

function State({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }): JSX.Element {
  return <div className={tone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{text}</div>;
}

function makeLocalTurn(sessionId: string, turnIndex: number, speaker: 'EMPLOYEE' | 'AI_PERSONA', text: string): SimulatorTurn {
  return {
    id: `local-${speaker.toLowerCase()}-${Date.now()}`,
    sessionId,
    turnIndex,
    speaker,
    text,
    createdAt: new Date().toISOString(),
  };
}

function appendAiToken(turns: SimulatorTurn[], token: string): SimulatorTurn[] {
  return turns.map((turn) => (turn.speaker === 'AI_PERSONA' ? { ...turn, text: turn.text + token } : turn));
}

function finalizeAiTurn(turns: SimulatorTurn[], turnId: string): SimulatorTurn[] {
  return turns.map((turn) => (turn.speaker === 'AI_PERSONA' ? { ...turn, id: turnId } : turn));
}
