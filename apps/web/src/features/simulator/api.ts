import { api } from '@/lib/api/client';
import { streamSse } from '@/lib/sse';
import type { Difficulty, Scenario, SimulatorScore, SimulatorSession } from './types';

type CreateSessionResponse = {
  sessionId: string;
};

type TurnDonePayload = {
  turnId: string;
};

export function streamSimulatorTurn(
  sessionId: string,
  text: string,
  handlers: {
    onToken: (token: string) => void;
    onDone: (payload: TurnDonePayload) => void;
    onError: (error: Error) => void;
  },
): () => void {
  return streamSse(`/simulator/sessions/${sessionId}/turn`, { text }, handlers, isTurnDonePayload, 'Simulator stream');
}

export async function fetchScenarios(filters: { category?: string | undefined; difficulty?: Difficulty | undefined }): Promise<Scenario[]> {
  const { data } = await api.get<Scenario[]>('/scenarios', { params: filters });
  return data;
}

export async function fetchScenario(id: string): Promise<Scenario> {
  const { data } = await api.get<Scenario>(`/scenarios/${id}`);
  return data;
}

export async function createSession(scenarioId: string): Promise<CreateSessionResponse> {
  const { data } = await api.post<CreateSessionResponse>('/simulator/sessions', { scenarioId });
  return data;
}

export async function fetchSession(id: string): Promise<SimulatorSession> {
  const { data } = await api.get<SimulatorSession>(`/simulator/sessions/${id}`);
  return data;
}

export async function endSession(id: string): Promise<SimulatorScore> {
  const { data } = await api.post<SimulatorScore>(`/simulator/sessions/${id}/end`);
  return data;
}

function isTurnDonePayload(value: unknown): value is TurnDonePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'turnId' in value &&
    typeof (value as { turnId: unknown }).turnId === 'string'
  );
}
