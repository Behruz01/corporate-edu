import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CitationChip, type Citation } from '@/features/kb/components/CitationChip';
import { cn } from '@/lib/cn';

export type KbMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type KbRating = -1 | 0 | 1;

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: KbMessageRole;
  content: string;
  lang: 'UZ' | 'RU' | 'EN' | null;
  rating: number | null;
  noAnswerFlag: boolean;
  createdAt: string;
  citations: Citation[];
  nextStep: unknown | null;
};

type MessageBubbleProps = {
  message: ChatMessage;
  sourcesLabel: string;
  helpfulLabel: string;
  notHelpfulLabel: string;
  onRate: (messageId: string, rating: KbRating) => void;
  ratingPending: boolean;
};

export function MessageBubble({
  message,
  sourcesLabel,
  helpfulLabel,
  notHelpfulLabel,
  onRate,
  ratingPending,
}: MessageBubbleProps): JSX.Element {
  const isUser = message.role === 'USER';
  const currentRating = normalizeRating(message.rating);

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[82%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 shadow-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'border bg-card text-card-foreground',
          )}
        >
          {isUser ? message.content : cleanAnswer(message.content)}
        </div>

        {!isUser && message.citations.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">{sourcesLabel}</div>
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((citation, index) => (
                <CitationChip key={citation.id} citation={citation} index={index} />
              ))}
            </div>
          </div>
        ) : null}

        {!isUser ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={currentRating === 1 ? 'outline' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              disabled={ratingPending || message.id.startsWith('local-')}
              aria-label={helpfulLabel}
              title={helpfulLabel}
              onClick={() => onRate(message.id, currentRating === 1 ? 0 : 1)}
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={currentRating === -1 ? 'outline' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              disabled={ratingPending || message.id.startsWith('local-')}
              aria-label={notHelpfulLabel}
              title={notHelpfulLabel}
              onClick={() => onRate(message.id, currentRating === -1 ? 0 : -1)}
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeRating(rating: number | null): KbRating {
  if (rating === 1 || rating === -1) return rating;
  return 0;
}

// The model appends a fenced JSON citations block; strip it from the visible answer
// (citations are rendered separately as chips). Also drop inline [^n] markers.
function cleanAnswer(content: string): string {
  return content
    .replace(/```(?:json)?\s*[\s\S]*?"citations"[\s\S]*?```/gi, '')
    .replace(/```(?:json)?\s*[\s\S]*?"citations"[\s\S]*$/gi, '')
    .replace(/\[\^\d+\]/g, '')
    .trimEnd();
}
