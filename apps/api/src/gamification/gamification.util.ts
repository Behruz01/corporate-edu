export type GamificationPointInput = {
  onboardingDaysCompleted: number;
  kbQuestionsAsked: number;
  completedSimulatorSessions: number;
  simulatorScoreBonus: number;
  knowledgeNotesAuthored: number;
};

export type GamificationPointBreakdown = {
  onboarding: number;
  kbQuestions: number;
  simulator: number;
  notes: number;
};

export type GamificationPoints = {
  total: number;
  breakdown: GamificationPointBreakdown;
};

export type GamificationBadgeCode = 'DAY_5' | 'FIRST_SIM' | 'KNOWLEDGE_CONTRIBUTOR' | 'TOP_SCORER';

export type GamificationBadge = {
  code: GamificationBadgeCode;
  label: string;
  earned: boolean;
  earnedAt: Date | null;
};

export type CompletedSimulatorBadgeInput = {
  endedAt: Date | null;
  overall: number | null;
  scoredAt: Date | null;
};

export type GamificationBadgeInput = {
  onboardingCompletedAt: Date[];
  completedSimulatorSessions: CompletedSimulatorBadgeInput[];
  notesCreatedAt: Date[];
};

const ONBOARDING_DAY_POINTS = 50;
const KB_QUESTION_POINTS = 5;
const SIMULATOR_SESSION_POINTS = 30;
const KNOWLEDGE_NOTE_POINTS = 20;

const BADGE_LABELS: Record<GamificationBadgeCode, string> = {
  DAY_5: '5 kunni yakunladi',
  FIRST_SIM: 'Birinchi simulyator',
  KNOWLEDGE_CONTRIBUTOR: "Bilim ulashuvchi",
  TOP_SCORER: 'Yuqori natija',
};

export function computeGamificationPoints(input: GamificationPointInput): GamificationPoints {
  const breakdown: GamificationPointBreakdown = {
    onboarding: input.onboardingDaysCompleted * ONBOARDING_DAY_POINTS,
    kbQuestions: input.kbQuestionsAsked * KB_QUESTION_POINTS,
    simulator: input.completedSimulatorSessions * SIMULATOR_SESSION_POINTS + input.simulatorScoreBonus,
    notes: input.knowledgeNotesAuthored * KNOWLEDGE_NOTE_POINTS,
  };

  return {
    total: breakdown.onboarding + breakdown.kbQuestions + breakdown.simulator + breakdown.notes,
    breakdown,
  };
}

export function deriveGamificationBadges(input: GamificationBadgeInput): GamificationBadge[] {
  const highScoreSessions = input.completedSimulatorSessions.filter((session) => (session.overall ?? 0) >= 85);

  return [
    buildBadge('DAY_5', input.onboardingCompletedAt.length >= 5, latestDate(input.onboardingCompletedAt)),
    buildBadge(
      'FIRST_SIM',
      input.completedSimulatorSessions.length >= 1,
      latestDate(input.completedSimulatorSessions.map((session) => session.endedAt)),
    ),
    buildBadge('KNOWLEDGE_CONTRIBUTOR', input.notesCreatedAt.length >= 3, latestDate(input.notesCreatedAt)),
    buildBadge(
      'TOP_SCORER',
      highScoreSessions.length >= 1,
      latestDate(highScoreSessions.map((session) => session.scoredAt ?? session.endedAt)),
    ),
  ];
}

function buildBadge(code: GamificationBadgeCode, earned: boolean, earnedAt: Date | null): GamificationBadge {
  return {
    code,
    label: BADGE_LABELS[code],
    earned,
    earnedAt: earned ? earnedAt : null,
  };
}

function latestDate(values: Array<Date | null>): Date | null {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, value) => (value.getTime() > latest.getTime() ? value : latest));
}
