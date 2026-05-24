import { getAccessToken } from '@/lib/api/client';

type KbAskDonePayload = {
  messageId: string;
};

export type SseHandlers<TDone> = {
  onToken: (token: string) => void;
  onDone: (payload: TDone) => void;
  onError: (error: Error) => void;
};

export type KbAskHandlers = SseHandlers<KbAskDonePayload>;

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
  const body: { question: string; conversationId?: string } = { question };
  if (conversationId) body.conversationId = conversationId;
  return streamSse('/kb/ask', body, handlers, isDonePayload, 'KB stream');
}

export function streamSse<TDone>(
  path: string,
  body: Record<string, unknown>,
  handlers: SseHandlers<TDone>,
  isDone: (value: unknown) => value is TDone,
  label = 'SSE stream',
): () => void {
  const controller = new AbortController();
  void readSseStream(path, body, controller.signal, handlers, isDone, label);
  return () => controller.abort();
}

async function readSseStream<TDone>(
  path: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
  handlers: SseHandlers<TDone>,
  isDone: (value: unknown) => value is TDone,
  label: string,
): Promise<void> {
  try {
    const token = getAccessToken();
    const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`${label} failed with status ${response.status}`);
    }
    if (!response.body) {
      throw new Error(`${label} response had no body`);
    }

    await readSseFrames(response.body, signal, handlers, isDone, label);
  } catch (error) {
    if (signal.aborted) return;
    handlers.onError(error instanceof Error ? error : new Error(`${label} failed`));
  }
}

async function readSseFrames<TDone>(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  handlers: SseHandlers<TDone>,
  isDone: (value: unknown) => value is TDone,
  label: string,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal.aborted) {
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      buffer = consumeFrames(buffer, handlers, isDone, label);
    }

    buffer += decoder.decode();
    flushRemainder(buffer, handlers, isDone, label);
  } finally {
    reader.releaseLock();
  }
}

function consumeFrames<TDone>(
  buffer: string,
  handlers: SseHandlers<TDone>,
  isDone: (value: unknown) => value is TDone,
  label: string,
): string {
  const frames = buffer.split(/\r?\n\r?\n/);
  const remainder = frames.pop() ?? '';

  for (const rawFrame of frames) {
    const frame = parseFrame(rawFrame);
    if (!frame) continue;
    dispatchFrame(frame, handlers, isDone, label);
  }

  return remainder;
}

function flushRemainder<TDone>(
  buffer: string,
  handlers: SseHandlers<TDone>,
  isDone: (value: unknown) => value is TDone,
  label: string,
): void {
  if (buffer.trim().length === 0) return;
  const frame = parseFrame(buffer);
  if (frame) dispatchFrame(frame, handlers, isDone, label);
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

function dispatchFrame<TDone>(
  frame: SseFrame,
  handlers: SseHandlers<TDone>,
  isDone: (value: unknown) => value is TDone,
  label: string,
): void {
  if (frame.event === 'token') {
    const parsed = parseJson(frame.data);
    handlers.onToken(typeof parsed === 'string' ? parsed : frame.data);
    return;
  }

  if (frame.event === 'done') {
    const parsed = parseJson(frame.data);
    if (isDone(parsed)) {
      handlers.onDone(parsed);
      return;
    }
    handlers.onError(new Error(`${label} finished with an invalid done payload`));
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
