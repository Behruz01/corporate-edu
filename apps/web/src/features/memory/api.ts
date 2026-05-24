import { api } from '@/lib/api/client';
import { streamSse } from '@/lib/sse';
import type {
  KnowledgeNote,
  NoteKind,
  NoteVisibility,
  OffboardingInterview,
  OffboardingQuestion,
  PersonaAskDonePayload,
  PersonaDetail,
  PersonaSummary,
  ProjectDetail,
  ProjectMember,
  ProjectSummary,
  WhoKnowsResult,
} from './types';

export type CreateNoteInput = {
  projectId?: string;
  kind: NoteKind;
  prompt?: string;
  text: string;
  visibility: NoteVisibility;
  tags: string[];
};

export type CreateProjectInput = {
  name: string;
  department?: string;
  description?: string;
};

export function streamPersonaAsk(
  personaId: string,
  question: string,
  handlers: {
    onToken: (token: string) => void;
    onDone: (payload: PersonaAskDonePayload) => void;
    onError: (error: Error) => void;
  },
): () => void {
  return streamSse(`/personas/${personaId}/ask`, { question }, handlers, isPersonaDonePayload, 'Persona stream');
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const { data } = await api.get<ProjectSummary[]>('/projects');
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
  const { data } = await api.post<ProjectSummary>('/projects', input);
  return data;
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  const { data } = await api.get<ProjectDetail>(`/projects/${id}`);
  return data;
}

export async function addProjectMember(input: { projectId: string; userId: string; role: string }): Promise<ProjectMember> {
  const { data } = await api.post<ProjectMember>(`/projects/${input.projectId}/members`, {
    userId: input.userId,
    role: input.role,
  });
  return data;
}

export async function fetchMyNotes(): Promise<KnowledgeNote[]> {
  const { data } = await api.get<KnowledgeNote[]>('/me/notes');
  return data;
}

export async function createNote(input: CreateNoteInput): Promise<KnowledgeNote> {
  const { data } = await api.post<KnowledgeNote>('/notes', input);
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/notes/${id}`);
}

export async function fetchPersonas(): Promise<PersonaSummary[]> {
  const { data } = await api.get<PersonaSummary[]>('/personas');
  return data;
}

export async function fetchPersona(id: string): Promise<PersonaDetail> {
  const { data } = await api.get<PersonaDetail>(`/personas/${id}`);
  return data;
}

export async function searchWhoKnows(query: string): Promise<WhoKnowsResult[]> {
  const { data } = await api.get<WhoKnowsResult[]>('/who-knows', { params: { query } });
  return data;
}

export async function fetchMyOffboardingInterview(): Promise<OffboardingInterview | null> {
  const { data } = await api.get<OffboardingInterview | null>('/me/offboarding/interview');
  return data;
}

export async function startOffboardingInterview(id: string): Promise<OffboardingInterview> {
  const { data } = await api.post<OffboardingInterview>(`/offboarding/interviews/${id}/start`);
  return data;
}

export async function answerOffboardingQuestion(input: {
  interviewId: string;
  qaId: string;
  text: string;
}): Promise<OffboardingQuestion> {
  const { data } = await api.post<OffboardingQuestion>(
    `/offboarding/interviews/${input.interviewId}/qa/${input.qaId}/answer`,
    { text: input.text },
  );
  return data;
}

export async function completeOffboardingInterview(id: string): Promise<OffboardingInterview> {
  const { data } = await api.post<OffboardingInterview>(`/offboarding/interviews/${id}/complete`);
  return data;
}

function isPersonaDonePayload(value: unknown): value is PersonaAskDonePayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { confidence?: unknown; sources?: unknown };
  return typeof candidate.confidence === 'number' && Array.isArray(candidate.sources);
}
