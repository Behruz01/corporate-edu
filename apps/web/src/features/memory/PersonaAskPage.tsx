import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MicButton } from '@/features/voice/MicButton';
import SpeakButton from '@/features/voice/SpeakButton';
import { fetchPersona, streamPersonaAsk } from './api';
import type { PersonaAskDonePayload, PersonaSourceRef } from './types';

type RouteParams = {
  id?: string;
};

type PersonaMessage = {
  id: string;
  role: 'USER' | 'PERSONA';
  text: string;
  confidence?: number;
  sources?: PersonaSourceRef[];
};

export function PersonaAskPage(): JSX.Element {
  const { t } = useTranslation('memory');
  const { id } = useParams<RouteParams>();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<PersonaMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const personaQuery = useQuery({
    queryKey: ['memory', 'personas', id],
    queryFn: () => fetchPersona(id ?? ''),
    enabled: Boolean(id),
  });

  const latestDone = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === 'PERSONA' && message.confidence !== undefined);
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!id || streaming) return;
    const trimmed = question.trim();
    if (trimmed.length < 2) return;

    abortRef.current?.();
    const answerId = `persona-${Date.now()}`;
    setQuestion('');
    setStreaming(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'USER', text: trimmed },
      { id: answerId, role: 'PERSONA', text: '' },
    ]);

    abortRef.current = streamPersonaAsk(id, trimmed, {
      onToken: (token) => setMessages((current) => appendPersonaToken(current, answerId, token)),
      onDone: (payload) => {
        setStreaming(false);
        setMessages((current) => finalizePersonaAnswer(current, answerId, payload));
      },
      onError: (error) => {
        setStreaming(false);
        toast.error(error.message);
      },
    });
  }

  if (personaQuery.isLoading) return <State text={t('common.loading')} />;
  if (personaQuery.isError || !personaQuery.data) return <State text={t('common.error')} tone="error" />;

  const persona = personaQuery.data;
  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col overflow-hidden rounded-md border bg-background">
      <header className="border-b px-5 py-4">
        <Button asChild variant="ghost" className="mb-2 h-auto px-0 py-0 text-muted-foreground">
          <Link to="/memory">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('personas.back')}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{persona.user.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{persona.user.position ?? persona.user.email}</p>
            <TagRow tags={persona.expertiseTags} />
          </div>
          <ConfidenceBadge confidence={latestDone?.confidence} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            {t('personas.emptyAsk')}
          </div>
        ) : null}
        <div className="space-y-4">
          {messages.map((message) => (
            <article key={message.id} className={message.role === 'USER' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  message.role === 'USER'
                    ? 'max-w-[78%] rounded-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground'
                    : 'max-w-[78%] rounded-md border bg-card px-4 py-3 text-sm leading-6'
                }
              >
                <div className="mb-1 text-xs font-medium opacity-70">
                  {message.role === 'USER' ? t('personas.you') : persona.user.fullName}
                </div>
                <p className="whitespace-pre-wrap">{message.text || t('personas.typing')}</p>
                {message.role === 'PERSONA' ? (
                  <div className="mt-2 flex justify-end">
                    <SpeakButton text={message.text} />
                  </div>
                ) : null}
                {message.sources && message.sources.length > 0 ? <Sources sources={message.sources} /> : null}
              </div>
            </article>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <form className="flex gap-2 border-t p-4" onSubmit={onSubmit}>
        <textarea
          className="min-h-11 max-h-32 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t('personas.placeholder')}
          value={question}
          disabled={streaming}
          rows={1}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <MicButton
          disabled={streaming}
          onTranscript={(text) => setQuestion((v) => (v ? `${v} ${text}` : text))}
        />
        <Button type="submit" disabled={streaming || question.trim().length < 2}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {t('personas.send')}
        </Button>
      </form>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number | undefined }): JSX.Element {
  const { t } = useTranslation('memory');
  const value = confidence === undefined ? null : Math.round(confidence * 100);
  const tone = value === null ? 'border' : value >= 55 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${tone}`}>
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      {value === null ? t('personas.confidencePending') : t('personas.confidence', { value })}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  NOTE: 'Eslatma',
  OFFBOARDING_ANSWER: 'Intervyu',
  KB_ANSWER: 'Bilim bazasi',
  SIM_TRANSCRIPT: 'Simulyator',
};

function Sources({ sources }: { sources: PersonaSourceRef[] }): JSX.Element {
  const { t } = useTranslation('memory');
  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('personas.sources')}
      </div>
      <div className="flex flex-col gap-1.5">
        {sources.map((source) => (
          <div key={source.id} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <span className="mt-0.5 shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              {SOURCE_LABELS[source.source] ?? source.source}
            </span>
            <span className="line-clamp-2">{truncate(source.snippet, 130)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function TagRow({ tags }: { tags: string[] }): JSX.Element {
  if (tags.length === 0) return <div className="mt-3 text-xs text-muted-foreground">-</div>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
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

function appendPersonaToken(messages: PersonaMessage[], answerId: string, token: string): PersonaMessage[] {
  return messages.map((message) => (message.id === answerId ? { ...message, text: message.text + token } : message));
}

function finalizePersonaAnswer(messages: PersonaMessage[], answerId: string, payload: PersonaAskDonePayload): PersonaMessage[] {
  return messages.map((message) => {
    if (message.id !== answerId) return message;
    return { ...message, confidence: payload.confidence, sources: payload.sources };
  });
}
