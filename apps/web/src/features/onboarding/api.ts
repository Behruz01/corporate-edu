import { api } from '@/lib/api/client';
import { streamSse, type SseHandlers } from '@/lib/sse';

export type OnboardingStatus = 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type QuizType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export type OnboardingTopic = {
  id: string;
  order: number;
  title: string;
  content: string;
  documentIds: string[];
};

export type QuizQuestion = {
  id: string;
  type: QuizType;
  prompt: string;
  options: unknown;
  explanation: string | null;
};

export type OnboardingDay = {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  estimatedMin: number;
  topics: OnboardingTopic[];
  quiz: { id: string; questions: QuizQuestion[] } | null;
};

export type OnboardingAssignment = {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: string;
  currentDay: number;
  status: OnboardingStatus;
  totalDays: number;
};

export type OnboardingHistoryItem = {
  id: string;
  dayId: string;
  dayNumber: number;
  title: string;
  description: string;
  startedAt: string | null;
  completedAt: string | null;
  quizScore: number | null;
  timeSpentSec: number;
};

export type OnboardingMeResponse = {
  assignment: OnboardingAssignment | null;
  currentDay: OnboardingDay | null;
  history: OnboardingHistoryItem[];
};

export type QuizAnswerValue = string | boolean;
export type QuizAnswers = Record<string, QuizAnswerValue>;

export type CompleteDayResponse = {
  score: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    correct: boolean;
    expected: unknown;
    received: unknown;
    explanation: string | null;
  }>;
  nextDay: number | null;
  completed: boolean;
  pointsAwarded: number;
};

export type CompanionDonePayload = {
  messageId: string;
};

export async function fetchOnboarding(): Promise<OnboardingMeResponse> {
  const { data } = await api.get<OnboardingMeResponse>('/me/onboarding');
  return data;
}

export async function fetchOnboardingHistory(): Promise<OnboardingHistoryItem[]> {
  const data = await fetchOnboarding();
  return data.history;
}

export async function startOnboardingDay(dayId: string): Promise<void> {
  await api.post(`/me/onboarding/days/${dayId}/start`);
}

export async function completeOnboardingDay(input: {
  dayId: string;
  quizAnswers: QuizAnswers;
}): Promise<CompleteDayResponse> {
  const { data } = await api.post<CompleteDayResponse>(`/me/onboarding/days/${input.dayId}/complete`, {
    quizAnswers: input.quizAnswers,
  });
  return data;
}

export function streamOnboardingCompanion(
  question: string,
  handlers: SseHandlers<CompanionDonePayload>,
): () => void {
  return streamSse('/me/onboarding/companion/ask', { question }, handlers, isCompanionDonePayload, 'Onboarding stream');
}

function isCompanionDonePayload(value: unknown): value is CompanionDonePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'messageId' in value &&
    typeof (value as { messageId: unknown }).messageId === 'string'
  );
}
