import { getAccessToken } from '@/lib/api/client';

type KbAskDonePayload = {
  messageId: string;
};

export type KbAskHandlers = {
  onToken: (token: string) => void;
  onDone: (payload: KbAskDonePayload) => void;
  onError: (error: Error) => void;
};

type SseFrame = {
  event: string;
  data: string;
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000') + '/api/v1';

export function streamKbAsk(
  question: string,
  conversationId: string | undefined,
  handlers: KbAskHandlers,
): () => void {
  const controller = new AbortController();

  void readKbAskStream(question, conversationId, controller.signal, handlers);

  return () => controller.abort();
}

async function readKbAskStream(
  question: string,
  conversationId: string | undefined,
  signal: AbortSignal,
  handlers: KbAskHandlers,
): Promise<void> {
  try {
    const token = getAccessToken();
    const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const body: { question: string; conversationId?: string } = { question };
    if (conversationId) body.conversationId = conversationId;

    const response = await fetch(`${apiBaseUrl}/kb/ask`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`KB stream failed with status ${response.status}`);
    }
    if (!response.body) {
      throw new Error('KB stream response had no body');
    }

    await readSseFrames(response.body, signal, handlers);
  } catch (error) {
    if (signal.aborted) return;
    handlers.onError(error instanceof Error ? error : new Error('KB stream failed'));
  }
}

async function readSseFrames(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  handlers: KbAskHandlers,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal.aborted) {
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      buffer = consumeFrames(buffer, handlers);
    }

    buffer += decoder.decode();
    flushRemainder(buffer, handlers);
  } finally {
    reader.releaseLock();
  }
}

function consumeFrames(buffer: string, handlers: KbAskHandlers): string {
  const frames = buffer.split(/\r?\n\r?\n/);
  const remainder = frames.pop() ?? '';

  for (const rawFrame of frames) {
    const frame = parseFrame(rawFrame);
    if (!frame) continue;
    dispatchFrame(frame, handlers);
  }

  return remainder;
}

function flushRemainder(buffer: string, handlers: KbAskHandlers): void {
  if (buffer.trim().length === 0) return;
  const frame = parseFrame(buffer);
  if (frame) dispatchFrame(frame, handlers);
}

function parseFrame(rawFrame: string): SseFrame | null {
  const dataLines: string[] = [];
  let event = 'message';

  for (const line of rawFrame.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

function dispatchFrame(frame: SseFrame, handlers: KbAskHandlers): void {
  if (frame.event === 'token') {
    const parsed = parseJson(frame.data);
    handlers.onToken(typeof parsed === 'string' ? parsed : frame.data);
    return;
  }

  if (frame.event === 'done') {
    const parsed = parseJson(frame.data);
    if (isDonePayload(parsed)) {
      handlers.onDone(parsed);
      return;
    }
    handlers.onError(new Error('KB stream finished without a message id'));
    return;
  }

  if (frame.event === 'error') {
    const parsed = parseJson(frame.data);
    const message = typeof parsed === 'string' ? parsed : frame.data;
    handlers.onError(new Error(message));
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isDonePayload(value: unknown): value is KbAskDonePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'messageId' in value &&
    typeof (value as { messageId: unknown }).messageId === 'string'
  );
}
