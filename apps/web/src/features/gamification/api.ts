import { api } from '@/lib/api/client';

export type PointsBreakdown = {
  onboarding: number;
  kbQuestions: number;
  simulator: number;
  notes: number;
};

export type PointsResponse = {
  total: number;
  breakdown: PointsBreakdown;
};

export type BadgeCode = 'DAY_5' | 'FIRST_SIM' | 'KNOWLEDGE_CONTRIBUTOR' | 'TOP_SCORER';

export type GamificationBadge = {
  code: BadgeCode;
  label: string;
  earned: boolean;
  earnedAt: string | null;
};

export type BadgesResponse = {
  badges: GamificationBadge[];
};

export type LeaderboardEntry = {
  userId: string;
  fullName: string;
  points: number;
  rank: number;
};

export async function fetchMyPoints(): Promise<PointsResponse> {
  const { data } = await api.get<PointsResponse>('/me/points');
  return data;
}

export async function fetchMyBadges(): Promise<BadgesResponse> {
  const { data } = await api.get<BadgesResponse>('/me/badges');
  return data;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>('/leaderboard');
  return data;
}
