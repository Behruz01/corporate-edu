import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OnboardingTopic } from '../api';

type TopicAccordionProps = {
  topics: OnboardingTopic[];
};

export function TopicAccordion({ topics }: TopicAccordionProps): JSX.Element {
  const [openTopicId, setOpenTopicId] = useState<string | null>(topics[0]?.id ?? null);

  if (topics.length === 0) {
    return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No topics yet.</div>;
  }

  return (
    <div className="divide-y rounded-md border">
      {topics.map((topic) => {
        const open = openTopicId === topic.id;
        return (
          <section key={topic.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-muted/60"
              onClick={() => setOpenTopicId(open ? null : topic.id)}
            >
              <span>{topic.order}. {topic.title}</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : '')} aria-hidden="true" />
            </button>
            {open ? (
              <div className="space-y-3 px-4 pb-4 text-sm leading-6 text-muted-foreground">
                {topic.content.split('\n').filter(Boolean).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {topic.documentIds.length > 0 ? (
                  <div className="text-xs text-muted-foreground">{topic.documentIds.length} linked source documents</div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
