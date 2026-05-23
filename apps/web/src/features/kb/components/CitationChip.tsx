import { FileText } from 'lucide-react';

export type Citation = {
  id: string;
  messageId: string;
  documentId: string;
  chunkId: string;
  page: number | null;
  section: string | null;
  snippet: string;
  score: number;
};

type CitationChipProps = {
  citation: Citation;
  index: number;
};

export function CitationChip({ citation, index }: CitationChipProps): JSX.Element {
  const labelParts = [`#${index + 1}`];
  if (citation.section) labelParts.push(citation.section);
  if (citation.page) labelParts.push(`p. ${citation.page}`);

  return (
    <span
      title={citation.snippet}
      className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
    >
      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{labelParts.join(' · ')}</span>
    </span>
  );
}
