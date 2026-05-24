export type NoteKind = 'PROJECT_REFLECTION' | 'DECISION' | 'PROCESS' | 'LESSON';
export type NoteVisibility = 'PRIVATE' | 'TEAM' | 'ALL';
export type PersonaSource = 'NOTE' | 'OFFBOARDING_ANSWER' | 'KB_ANSWER' | 'SIM_TRANSCRIPT';
export type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export type ProjectSummary = {
  id: string;
  name: string;
  department: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  _count?: { members: number; notes: number };
};

export type ProjectDetail = ProjectSummary & {
  members: ProjectMember[];
  notes: KnowledgeNote[];
};

export type ProjectMember = {
  id: string;
  role: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    position: string | null;
    department: string | null;
  };
};

export type KnowledgeNote = {
  id: string;
  projectId: string | null;
  kind: NoteKind;
  prompt: string | null;
  text: string;
  visibility: NoteVisibility;
  tags: string[];
  createdAt: string;
  project?: { id: string; name: string } | null;
  author?: { id: string; fullName: string; position: string | null };
};

export type PersonaSummary = {
  id: string;
  userId: string;
  voiceProfile: string;
  expertiseTags: string[];
  expertiseScore: Record<string, number>;
  lastTrainedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    position: string | null;
    department: string | null;
    status: string;
  };
  _count?: { chunks: number };
};

export type PersonaDetail = PersonaSummary & {
  user: PersonaSummary['user'] & { manager?: { id: string; fullName: string } | null };
  chunks: PersonaChunkPreview[];
};

export type PersonaChunkPreview = {
  id: string;
  source: PersonaSource;
  sourceRefId: string;
  text: string;
  createdAt: string;
};

export type PersonaSourceRef = {
  id: string;
  source: PersonaSource;
  sourceRefId: string;
  snippet: string;
  similarity: number;
};

export type PersonaAskDonePayload = {
  confidence: number;
  sources: PersonaSourceRef[];
};

export type WhoKnowsResult = {
  personaId: string;
  userId: string;
  fullName: string;
  position: string | null;
  department: string | null;
  expertiseTags: string[];
  recentNoteTags: string[];
  score: number;
  matchedTags: string[];
};

export type OffboardingInterview = {
  id: string;
  userId: string;
  triggeredBy: string;
  status: InterviewStatus;
  startedAt: string | null;
  completedAt: string | null;
  questions: OffboardingQuestion[];
};

export type OffboardingQuestion = {
  id: string;
  interviewId: string;
  order: number;
  questionText: string;
  questionKind: string;
  answerText: string | null;
};
