const CHUNK_TARGET_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 80;
const CHARS_PER_TOKEN = 4;

export type Chunk = {
  text: string;
  tokenCount: number;
  headerHint: string | null;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}

function splitParagraphs(input: string): string[] {
  return input
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSentences(input: string): string[] {
  return input
    .replace(/[ \t\n]+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLongText(input: string): string[] {
  if (estimateTokens(input) <= CHUNK_TARGET_TOKENS) return [input];
  const sentences = splitSentences(input);
  if (sentences.length > 1) return sentences;

  const maxChars = CHUNK_TARGET_TOKENS * CHARS_PER_TOKEN;
  const pieces: string[] = [];
  for (let i = 0; i < input.length; i += maxChars) {
    pieces.push(input.slice(i, i + maxChars).trim());
  }
  return pieces.filter(Boolean);
}

function detectHeader(paragraph: string): string | null {
  const trimmed = paragraph.trim();
  if (trimmed.length > 120) return null;
  if (/^#{1,2}\s+\S/.test(trimmed)) return trimmed.replace(/^#{1,2}\s+/, '').slice(0, 120);
  if (/^(\d+(\.\d+)*|[IVX]+)\.?\s+\S/i.test(trimmed)) return trimmed.slice(0, 120);
  if (trimmed.length > 4 && trimmed.toUpperCase() === trimmed && /[A-ZА-ЯЎҚҒҲ]/u.test(trimmed)) {
    return trimmed.slice(0, 120);
  }
  return null;
}

function overlapText(text: string): string {
  const maxChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars).replace(/^\S+\s+/, '').trim();
}

export function chunkText(raw: string): Chunk[] {
  const chunks: Chunk[] = [];
  let headerHint: string | null = null;
  let current = '';

  const flush = (): void => {
    const text = current.trim();
    if (!text) return;
    chunks.push({ text, tokenCount: estimateTokens(text), headerHint });
    current = overlapText(text);
  };

  for (const paragraph of splitParagraphs(raw)) {
    const header = detectHeader(paragraph);
    if (header) {
      headerHint = header;
      continue;
    }

    for (const piece of splitLongText(paragraph)) {
      const next = current ? `${current}\n\n${piece}` : piece;
      if (estimateTokens(next) > CHUNK_TARGET_TOKENS && current.trim()) flush();
      current = current ? `${current}\n\n${piece}` : piece;
      if (estimateTokens(current) > CHUNK_TARGET_TOKENS + CHUNK_OVERLAP_TOKENS) flush();
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), tokenCount: estimateTokens(current), headerHint });
  }

  return chunks;
}
