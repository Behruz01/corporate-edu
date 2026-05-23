import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { streamKbAsk } from '@/lib/sse';
import { ConversationList, type ConversationListItem } from '@/features/kb/components/ConversationList';
import { MessageBubble, type ChatMessage, type KbRating } from '@/features/kb/components/MessageBubble';

type KbRouteParams = {
  id?: string;
};

type RateResponse = {
  ok: boolean;
};

const conversationsKey = ['kb', 'conversations'] as const;

export function KbChatPage(): JSX.Element {
  const { t } = useTranslation('kb');
  const { id: conversationId } = useParams<KbRouteParams>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [streamingMessages, setStreamingMessages] = useState<ChatMessage[]>([]);
  const [streamConversationId, setStreamConversationId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState(false);
  const [lastDoneMessageId, setLastDoneMessageId] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationsQuery = useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations,
  });

  const messagesQuery = useQuery({
    queryKey: ['kb', 'messages', conversationId],
    queryFn: () => fetchMessages(conversationId ?? ''),
    enabled: Boolean(conversationId),
  });

  const rateMutation = useMutation({
    mutationFn: rateMessage,
    onSuccess: async () => {
      if (conversationId) {
        await queryClient.invalidateQueries({ queryKey: ['kb', 'messages', conversationId] });
      }
    },
    onError: () => toast.error(t('emptyState')),
  });

  const messages = useMemo(() => {
    const persisted = messagesQuery.data ?? [];
    if (streamingMessages.length === 0) return persisted;
    if (streamConversationId !== conversationId) return streamingMessages;
    if (lastDoneMessageId && persisted.some((message) => message.id === lastDoneMessageId)) return persisted;
    return [...persisted, ...streamingMessages];
  }, [conversationId, lastDoneMessageId, messagesQuery.data, streamConversationId, streamingMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!lastDoneMessageId || !messagesQuery.data?.some((message) => message.id === lastDoneMessageId)) return;
    setStreamingMessages([]);
    setStreamConversationId(undefined);
    setLastDoneMessageId(null);
  }, [lastDoneMessageId, messagesQuery.data]);

  useEffect(() => {
    return () => abortRef.current?.();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 2 || streaming) return;

    abortRef.current?.();
    setQuestion('');
    setStreaming(true);
    setLastDoneMessageId(null);
    setStreamConversationId(conversationId);
    setStreamingMessages([
      createLocalMessage('USER', trimmed, conversationId),
      createLocalMessage('ASSISTANT', '', conversationId),
    ]);

    abortRef.current = streamKbAsk(trimmed, conversationId, {
      onToken: (token) => {
        setStreamingMessages((current) => appendAssistantToken(current, token));
      },
      onDone: (payload) => {
        setStreaming(false);
        setLastDoneMessageId(payload.messageId);
        setStreamingMessages((current) => finalizeAssistantMessage(current, payload.messageId));
        void queryClient.invalidateQueries({ queryKey: conversationsKey });
        if (conversationId) {
          void queryClient.invalidateQueries({ queryKey: ['kb', 'messages', conversationId] });
          return;
        }
        void navigateToNewestConversation(queryClient, navigate);
      },
      onError: (error) => {
        setStreaming(false);
        toast.error(error.message);
      },
    });
  }

  function onRate(messageId: string, rating: KbRating): void {
    rateMutation.mutate({ messageId, rating });
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[560px] overflow-hidden rounded-md border bg-background">
      <ConversationList
        conversations={conversationsQuery.data ?? []}
        loading={conversationsQuery.isLoading}
        error={conversationsQuery.isError}
        newChatLabel={t('newChat')}
        emptyStateLabel={t('emptyState')}
        onNewChat={() => navigate('/kb')}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b px-5 py-4">
          <h1 className="text-xl font-semibold">{t('title')}</h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {messagesQuery.isLoading && conversationId ? (
            <div className="text-sm text-muted-foreground">...</div>
          ) : null}
          {messagesQuery.isError ? (
            <div className="text-sm text-destructive">{t('emptyState')}</div>
          ) : null}
          {!messagesQuery.isLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              {t('emptyState')}
            </div>
          ) : null}
          <div className="space-y-5">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                sourcesLabel={t('sources')}
                helpfulLabel={t('helpful')}
                notHelpfulLabel={t('notHelpful')}
                onRate={onRate}
                ratingPending={rateMutation.isPending}
              />
            ))}
          </div>
          <div ref={endRef} />
        </div>

        <form className="flex gap-2 border-t p-4" onSubmit={(event) => void onSubmit(event)}>
          <textarea
            className="min-h-11 max-h-32 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={t('placeholder')}
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
          <Button type="submit" disabled={streaming || question.trim().length < 2}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {t('send')}
          </Button>
        </form>
      </section>
    </div>
  );
}

async function fetchConversations(): Promise<ConversationListItem[]> {
  const { data } = await api.get<ConversationListItem[]>('/kb/conversations');
  return data;
}

async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/kb/conversations/${conversationId}/messages`);
  return data;
}

async function rateMessage(input: { messageId: string; rating: KbRating }): Promise<RateResponse> {
  const { data } = await api.post<RateResponse>(`/kb/messages/${input.messageId}/rate`, { rating: input.rating });
  return data;
}

function createLocalMessage(role: 'USER' | 'ASSISTANT', content: string, conversationId: string | undefined): ChatMessage {
  return {
    id: `local-${role.toLowerCase()}-${Date.now()}`,
    conversationId: conversationId ?? 'new',
    role,
    content,
    lang: null,
    rating: null,
    noAnswerFlag: false,
    createdAt: new Date().toISOString(),
    citations: [],
    nextStep: null,
  };
}

function appendAssistantToken(messages: ChatMessage[], token: string): ChatMessage[] {
  return messages.map((message) => {
    if (message.role !== 'ASSISTANT') return message;
    return { ...message, content: message.content + token };
  });
}

function finalizeAssistantMessage(messages: ChatMessage[], messageId: string): ChatMessage[] {
  return messages.map((message) => {
    if (message.role !== 'ASSISTANT') return message;
    return { ...message, id: messageId };
  });
}

async function navigateToNewestConversation(
  queryClient: ReturnType<typeof useQueryClient>,
  navigate: ReturnType<typeof useNavigate>,
): Promise<void> {
  const conversations = await queryClient.fetchQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations,
  });
  const newest = conversations[0];
  if (newest) navigate(`/kb/c/${newest.id}`, { replace: true });
}
