import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { streamOnboardingCompanion } from '../api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type CompanionChatProps = {
  disabled?: boolean;
};

export function CompanionChat({ disabled = false }: CompanionChatProps): JSX.Element {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 2 || streaming || disabled) return;

    abortRef.current?.();
    setQuestion('');
    setStreaming(true);
    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    abortRef.current = streamOnboardingCompanion(trimmed, {
      onToken: (token) => {
        setMessages((current) => current.map((message) => (
          message.id === assistantId ? { ...message, content: message.content + token } : message
        )));
      },
      onDone: () => setStreaming(false),
      onError: (error) => {
        setStreaming(false);
        toast.error(error.message);
      },
    });
  }

  return (
    <section className="flex h-[560px] flex-col rounded-md border bg-background">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">AI companion</h2>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Ask about today&apos;s topics, policy details, or quiz prep.
          </div>
        ) : null}
        {messages.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className="flex max-w-[86%] gap-2 rounded-md border bg-card px-3 py-2 text-sm">
              {message.role === 'user' ? (
                <UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              )}
              <span className="whitespace-pre-wrap leading-6">{message.content || '...'}</span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={submit}>
        <textarea
          className="min-h-10 max-h-28 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={question}
          rows={1}
          disabled={disabled || streaming}
          placeholder="Ask the companion..."
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="icon" disabled={disabled || streaming || question.trim().length < 2}>
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  );
}
