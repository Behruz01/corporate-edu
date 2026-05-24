import { api } from '@/lib/api/client';

export type DashboardStatusColor = 'on_track' | 'behind' | 'at_risk';

export type TeamReport = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  position: string | null;
  startedAt: string | null;
  departingAt: string | null;
  pointsTotal: number;
  onboardingPercent: number | null;
  avgSimulatorScore: number | null;
  knowledgeContributionCount: number;
  statusColor: DashboardStatusColor;
};

export type TeamOverviewResponse = {
  generatedAt: string;
  reports: TeamReport[];
};

export type SkillGapCategory = {
  category: string;
  avgScore: number;
  isGap: boolean;
  dimensions: Array<{ dimension: string; avgScore: number; samples: number }>;
};

export type SkillGapResponse = {
  categories: SkillGapCategory[];
  gaps: SkillGapCategory[];
};

export type KnowledgeRiskResponse = {
  departingWithIncompleteOffboarding: Array<{
    id: string;
    fullName: string;
    department: string | null;
    departingAt: string | null;
    unansweredQuestions: number;
  }>;
  highContributionUsers: Array<{
    id: string;
    fullName: string;
    department: string | null;
    status: string;
    contributionCount: number;
    departingAt: string | null;
  }>;
  projectsWithNoNotes: Array<{
    id: string;
    name: string;
    department: string | null;
    status: string;
    createdAt: string;
  }>;
};

export type MostAskedResponse = {
  topQuestions: Array<{ question: string; count: number; unansweredCount: number }>;
  unansweredTotal: number;
};

export type EmployeeDetailResponse = {
  employee: TeamReport;
  timeline: Array<{
    id: string;
    type: 'onboarding' | 'simulator' | 'note' | 'offboarding';
    title: string;
    description: string;
    occurredAt: string;
    score?: number | null;
    status?: string;
  }>;
  onboardingAssignments: Array<{
    id: string;
    templateName: string;
    status: string;
    startedAt: string;
    currentDay: number;
    percent: number | null;
  }>;
  simulatorSessions: Array<{
    id: string;
    scenarioTitle: string;
    category: string;
    attemptNum: number;
    status: string;
    startedAt: string;
    endedAt: string | null;
    overall: number | null;
    weakAreas: unknown;
  }>;
  notes: Array<{
    id: string;
    prompt: string | null;
    text: string;
    createdAt: string;
    project: { id: string; name: string } | null;
  }>;
};

export type AdminAnalyticsOverview = {
  users: number;
  documents: number;
  simulatorSessions: number;
  messages: number;
  knowledgeNotes: number;
  onboardingCompletionRate: number | null;
  generatedAt: string;
};

export async function fetchTeamOverview(): Promise<TeamOverviewResponse> {
  const { data } = await api.get<TeamOverviewResponse>('/dashboard/team-overview');
  return data;
}

export async function fetchSkillGap(): Promise<SkillGapResponse> {
  const { data } = await api.get<SkillGapResponse>('/dashboard/skill-gap');
  return data;
}

export async function fetchKnowledgeRisk(): Promise<KnowledgeRiskResponse> {
  const { data } = await api.get<KnowledgeRiskResponse>('/dashboard/knowledge-risk');
  return data;
}

export async function fetchMostAsked(): Promise<MostAskedResponse> {
  const { data } = await api.get<MostAskedResponse>('/dashboard/most-asked');
  return data;
}

export async function fetchEmployeeDetail(id: string): Promise<EmployeeDetailResponse> {
  const { data } = await api.get<EmployeeDetailResponse>(`/dashboard/employee/${id}`);
  return data;
}

export async function fetchAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  const { data } = await api.get<AdminAnalyticsOverview>('/admin/analytics/overview');
  return data;
}

export type ActivityTrendPoint = { week: string; simulator: number; questions: number; notes: number };

export async function fetchActivityTrends(): Promise<ActivityTrendPoint[]> {
  const { data } = await api.get<ActivityTrendPoint[]>('/admin/analytics/trends');
  return data;
}
