export const QUEUE_NAMES = {
  documentsIngest: 'documents.ingest',
  personaTrain: 'persona.train',
  scoring: 'simulator.scoring',
  whisper: 'audio.transcribe',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
