import { MessageSquarePlus } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export type ConversationPreviewMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
};

export type ConversationListItem = {
  id: string;
  tenantId: string;
  userId: string;
  source: string;
  contextRef: string | null;
  title: string | null;
  createdAt: string;
  messages: ConversationPreviewMessage[];
};

type ConversationListProps = {
  conversations: ConversationListItem[];
  loading: boolean;
  error: boolean;
  newChatLabel: string;
  emptyStateLabel: string;
  onNewChat: () => void;
};

export function ConversationList({
  conversations,
  loading,
  error,
  newChatLabel,
  emptyStateLabel,
  onNewChat,
}: ConversationListProps): JSX.Element {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r bg-muted/20 md:w-72">
      <div className="border-b p-3">
        <Button type="button" variant="outline" className="w-full justify-start" onClick={onNewChat}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {newChatLabel}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? <div className="px-3 py-2 text-sm text-muted-foreground">...</div> : null}
        {error ? <div className="px-3 py-2 text-sm text-destructive">{emptyStateLabel}</div> : null}
        {!loading && !error && conversations.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{emptyStateLabel}</div>
        ) : null}
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <NavLink
              key={conversation.id}
              to={`/kb/c/${conversation.id}`}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                  isActive ? 'bg-primary/10 text-primary' : 'text-foreground',
                )
              }
            >
              <div className="truncate font-medium">{conversation.title ?? emptyStateLabel}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {conversation.messages[0]?.content ?? formatDate(conversation.createdAt)}
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}
